package store

import (
	"fmt"

	"github.com/dylanmazurek/decypharr/pkg/debrid/types"
)

func (c *Cache) GetDownloadLink(torrentName, filename, fileLink string) (string, error) {
	// Check link cache
	if dl, err := c.checkDownloadLink(fileLink); dl != "" && err == nil {
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

func (c *Cache) fetchDownloadLink(torrentName, filename, fileLink string) (*types.DownloadLink, error) {
	ct := c.GetTorrentByName(torrentName)
	if ct == nil {
		return nil, fmt.Errorf("torrent not found")
	}
	file, ok := ct.GetFile(filename)
	if !ok {
		return nil, fmt.Errorf("file %s not found in torrent %s", filename, torrentName)
	}

	if file.Link == "" {
		// file link is empty, refresh the torrent to get restricted links
		ct = c.refreshTorrent(file.TorrentId) // Refresh the torrent from the debrid
		if ct == nil {
			return nil, fmt.Errorf("failed to refresh torrent")
		} else {
			file, ok = ct.GetFile(filename)
			if !ok {
				return nil, fmt.Errorf("file %s not found in refreshed torrent %s", filename, torrentName)
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
	if downloadLink == nil {
		return nil, fmt.Errorf("download link is empty")
	}

	// Set link to cache
	go c.client.Accounts().SetDownloadLink(fileLink, downloadLink)
	return downloadLink, nil
}

func (c *Cache) GetFileDownloadLinks(t CachedTorrent) {
	if err := c.client.GetFileDownloadLinks(t.Torrent); err != nil {
		c.logger.Error().Err(err).Str("torrent", t.Name).Msg("Failed to generate download links")
		return
	}
}

func (c *Cache) checkDownloadLink(link string) (string, error) {

	dl, err := c.client.Accounts().GetDownloadLink(link)
	if err != nil {
		return "", err
	}
	if !c.downloadLinkIsInvalid(dl.DownloadLink) {
		return dl.DownloadLink, nil
	}
	return "", fmt.Errorf("download link not found for %s", link)
}

func (c *Cache) MarkDownloadLinkAsInvalid(link, downloadLink, reason string) {
	c.invalidDownloadLinks.Store(downloadLink, reason)
	// Remove the download api key from active
	if reason == "bandwidth_exceeded" {
		// Disable the account
		_, account, err := c.client.Accounts().GetDownloadLinkWithAccount(link)
		if err != nil {
			return
		}
		c.client.Accounts().Disable(account)
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
	return c.client.Accounts().GetLinksCount()
}
