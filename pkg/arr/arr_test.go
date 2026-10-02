package arr

import (
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
