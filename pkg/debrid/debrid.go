package debrid

import (
	"cmp"
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/dylanmazurek/decypharr/internal/config"
	"github.com/dylanmazurek/decypharr/internal/logger"
	"github.com/dylanmazurek/decypharr/internal/request"
	"github.com/dylanmazurek/decypharr/internal/utils"
	"github.com/dylanmazurek/decypharr/pkg/arr"
	"github.com/dylanmazurek/decypharr/pkg/debrid/common"
	"github.com/dylanmazurek/decypharr/pkg/debrid/providers/torbox"
	debridStore "github.com/dylanmazurek/decypharr/pkg/debrid/store"
	"github.com/dylanmazurek/decypharr/pkg/debrid/types"
	"go.uber.org/ratelimit"
)

type Debrid struct {
	cache  *debridStore.Cache // Could be nil if not using WebDAV
	client common.Client      // HTTP client for making requests to the debrid service
}

func (de *Debrid) Client() common.Client {
	return de.client
}

func (de *Debrid) Cache() *debridStore.Cache {
	return de.cache
}

func (de *Debrid) Reset() {
	if de.cache != nil {
		de.cache.Reset()
	}
}

type Storage struct {
	debrids  map[string]*Debrid
	mu       sync.RWMutex
	lastUsed string
}

func NewStorage() *Storage {
	cfg := config.Get()

	_logger := logger.Default()

	debrids := make(map[string]*Debrid)

	for _, dc := range cfg.Debrids {
		client, err := createDebridClient(dc)
		if err != nil {
			_logger.Error().Err(err).Str("Debrid", dc.Name).Msg("failed to connect to debrid client")
			continue
		}

		var (
			cache *debridStore.Cache
		)

		_log := client.Logger()
		_log.Info().Msg("Debrid Service started")

		debrids[dc.Name] = &Debrid{
			cache:  cache,
			client: client,
		}
	}

	d := &Storage{
		debrids:  debrids,
		lastUsed: "",
	}
	return d
}

func (d *Storage) Debrid(name string) *Debrid {
	d.mu.RLock()

	defer d.mu.RUnlock()
	debrid, exists := d.debrids[name]
	if exists {
		return debrid
	}

	return nil
}

func (d *Storage) StartWorker(ctx context.Context) error {
	if ctx == nil {
		ctx = context.Background()
	}

	// Start syncAccounts worker
	go d.syncAccountsWorker(ctx)

	// Start bandwidth reset worker
	go d.checkBandwidthWorker(ctx)

	return nil
}

func (d *Storage) checkBandwidthWorker(ctx context.Context) {
	if ctx == nil {
		ctx = context.Background()
	}
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_ = d.syncAccounts()
			}
		}
	}()

	return nil
}

func (d *Storage) syncAccounts() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	for name, debrid := range d.debrids {
		if debrid == nil || debrid.client == nil {
			continue
		}

		_log := debrid.client.Logger()

		err := debrid.client.SyncAccounts()
		if err != nil {
			_log.Error().Err(err).Msgf("Failed to sync account for %s", name)
			continue
		}
	}

	return nil
}

func (d *Storage) Debrids() map[string]*Debrid {
	d.mu.RLock()
	defer d.mu.RUnlock()

	debridsCopy := make(map[string]*Debrid)
	for name, debrid := range d.debrids {
		if debrid != nil {
			debridsCopy[name] = debrid
		}
	}

	return debridsCopy
}

func (d *Storage) Client(name string) common.Client {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if client, exists := d.debrids[name]; exists {
		return client.client
	}

	return nil
}

func (d *Storage) Reset() {
	d.mu.Lock()
	defer d.mu.Unlock()

	// Reset all debrid clients and caches
	for _, debrid := range d.debrids {
		if debrid != nil {
			debrid.Reset()
		}
	}

	// Reinitialize the debrids map
	d.debrids = make(map[string]*Debrid)
	d.lastUsed = ""
}

func (d *Storage) Clients() map[string]common.Client {
	d.mu.RLock()
	defer d.mu.RUnlock()

	clientsCopy := make(map[string]types.Client)
	for name, debrid := range d.debrids {
		if debrid != nil && debrid.client != nil {
			clientsCopy[name] = debrid.client
		}
	}

	return clientsCopy
}

