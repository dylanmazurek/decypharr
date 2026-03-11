package store

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/dylanmazurek/decypharr/pkg/debrid/types"

	"github.com/cavaliergopher/grab/v3"
	"github.com/dylanmazurek/decypharr/internal/utils"
)

func grabber(client *grab.Client, url, filename string, byterange *[2]int64, progressCallback func(int64, int64)) error {
	req, err := grab.NewRequest(filename, url)
	if err != nil {
		return err
	}

	// Set byte range if specified
	if byterange != nil {
		byterangeStr := fmt.Sprintf("%d-%d", byterange[0], byterange[1])
		req.HTTPRequest.Header.Set("Range", "bytes="+byterangeStr)
	}

	resp := client.Do(req)

	t := time.NewTicker(time.Second * 2)
	defer t.Stop()

	var lastReported int64
Loop:
	for {
		select {
		case <-t.C:
			current := resp.BytesComplete()
			speed := int64(resp.BytesPerSecond())
			if current != lastReported {
				if progressCallback != nil {
					progressCallback(current-lastReported, speed)
				}
				lastReported = current
			}
		case <-resp.Done:
			break Loop
		}
	}

	// Report final bytes
	if progressCallback != nil {
		progressCallback(resp.BytesComplete()-lastReported, 0)
	}

	return resp.Err()
}

func (s *Store) processDownload(torrent *Torrent, debridTorrent *types.Torrent) (string, error) {
	s.logger.Info().Msgf("Downloading %d files...", len(debridTorrent.Files))
	torrentPath := filepath.Join(torrent.SavePath, utils.RemoveExtension(debridTorrent.OriginalFilename))
	torrentPath = utils.RemoveInvalidChars(torrentPath)

	err := os.MkdirAll(torrentPath, os.ModePerm)
	if err != nil {
		// add the previous error to the error and return
		return "", fmt.Errorf("failed to create directory: %s: %v", torrentPath, err)
	}

	s.downloadFiles(torrent, debridTorrent, torrentPath)
	return torrentPath, nil
}

func (s *Store) downloadFiles(torrent *Torrent, debridTorrent *types.Torrent, parent string) {
	var wg sync.WaitGroup

	totalSize := int64(0)
	for _, file := range debridTorrent.GetFiles() {
		totalSize += file.Size
	}
	debridTorrent.Lock()
	debridTorrent.SizeDownloaded = 0 // Reset downloaded bytes
	debridTorrent.Progress = 0       // Reset progress
	debridTorrent.Unlock()
	progressCallback := func(downloaded int64, speed int64) {
		debridTorrent.Lock()
		defer debridTorrent.Unlock()
		torrent.Lock()
		defer torrent.Unlock()

		// Update total downloaded bytes
		debridTorrent.SizeDownloaded += downloaded
		debridTorrent.Speed = speed

		// Calculate overall progress
		if totalSize > 0 {
			debridTorrent.Progress = float64(debridTorrent.SizeDownloaded) / float64(totalSize) * 100
		}
		s.partialTorrentUpdate(torrent, debridTorrent)
	}

	client := &grab.Client{
		UserAgent: "Decypharr[QBitTorrent]",
		HTTPClient: &http.Client{
			Transport: &http.Transport{
				Proxy: http.ProxyFromEnvironment,
			},
		},
	}

	errChan := make(chan error, len(debridTorrent.Files))
	for _, file := range debridTorrent.GetFiles() {
		if file.DownloadLink == nil {
			s.logger.Info().Msgf("No download link found for %s", file.Name)
			continue
		}
		wg.Add(1)

		s.downloadSemaphore <- struct{}{}
		go func(file types.File) {
			defer wg.Done()
			defer func() { <-s.downloadSemaphore }()
			filename := file.Name

			err := grabber(
				client,
				file.DownloadLink.DownloadLink,
				filepath.Join(parent, filename),
				file.ByteRange,
				progressCallback,
			)

			if err != nil {
				s.logger.Error().Msgf("Failed to download %s: %v", filename, err)
				errChan <- err
			} else {
				s.logger.Info().Msgf("Downloaded %s", filename)
			}
		}(file)
	}

	wg.Wait()

	close(errChan)
	var errors []error
	for err := range errChan {
		if err != nil {
			errors = append(errors, err)
		}
	}
	if len(errors) > 0 {
		s.logger.Error().Msgf("Errors occurred during download: %v", errors)
		return
	}

	s.logger.Info().Msgf("Downloaded all files for %s", debridTorrent.Name)
}
