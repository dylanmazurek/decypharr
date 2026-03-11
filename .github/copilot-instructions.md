# Decypharr AI Coding Agent Instructions

## Project Overview
Decypharr is a Go-based QBittorrent API mock that integrates Debrid services currently Torbox with Sonarr/Radarr.

The main feature of this branch of Decypharr is to:
- Emulate QBittorrent API for *Arr apps to submit torrents
- Expose torrent services to Sonarr and Radarr, including:
  - Adding torrents via magnet links
  - Tracking download progress and status
  - Removing torrents on completion

## Branch Changes

This branch removes support for multiple debrid providers and focuses solely on Torbox integration. Key changes include:
- Removal of all debrid providers except Torbox
- Remove WebDAV support; files are accessed via download links provided by Torbox
- Remove rclone integration
- Remoce repair worker functionality

## Architecture

### Core Components
- **`pkg/qbit/`** - QBittorrent API emulation layer that the *Arr apps communicate with
- **`pkg/debrid/`** - Debrid provider abstraction with provider-specific implementations in `providers/`
- **`pkg/store/`** - Central state management singleton that orchestrates debrid, arr services
- **`pkg/arr/`** - *Arr application integration (Sonarr/Radarr/Lidarr) for imports and cleanup

### Data Flow
1. *Arr app sends torrent to QBittorrent API (`pkg/qbit/routes.go`)
2. Store (`pkg/store/store.go`) assigns torrent to a debrid provider based on availability/slots
3. Debrid client (`pkg/debrid/types/client.go` interface) submits magnet to provider
4. Cache (`pkg/debrid/store/cache.go`) syncs torrent state

### Configuration System
- Singleton pattern via `config.Get()` in `internal/config/config.go`
- Set config path with `config.SetConfigPath(path)` before first `Get()` call
- Config persists to `config.json` in the configured path (default `/data`)
- Hot-reload triggers via `web.SetRestartFunc()` - main loop restarts all services

## Key Patterns

### Singleton Services
All major services use singleton pattern with `sync.Once`:
```go
var (
    instance *Store
    once     sync.Once
)

func Get() *Store {
    once.Do(func() {
        instance = &Store{...}
    })
    return instance
}
```
Always use `Get()` instead of constructors. Reset with service-specific `Reset()` methods.

### Debrid Provider Implementation
Implement `types.Client` interface in `pkg/debrid/types/client.go`. Each provider lives in `pkg/debrid/providers/<name>/`:
- Use `internal/request.Client` for HTTP with rate limiting and retries
- Account rotation via `types.Accounts` - rotates through `DownloadAPIKeys` for download operations
- Return `types.Torrent` with standardized fields across providers

### Error Handling
- Use `types.Error` for debrid-specific errors with `Code` field
- Check error codes: `TooManyActiveDownloadsError`, `TorrentExpiredError`, etc.
- Retry logic in `internal/request.Client` handles 429/502 status codes
- Repair worker catches missing file errors and queues resubmission

### Go Code Style
- Follow standard Go conventions (gofmt, godoc)
- Use `zerolog` for structured logging
- Context propagation with `context.Context` for cancellations and timeouts
- Prefered conventions:
  - Leave a space after if, for, switch statements
  - Add space before return statements
- Patterns:
```go
// Don't use this pattern
	if a, ok := x; ok {
		return a
	}

// Use this pattern
  a, ok := x
  if ok {
    return a
  }
```

## Development Workflow

### Testing
- Run provider tests: `go test ./pkg/debrid/providers/...`
- Use `data/` folder for local config during development
- Healthcheck binary: `cmd/healthcheck/main.go` - HTTP GET to `/health`

### Docker Build
```bash
docker build --build-arg VERSION=x.y.z --build-arg CHANNEL=dev -t decypharr .
```
Multi-stage build with Go 1.24+ alpine base. Includes rclone installation in final stage.

## Common Tasks

### Adding a New Debrid Provider
1. Create `pkg/debrid/providers/<name>/<name>.go`
2. Implement all `types.Client` interface methods
3. Add constructor in `pkg/debrid/debrid.go` `createDebridClient()`
4. Handle provider-specific error codes in your client
5. Add types to `providers/<name>/types.go` if needed

### Modifying Torrent State
- Access via `store.Get().Torrents()` (type: `*TorrentStorage`)
- CRUD operations: `Add()`, `Update()`, `GetByHash()`, `Remove()`
- Persistence to `torrents.json` is automatic on changes
- Thread-safe with internal `sync.RWMutex`

## Important Conventions
- **Logging**: Use `logger.New(component)` for component-specific loggers; structured logging with `zerolog`
- **Concurrency**: Use `errgroup` for parallel operations; semaphores for download limiting (`store.downloadSemaphore`)
- **Context**: Always pass `context.Context` to long-running operations; main loop uses signal-based cancellation