func (d *Storage) Caches() map[string]*debridStore.Cache {
	d.mu.RLock()
	defer d.mu.RUnlock()

	cachesCopy := make(map[string]*debridStore.Cache)
	for name, debrid := range d.debrids {
		if debrid != nil && debrid.cache != nil {
			cachesCopy[name] = debrid.cache
		}
	}

	return cachesCopy
}

func (d *Storage) FilterClients(filter func(common.Client) bool) map[string]common.Client {
	d.mu.Lock()
	defer d.mu.Unlock()

	filteredClients := make(map[string]types.Client)
	for name, client := range d.debrids {
		if client != nil && filter(client.client) {
			filteredClients[name] = client.client
		}
	}

	return filteredClients
}

func createDebridClient(dc config.Debrid) (common.Client, error) {
	rateLimits := map[string]ratelimit.Limiter{}

	mainRL := request.ParseRateLimit(dc.RateLimit)
	repairRL := request.ParseRateLimit(cmp.Or(dc.RepairRateLimit, dc.RateLimit))
	downloadRL := request.ParseRateLimit(cmp.Or(dc.DownloadRateLimit, dc.RateLimit))

	rateLimits["main"] = mainRL
	rateLimits["repair"] = repairRL
	rateLimits["download"] = downloadRL

	switch dc.Name {
	case "torbox":
		return torbox.New(dc)
	default:
		return nil, fmt.Errorf("unknown debrid client: %s", dc.Name)
	}
}

func Process(ctx context.Context, store *Storage, selectedDebrid string, magnet *utils.Magnet, a *arr.Arr, action string, overrideDownloadUncached bool) (*types.Torrent, error) {
	debridTorrent := &types.Torrent{
		InfoHash: magnet.InfoHash,
		Magnet:   magnet,
		Name:     magnet.Name,
		Arr:      a,
		Size:     magnet.Size,
		Files:    make(map[string]types.File),
	}

	clients := store.FilterClients(func(c common.Client) bool {
		if selectedDebrid != "" && c.Name() != selectedDebrid {
			return false
		}

		return true
	})

	if len(clients) == 0 {
		return nil, fmt.Errorf("no debrid clients available")
	}

	errs := make([]error, 0, len(clients))

	// Override first, arr second, debrid third

	if overrideDownloadUncached {
		debridTorrent.DownloadUncached = true
	} else if a.DownloadUncached != nil {
		// Arr cached is set
		debridTorrent.DownloadUncached = *a.DownloadUncached
	} else {
		debridTorrent.DownloadUncached = false
	}

	for _, db := range clients {
		_logger := db.Logger()
		_logger.Info().
			Str("Debrid", db.Name()).
			Str("Arr", a.Name).
			Str("Hash", debridTorrent.InfoHash).
			Str("Name", debridTorrent.Name).
			Str("Action", action).
			Msg("Processing torrent")

		if !overrideDownloadUncached && a.DownloadUncached == nil {
			debridTorrent.DownloadUncached = db.GetDownloadUncached()
		}

		dbt, err := db.SubmitMagnet(debridTorrent)
		if err != nil || dbt == nil || dbt.Id == "" {
			errs = append(errs, err)
			continue
		}
		dbt.Arr = a

		_logger.Info().Str("id", dbt.Id).Msgf("Torrent: %s submitted to %s", dbt.Name, db.Name())
		store.lastUsed = db.Name()

		torrent, err := db.CheckStatus(dbt)
		if err != nil && torrent != nil && torrent.Id != "" {
			// Delete the torrent if it was not downloaded
			go func(id string) {
				_ = db.DeleteTorrent(id)
			}(torrent.Id)
		}

		if err != nil {
			errs = append(errs, err)
			continue
		}

		if torrent == nil {
			errs = append(errs, fmt.Errorf("torrent %s returned nil after checking status", dbt.Name))
			continue
		}

		return torrent, nil
	}

	if len(errs) == 0 {
		return nil, fmt.Errorf("failed to process torrent: no clients available")
	}

	joinedErrors := errors.Join(errs...)

	return nil, fmt.Errorf("failed to process torrent: %w", joinedErrors)
}
