# Decypharr AI Coding Agent Instructions

## Project Overview
Decypharr is a Go-based QBittorrent API mock that integrates multiple Debrid services (Real-Debrid, Torbox, Debrid-Link, AllDebrid) with Sonarr/Radarr/Lidarr. It provides WebDAV access to debrid content, optional rclone mounting, and automated repair workflows for missing media files.

## Architecture

### Core Components
- **`pkg/qbit/`** - QBittorrent API emulation layer that the *Arr apps communicate with
- **`pkg/debrid/`** - Debrid provider abstraction with provider-specific implementations in `providers/`
- **`pkg/store/`** - Central state management singleton that orchestrates debrid, arr, repair, and rclone services
- **`pkg/webdav/`** - WebDAV server providing filesystem access to debrid content
- **`pkg/rclone/`** - Rclone mount manager for local filesystem integration
- **`pkg/arr/`** - *Arr application integration (Sonarr/Radarr/Lidarr) for imports and cleanup
- **`pkg/repair/`** - Automated repair worker that detects and resubmits missing files

### Data Flow
1. *Arr app sends torrent to QBittorrent API (`pkg/qbit/routes.go`)
2. Store (`pkg/store/store.go`) assigns torrent to a debrid provider based on availability/slots
3. Debrid client (`pkg/debrid/types/client.go` interface) submits magnet to provider
4. Cache (`pkg/debrid/store/cache.go`) syncs torrent state and generates WebDAV XML
5. Rclone mounts WebDAV to local filesystem if enabled
6. *Arr imports completed files from mount/WebDAV
7. Repair worker periodically scans for missing files and resubmits

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

### WebDAV Cache System
- `pkg/debrid/store/cache.go` maintains XML representations of debrid torrents
- Sync worker refreshes every 30s via `cache.Sync()`
- Download links cached with expiry checking in `download_link.go`
- Rclone integration via `cache.refreshRclone()` to update mounts

### Error Handling
- Use `types.Error` for debrid-specific errors with `Code` field
- Check error codes: `TooManyActiveDownloadsError`, `TorrentExpiredError`, etc.
- Retry logic in `internal/request.Client` handles 429/502 status codes
- Repair worker catches missing file errors and queues resubmission

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

### WebDAV Enhancements
- HTTP handlers in `pkg/webdav/handler.go`
- Directory listings use `templates/directory.html` with `funcMap` helpers
- PROPFIND XML generation in `propfind.go`
- File streaming via `pkg/debrid/store/download_link.go` with byte-range support

### Repair Logic Customization
- Job tracking in `pkg/repair/repair.go` - each job has UUID, status, logs
- Strategies: `RepairStrategyPerFile` or `RepairStrategyPerTorrent` (config: `repair.strategy`)
- Worker pool size: `config.Repair.Workers` (default 5)
- Re-insert vs new submission: controlled by `repair.reinsert` flag

## Important Conventions
- **Logging**: Use `logger.New(component)` for component-specific loggers; structured logging with `zerolog`
- **File Paths**: Cross-platform via `filepath.Join()`; mount paths configurable per debrid/global rclone
- **Concurrency**: Use `errgroup` for parallel operations; semaphores for download limiting (`store.downloadSemaphore`)
- **Context**: Always pass `context.Context` to long-running operations; main loop uses signal-based cancellation

## Cross-Platform Considerations
- Umask handling: `cmd/decypharr/umask_unix.go` vs `umask_win.go`
- Rclone process management: `pkg/rclone/killed_unix.go` vs `killed_windows.go`
- Mount requirements: `/dev/fuse` on Linux, WebDAV-only on Windows
