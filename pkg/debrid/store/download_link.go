package store

import (
	"fmt"

	"github.com/dylanmazurek/decypharr/internal/utils"
	"github.com/dylanmazurek/decypharr/pkg/debrid/types"
)

func (c *Cache) GetDownloadLink(torrentName, filename, fileLink string) (string, error) {
	// Check link cache
	if dl, err := c.checkDownloadLink(fileLink); err == nil && !dl.Empty() {
		return dl, nil
	}

	dl, err := c.fetchDownloadLink(torrentName, filename, fileLink)
	if err != nil {
		return "", err
	}

	if dl == nil || dl.DownloadLink == "" {
		return "", fmt.Errorf("download link is empty for %s in torrent %s", filename, torrentName)
	}
	return dl.DownloadLink, err
}

func (c *Cache) fetchDownloadLink(torrentName, filename, fileLink string) (types.DownloadLink, error) {
	emptyDownloadLink := types.DownloadLink{}
	ct := c.GetTorrentByName(torrentName)
	if ct == nil {
		return emptyDownloadLink, fmt.Errorf("torrent not found")
	}
	file, ok := ct.GetFile(filename)
	if !ok {
		return emptyDownloadLink, fmt.Errorf("file %s not found in torrent %s", filename, torrentName)
	}

	if file.Link == "" {
		// file link is empty, refresh the torrent to get restricted links
		ct = c.refreshTorrent(file.TorrentId) // Refresh the torrent from the debrid
		if ct == nil {
			return emptyDownloadLink, fmt.Errorf("failed to refresh torrent")
		} else {
			file, ok = ct.GetFile(filename)
			if !ok {
				return emptyDownloadLink, fmt.Errorf("file %s not found in refreshed torrent %s", filename, torrentName)
			}
		}
	}

	// If file.Link is still empty, return
	if file.Link == "" {
		return nil, fmt.Errorf("file %s has no download link", filename)
	}

	c.logger.Trace().Msgf("Getting download link for %s(%s)", filename, file.Link)
	downloadLink, err := c.client.GetDownloadLink(ct.Torrent, &file)
	if err != nil {
		return nil, fmt.Errorf("failed to get download link: %w", err)
	}
	if downloadLink.Empty() {
		return emptyDownloadLink, fmt.Errorf("download link is empty")
	}
	return downloadLink, nil
}

func (c *Cache) GetFileDownloadLinks(t CachedTorrent) {
	if err := c.client.GetFileDownloadLinks(t.Torrent); err != nil {
		c.logger.Error().Err(err).Str("torrent", t.Name).Msg("Failed to generate download links")
		return
	}
}

func (c *Cache) checkDownloadLink(link string) (types.DownloadLink, error) {
	dl, err := c.client.AccountManager().GetDownloadLink(link)
	if err != nil {
		return dl, err
	}
	if !c.downloadLinkIsInvalid(dl.DownloadLink) {
		return dl, nil
	}
	return types.DownloadLink{}, fmt.Errorf("download link not found for %s", link)
}

func (c *Cache) MarkDownloadLinkAsInvalid(downloadLink types.DownloadLink, reason string) {
	c.invalidDownloadLinks.Store(downloadLink.DownloadLink, reason)
	// Remove the download api key from active
	if reason == "bandwidth_exceeded" {
		// Disable the account
		accountManager := c.client.AccountManager()
		account, err := accountManager.GetAccount(downloadLink.Token)
		if err != nil {
			c.logger.Error().Err(err).Str("token", utils.Mask(downloadLink.Token)).Msg("Failed to get account to disable")
			return
		}
		if account == nil {
			c.logger.Error().Str("token", utils.Mask(downloadLink.Token)).Msg("Account not found to disable")
			return
		}
		accountManager.Disable(account)
	}
}

func (c *Cache) downloadLinkIsInvalid(downloadLink string) bool {
	if reason, ok := c.invalidDownloadLinks.Load(downloadLink); ok {
		c.logger.Debug().Msgf("Download link %s is invalid: %s", downloadLink, reason)
		return true
	}
	return false
}

func (c *Cache) GetDownloadByteRange(torrentName, filename string) (*[2]int64, error) {
	ct := c.GetTorrentByName(torrentName)
	if ct == nil {
		return nil, fmt.Errorf("torrent not found")
	}
	file := ct.Files[filename]
	return file.ByteRange, nil
}

func (c *Cache) GetTotalActiveDownloadLinks() int {
	total := 0
	allAccounts := c.client.AccountManager().Active()
	for _, acc := range allAccounts {
		total += acc.DownloadLinksCount()
	}
	return total
}
