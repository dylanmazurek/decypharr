package store

import (
	"context"

	"github.com/dylanmazurek/decypharr/internal/utils"
	"github.com/go-co-op/gocron/v2"
)

func (c *Cache) StartWorker(ctx context.Context) error {
	// For now, we just want to refresh the listing and download links

	// Stop any existing jobs before starting new ones
	c.scheduler.RemoveByTags("decypharr-%s", c.GetConfig().Name)

	// Schedule download link refresh job
	if jd, err := utils.ConvertToJobDef(c.downloadLinksRefreshInterval); err != nil {
		c.logger.Error().Err(err).Msg("Failed to convert download link refresh interval to job definition")
	} else {
		// Schedule the job
		if _, err := c.scheduler.NewJob(jd, gocron.NewTask(func() {
			c.refreshDownloadLinks(ctx)
		}), gocron.WithContext(ctx)); err != nil {
			c.logger.Error().Err(err).Msg("Failed to create download link refresh job")
		} else {
			c.logger.Debug().Msgf("Download link refresh job scheduled for every %s", c.downloadLinksRefreshInterval)
		}
	}

	// Schedule torrent refresh job
	if jd, err := utils.ConvertToJobDef(c.torrentRefreshInterval); err != nil {
		c.logger.Error().Err(err).Msg("Failed to convert torrent refresh interval to job definition")
	} else {
		// Schedule the job
		if _, err := c.scheduler.NewJob(jd, gocron.NewTask(func() {
			c.refreshTorrents(ctx)
		}), gocron.WithContext(ctx)); err != nil {
			c.logger.Error().Err(err).Msg("Failed to create torrent refresh job")
		} else {
			c.logger.Debug().Msgf("Torrent refresh job scheduled for every %s", c.torrentRefreshInterval)
		}
	}

	// Start the scheduler
	c.scheduler.Start()
	c.cetScheduler.Start()
	return nil
}
