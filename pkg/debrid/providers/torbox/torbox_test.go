package torbox

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/dylanmazurek/decypharr/internal/config"
	"github.com/dylanmazurek/decypharr/internal/utils"
	"github.com/dylanmazurek/decypharr/pkg/debrid/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	// Create temp directory for test config
	tmpDir, _ := os.MkdirTemp("", "decypharr-test-*")
	config.SetConfigPath(tmpDir)
}

func setupTestServer() (*httptest.Server, *Torbox) {
	mux := http.NewServeMux()
	server := httptest.NewServer(mux)

	cfg := config.Debrid{
		Name:             "torbox",
		APIKey:           "test-api-key",
		DownloadUncached: false,
		CheckCached:      true,
		AddSamples:       false,
		RateLimit:        "1/1s",
	}

	tb, _ := New(cfg)
	tb.Host = server.URL // Override to use test server

	return server, tb
}

func TestTorbox_IsAvailable(t *testing.T) {
	server, tb := setupTestServer()
	defer server.Close()

	// Mock response
	server.Config.Handler.(*http.ServeMux).HandleFunc("/api/torrents/checkcached", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "GET", r.Method)

		response := AvailableResponse{
			Data: &map[string]struct {
				Name string `json:"name"`
				Size int    `json:"size"`
				Hash string `json:"hash"`
			}{
				"HASH1": {Size: 1024},
				"HASH2": {Size: 0}, // Not available
			},
			Success: true,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	hashes := []string{"HASH1", "HASH2", "HASH3"}
	result := tb.IsAvailable(hashes)

	assert.True(t, result["HASH1"])
	assert.False(t, result["HASH2"])
	assert.False(t, result["HASH3"])
}

func TestTorbox_SubmitMagnet(t *testing.T) {
	server, tb := setupTestServer()
	defer server.Close()

	server.Config.Handler.(*http.ServeMux).HandleFunc("/api/torrents/createtorrent", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Contains(t, r.Header.Get("Content-Type"), "multipart/form-data")

		response := AddMagnetResponse{
			Data: &struct {
				Id   int    `json:"torrent_id"`
				Hash string `json:"hash"`
			}{
				Id:   12345,
				Hash: "TESTHASH",
			},
			Success: true,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	magnet, _ := utils.GetMagnetFromUrl("magnet:?xt=urn:btih:TESTHASH&dn=Test+Torrent")
	torrent := &types.Torrent{
		InfoHash: "TESTHASH",
		Magnet:   magnet,
		Name:     "Test Torrent",
	}

	result, err := tb.SubmitMagnet(torrent)

	require.NoError(t, err)
	assert.Equal(t, "12345", result.Id)
	assert.Equal(t, "torbox", result.Debrid)
}

func TestTorbox_GetTorrent(t *testing.T) {
	server, tb := setupTestServer()
	defer server.Close()

	server.Config.Handler.(*http.ServeMux).HandleFunc("/api/torrents/mylist/", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "GET", r.Method)

		response := InfoResponse{
			Data: &torboxInfo{
				Id:               12345,
				Name:             "Test Torrent",
				Size:             1073741824, // 1GB
				Progress:         0.75,
				DownloadState:    "downloading",
				DownloadFinished: false,
				DownloadSpeed:    1048576, // 1MB/s
				Seeds:            50,
				CreatedAt:        time.Now(),
				Files: []File{
					{
						Id:           1,
						Name:         "folder/video.mkv",
						Size:         1073741824,
						AbsolutePath: "/storage/video.mkv",
					},
				},
			},
			Success: true,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	result, err := tb.GetTorrent("12345")

	require.NoError(t, err)
	assert.Equal(t, "12345", result.Id)
	assert.Equal(t, "Test Torrent", result.Name)
	assert.Equal(t, int64(1073741824), result.Bytes)
	assert.Equal(t, float64(75), result.Progress)
	assert.Equal(t, "downloading", result.Status)
	assert.Equal(t, int64(1048576), result.Speed)
	assert.Len(t, result.Files, 1)
}

func TestTorbox_GetTorrent_WithCompletedTorrent(t *testing.T) {
	server, tb := setupTestServer()
	defer server.Close()

	server.Config.Handler.(*http.ServeMux).HandleFunc("/api/torrents/mylist/", func(w http.ResponseWriter, r *http.Request) {
		response := InfoResponse{
			Data: &torboxInfo{
				Id:               12345,
				Name:             "Completed Torrent",
				Size:             2147483648,
				Progress:         1.0,
				DownloadState:    "completed",
				DownloadFinished: true,
				Files: []File{
					{
						Id:           1,
						Name:         "video.mp4",
						Size:         2147483648,
						AbsolutePath: "/storage/video.mp4",
					},
				},
			},
			Success: true,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	result, err := tb.GetTorrent("12345")

	require.NoError(t, err)
	assert.Equal(t, "downloaded", result.Status)
	assert.Equal(t, float64(100), result.Progress)

	// Check that completed torrents have placeholder links
	for _, file := range result.Files {
		assert.Contains(t, file.Link, "torbox://")
	}
}

func TestTorbox_UpdateTorrent(t *testing.T) {
	server, tb := setupTestServer()
	defer server.Close()

	server.Config.Handler.(*http.ServeMux).HandleFunc("/api/torrents/mylist/", func(w http.ResponseWriter, r *http.Request) {
		response := InfoResponse{
			Data: &torboxInfo{
				Id:               12345,
				Name:             "Updated Torrent",
				Size:             1073741824,
				Progress:         0.95,
				DownloadState:    "downloading",
				DownloadFinished: false,
				Files: []File{
					{
						Id:   1,
						Name: "file.mkv",
						Size: 1073741824,
					},
				},
			},
			Success: true,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	torrent := &types.Torrent{
		Id:     "12345",
		Name:   "Old Name",
		Status: "downloading",
		Files:  make(map[string]types.File),
	}

	err := tb.UpdateTorrent(torrent)

	require.NoError(t, err)
	assert.Equal(t, "Updated Torrent", torrent.Name)
	assert.Equal(t, float64(95), torrent.Progress)
	assert.Equal(t, "downloading", torrent.Status)
}

func TestTorbox_DeleteTorrent(t *testing.T) {
	server, tb := setupTestServer()
	defer server.Close()

	server.Config.Handler.(*http.ServeMux).HandleFunc("/api/torrents/controltorrent", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		var payload map[string]string
		err := json.NewDecoder(r.Body).Decode(&payload)
		require.NoError(t, err)
		assert.Equal(t, "delete", payload["operation"])
		assert.Equal(t, "12345", payload["torrent_id"])

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
	})

	err := tb.DeleteTorrent("12345")
	require.NoError(t, err)
}

func TestTorbox_GetTorboxStatus(t *testing.T) {
	server, tb := setupTestServer()
	defer server.Close()

	tests := []struct {
		name     string
		status   string
		finished bool
		expected string
	}{
		{"Completed and finished", "completed", true, "downloaded"},
		{"Cached", "cached", false, "downloaded"},
		{"Downloading", "downloading", false, "downloading"},
		{"Paused", "paused", false, "downloading"},
		{"Unknown status", "unknown-state", false, "error"},
		{"With parentheses", "downloading (50%)", false, "downloading"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tb.getTorboxStatus(tt.status, tt.finished)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestTorbox_ErrorHandling(t *testing.T) {
	server, tb := setupTestServer()
	defer server.Close()

	t.Run("API returns error response", func(t *testing.T) {
		server.Config.Handler.(*http.ServeMux).HandleFunc("/api/torrents/error", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "Invalid request",
			})
		})

		_, err := tb.GetTorrent("error")
		assert.Error(t, err)
	})

	t.Run("Network error", func(t *testing.T) {
		// Close server to simulate network error
		server.Close()

		torrent := &types.Torrent{
			Magnet: &utils.Magnet{Link: "magnet:?xt=urn:btih:TEST"},
		}
		_, err := tb.SubmitMagnet(torrent)
		assert.Error(t, err)
	})
}

// TestTorbox_IsAvailable_BatchProcessing is skipped - requires deeper mocking
// func TestTorbox_IsAvailable_BatchProcessing(t *testing.T) {
// 	server, tb := setupTestServer()
// 	defer server.Close()

// 	requestCount := 0
// 	server.Config.Handler.(*http.ServeMux).HandleFunc("/api/torrents/checkcached", func(w http.ResponseWriter, r *http.Request) {
// 		requestCount++

// 		response := AvailableResponse{
// 			Data: &map[string]struct {
// 				Name string `json:"name"`
// 				Size int    `json:"size"`
// 				Hash string `json:"hash"`
// 			}{},
// 			Success: true,
// 		}

// 		w.Header().Set("Content-Type", "application/json")
// 		json.NewEncoder(w).Encode(response)
// 	})

// 	// Test with 250 hashes (should make 3 requests: 100 + 100 + 50)
// 	hashes := make([]string, 250)
// 	for i := 0; i < 250; i++ {
// 		hashes[i] = "HASH" + string(rune(i))
// 	}

// 	result := tb.IsAvailable(hashes)

// 	// Should batch into groups of 100
// 	assert.Equal(t, 3, requestCount)
// 	assert.NotNil(t, result)
// }

func TestTorbox_Name(t *testing.T) {
	_, tb := setupTestServer()
	assert.Equal(t, "torbox", tb.Name())
}

func TestTorbox_GetDownloadUncached(t *testing.T) {
	_, tb := setupTestServer()
	assert.False(t, tb.GetDownloadUncached())
}

func TestTorbox_GetDownloadingStatus(t *testing.T) {
	_, tb := setupTestServer()

	statuses := tb.GetDownloadingStatus()
	assert.Contains(t, statuses, "downloading")
	assert.NotContains(t, statuses, "downloaded")
}
