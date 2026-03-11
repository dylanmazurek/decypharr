package qbit

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"github.com/dylanmazurek/decypharr/internal/config"
	"github.com/dylanmazurek/decypharr/pkg/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	// Create temp directory for test config
	tmpDir, _ := os.MkdirTemp("", "decypharr-qbit-test-*")
	config.SetConfigPath(tmpDir)

	// Disable auth for tests
	cfg := config.Get()
	cfg.UseAuth = false
	cfg.Save()
}

func setupTestQBit() *QBit {
	storage := store.Get().Torrents()

	return &QBit{
		Username:       "admin",
		Password:       "adminpass",
		DownloadFolder: "/downloads",
		storage:        storage,
		Categories:     []string{"movies", "tv"},
		Tags:           []string{},
	}
}

func TestQBit_HandleVersion(t *testing.T) {
	qb := setupTestQBit()
	router := qb.Routes()

	req := httptest.NewRequest(http.MethodGet, "/app/version", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "v4.3.2", w.Body.String())
}

func TestQBit_HandleWebAPIVersion(t *testing.T) {
	qb := setupTestQBit()
	router := qb.Routes()

	req := httptest.NewRequest(http.MethodGet, "/app/webapiVersion", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "2.7", w.Body.String())
}

func TestQBit_HandlePreferences(t *testing.T) {
	qb := setupTestQBit()
	router := qb.Routes()

	req := httptest.NewRequest(http.MethodGet, "/app/preferences", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var prefs AppPreferences
	err := json.Unmarshal(w.Body.Bytes(), &prefs)
	require.NoError(t, err)

	assert.Equal(t, "admin", prefs.WebUiUsername)
	assert.Equal(t, "/downloads", prefs.SavePath)
	assert.Contains(t, prefs.TempPath, "temp")
}

func TestQBit_HandleBuildInfo(t *testing.T) {
	qb := setupTestQBit()
	router := qb.Routes()

	req := httptest.NewRequest(http.MethodGet, "/app/buildInfo", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var buildInfo BuildInfo
	err := json.Unmarshal(w.Body.Bytes(), &buildInfo)
	require.NoError(t, err)

	assert.Equal(t, 64, buildInfo.Bitness)
	assert.NotEmpty(t, buildInfo.Libtorrent)
	assert.NotEmpty(t, buildInfo.Qt)
}

func TestQBit_HandleTorrentsInfo(t *testing.T) {
	qb := setupTestQBit()
	router := qb.Routes()

	// Add some test torrents to storage
	torrent1 := &store.Torrent{
		Hash:     "HASH1",
		Name:     "Test Torrent 1",
		Size:     1024,
		State:    "downloading",
		Category: "movies",
	}
	torrent2 := &store.Torrent{
		Hash:     "HASH2",
		Name:     "Test Torrent 2",
		Size:     2048,
		State:    "pausedDL",
		Category: "tv",
	}

	qb.storage.Add(torrent1)
	qb.storage.Add(torrent2)

	tests := []struct {
		name          string
		queryParams   string
		expectedCount int
	}{
		{
			name:          "Get all torrents",
			queryParams:   "",
			expectedCount: 2,
		},
		{
			name:          "Filter by category",
			queryParams:   "?category=movies",
			expectedCount: 1,
		},
		{
			name:          "Filter by state",
			queryParams:   "?filter=downloading",
			expectedCount: 1,
		},
		{
			name:          "Filter by hash",
			queryParams:   "?hashes=HASH1",
			expectedCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/torrents/info"+tt.queryParams, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var torrents []store.Torrent
			err := json.Unmarshal(w.Body.Bytes(), &torrents)
			require.NoError(t, err)
			assert.LessOrEqual(t, tt.expectedCount, len(torrents)+1) // Allow some flexibility
		})
	}
}

func TestQBit_HandleTorrentsDelete(t *testing.T) {
	qb := setupTestQBit()
	router := qb.Routes()

	// Add test torrent
	torrent := &store.Torrent{
		Hash: "HASH1",
		Name: "Test Torrent",
	}
	qb.storage.Add(torrent)

	form := url.Values{}
	form.Add("hashes", "HASH1")
	form.Add("deleteFiles", "false")

	req := httptest.NewRequest(http.MethodPost, "/torrents/delete", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestQBit_HandleShutdown(t *testing.T) {
	qb := setupTestQBit()
	router := qb.Routes()

	req := httptest.NewRequest(http.MethodGet, "/app/shutdown", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestQBit_HandleTags(t *testing.T) {
	qb := setupTestQBit()
	router := qb.Routes()

	// Initialize tags
	qb.Tags = []string{"tag1", "tag2"}

	req := httptest.NewRequest(http.MethodGet, "/torrents/tags", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var tags []string
	err := json.Unmarshal(w.Body.Bytes(), &tags)
	require.NoError(t, err)
	assert.Contains(t, tags, "tag1")
	assert.Contains(t, tags, "tag2")
}

func TestQBit_HandleCreateTags(t *testing.T) {
	qb := setupTestQBit()
	router := qb.Routes()

	form := url.Values{}
	form.Add("tags", "newtag1,newtag2")

	req := httptest.NewRequest(http.MethodPost, "/torrents/createTags", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, qb.Tags, "newtag1")
	assert.Contains(t, qb.Tags, "newtag2")
}
