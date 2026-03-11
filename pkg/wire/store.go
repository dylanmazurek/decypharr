package wire

import (
	"cmp"
	"context"
	"sync"
	"time"

	"github.com/dylanmazurek/decypharr/internal/config"
	"github.com/dylanmazurek/decypharr/internal/logger"
	"github.com/dylanmazurek/decypharr/pkg/arr"
	"github.com/dylanmazurek/decypharr/pkg/debrid"
	"github.com/go-co-op/gocron/v2"
	"github.com/rs/zerolog"
)

type Store struct {
	arr                *arr.Storage
	debrid             *debrid.Storage
	importsQueue       *ImportQueue // Queued import requests(probably from too_many_active_downloads)
	torrents           *TorrentStorage
	logger             zerolog.Logger
	refreshInterval    time.Duration
	skipPreCache       bool
	downloadSemaphore  chan struct{}
	removeStalledAfter time.Duration // Duration after which stalled torrents are removed
	scheduler          gocron.Scheduler
}

var (
	instance *Store
	once     sync.Once
)

// Get returns the singleton instance
func Get() *Store {
	once.Do(func() {
		cfg := config.Get()
		qbitCfg := cfg.QBitTorrent

		// Create services with dependencies
		arrs := arr.NewStorage()
		deb := debrid.NewStorage()

		scheduler, err := gocron.NewScheduler(gocron.WithLocation(time.Local), gocron.WithGlobalJobOptions(gocron.WithTags("decypharr-store")))
		if err != nil {
			scheduler, _ = gocron.NewScheduler(gocron.WithGlobalJobOptions(gocron.WithTags("decypharr-store")))
		}

		instance = &Store{
			arr:               arrs,
			debrid:            deb,
			torrents:          newTorrentStorage(cfg.TorrentsFile()),
			logger:            logger.Default(), // Use default logger [decypharr]
			refreshInterval:   time.Duration(cmp.Or(qbitCfg.RefreshInterval, 30)) * time.Second,
			skipPreCache:      qbitCfg.SkipPreCache,
			downloadSemaphore: make(chan struct{}, cmp.Or(qbitCfg.MaxDownloads, 5)),
			importsQueue:      NewImportQueue(context.Background(), 1000),
			scheduler:         scheduler,
		}
		if cfg.RemoveStalledAfter != "" {
			removeStalledAfter, err := time.ParseDuration(cfg.RemoveStalledAfter)
			if err == nil {
				instance.removeStalledAfter = removeStalledAfter
			}
		}
	})
	return instance
}

func Reset() {
	if instance != nil {
		if instance.debrid != nil {
			instance.debrid.Reset()
		}

		if instance.importsQueue != nil {
			instance.importsQueue.Close()
		}

		if instance.downloadSemaphore != nil {
			close(instance.downloadSemaphore)
		}

		if instance.scheduler != nil {
			_ = instance.scheduler.StopJobs()
			_ = instance.scheduler.Shutdown()
		}
	}
	once = sync.Once{}
	instance = nil
}

func (s *Store) Arr() *arr.Storage {
	return s.arr
}

func (s *Store) Debrid() *debrid.Storage {
	return s.debrid
}

func (s *Store) Torrents() *TorrentStorage {
	return s.torrents
}

func (s *Store) Scheduler() gocron.Scheduler {
	return s.scheduler
}
