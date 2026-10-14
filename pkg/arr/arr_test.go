package arr

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/dylanmazurek/decypharr/internal/config"
)

func TestSyncFromConfigAppliesValidHost(t *testing.T) {
	config.Reset()
	config.SetConfigPath(t.TempDir())
	t.Cleanup(config.Reset)

	arrs := New()
	arrs.AddOrUpdate(Arr{Name: "whisparr", Host: "http://old.example", Token: "old-token", Source: SourceAuto})
	arrs.SyncFromConfig([]config.Arr{{
		Name:   "whisparr",
		Host:   "http://new.example",
		Token:  "new-token",
		Source: string(SourceAuto),
	}})

	got, ok := arrs.Get("whisparr")
	if !ok || got.Host != "http://new.example" || got.Token != "new-token" {
		t.Fatalf("synced Arr = %#v", got)
	}
}

func TestSyncFromConfigPreservesResolvedHostForInvalidUpdate(t *testing.T) {
	config.Reset()
	config.SetConfigPath(t.TempDir())
	t.Cleanup(config.Reset)

	arrs := New()
	arrs.AddOrUpdate(Arr{Name: "whisparr", Host: "http://resolved.example", Token: "old-token", Source: SourceAuto})
	arrs.SyncFromConfig([]config.Arr{{
		Name:   "whisparr",
		Host:   "not-a-url",
		Token:  "new-token",
		Source: string(SourceAuto),
	}})

	got, ok := arrs.Get("whisparr")
	if !ok || got.Host != "http://resolved.example" || got.Token != "new-token" {
		t.Fatalf("synced Arr = %#v", got)
	}
}

func TestSyncFromConfigRemovesOmittedInstances(t *testing.T) {
	config.Reset()
	config.SetConfigPath(t.TempDir())
	t.Cleanup(config.Reset)

	arrs := New()
	arrs.AddOrUpdate(Arr{Name: "old-radarr", Host: "http://radarr.example:7878", Token: "token1", Source: SourceManual})
	arrs.AddOrUpdate(Arr{Name: "sonarr", Host: "http://sonarr.example:8989", Token: "token2", Source: SourceManual})

	// Renaming old-radarr to new-radarr in config should not preserve old-radarr
	arrs.SyncFromConfig([]config.Arr{
		{Name: "new-radarr", Host: "http://radarr.example:7878", Token: "token1"},
		{Name: "sonarr", Host: "http://sonarr.example:8989", Token: "token2"},
	})

	if _, ok := arrs.Get("old-radarr"); ok {
		t.Fatal("expected old-radarr to be removed after rename, but it was preserved")
	}
	if _, ok := arrs.Get("new-radarr"); !ok {
		t.Fatal("expected new-radarr to be present")
	}
	all := arrs.All()
	if len(all) != 2 {
		t.Fatalf("expected 2 instances, got %d: %#v", len(all), all)
	}
}


func TestArrInstanceFingerprintCanonicalizesHost(t *testing.T) {
	first := Arr{Type: Sonarr, Host: "HTTP://Example.COM:80/sonarr/", Token: "first"}.Fingerprint()
	second := Arr{Type: Sonarr, Host: "http://example.com/sonarr", Token: "second"}.Fingerprint()
	if first == "" || first != second {
		t.Fatalf("equivalent Arr hosts produced fingerprints %q and %q", first, second)
	}

	differentPath := Arr{Type: Sonarr, Host: "http://example.com/other"}.Fingerprint()
	differentType := Arr{Type: Radarr, Host: "http://example.com/sonarr"}.Fingerprint()
	if first == differentPath || first == differentType {
		t.Fatal("different Arr instances produced the same fingerprint")
	}
}

func TestBlocklistAndRedownload(t *testing.T) {
	var queueCalled, deleteCalled bool
	var querySent string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && strings.Contains(r.URL.Path, "api/v3/queue"):
			queueCalled = true
			resp := QueueResponseScheme{
				TotalRecords: 1,
				Records: []QueueSchema{
					{
						Id:         42,
						DownloadId: "AABBCCDD11223344",
						Status:     "downloading",
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(resp)
		case r.Method == http.MethodDelete && strings.Contains(r.URL.Path, "api/v3/queue/bulk"):
			deleteCalled = true
			querySent = r.URL.RawQuery
			var payload struct {
				Ids []int `json:"ids"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode payload: %v", err)
			}
			if len(payload.Ids) != 1 || payload.Ids[0] != 42 {
				t.Fatalf("unexpected ids: %v", payload.Ids)
			}
			w.WriteHeader(http.StatusOK)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	arrs := New()
	arrs.AddOrUpdate(Arr{
		Name:   "sonarr",
		Host:   server.URL,
		Token:  "test-token",
		Source: SourceManual,
	})

	err := arrs.BlocklistAndRedownload(context.Background(), "sonarr", "aabbccdd11223344")
	if err != nil {
		t.Fatalf("BlocklistAndRedownload failed: %v", err)
	}
	if !queueCalled {
		t.Fatal("expected queue to be called")
	}
	if !deleteCalled {
		t.Fatal("expected delete bulk to be called")
	}
	if !strings.Contains(querySent, "skipRedownload=false") {
		t.Fatalf("expected skipRedownload=false, got %s", querySent)
	}
	if !strings.Contains(querySent, "blocklist=true") {
		t.Fatalf("expected blocklist=true, got %s", querySent)
	}
	if !strings.Contains(querySent, "removeFromClient=true") {
		t.Fatalf("expected removeFromClient=true, got %s", querySent)
	}
}

