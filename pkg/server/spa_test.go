package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/dylanmazurek/decypharr/frontend"
	"github.com/dylanmazurek/decypharr/internal/config"
	"github.com/rs/zerolog"
)

func TestServeSPA(t *testing.T) {
	config.Reset()
	config.SetConfigPath(t.TempDir())
	t.Cleanup(config.Reset)

	cfg := config.Get()
	cfg.UseAuth = false
	cfg.DownloadFolder = t.TempDir()
	cfg.Debrids = []config.Debrid{{Name: "realdebrid", APIKey: "key"}}

	fsys, err := frontend.FS()
	if err != nil {
		t.Fatalf("frontend.FS() failed: %v", err)
	}

	s := &Server{
		urlBase:    "/",
		logger:     zerolog.Nop(),
		frontendFS: fsys,
	}

	handler := s.WebRoutes()

	// Test GET /
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("GET / returned status %d, want %d", w.Code, http.StatusOK)
	}
	body := w.Body.String()
	if !strings.Contains(body, `window.__DECYPHARR__=`) {
		t.Errorf("GET / response does not contain window.__DECYPHARR__: %s", body)
	}
	if !strings.Contains(body, `<base href="/"`) {
		t.Errorf("GET / response does not contain <base href=\"/\": %s", body)
	}

	// Test GET /login
	req = httptest.NewRequest(http.MethodGet, "/login", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("GET /login returned status %d, want %d", w.Code, http.StatusOK)
	}

	// Test with custom URL base
	cfg.URLBase = "/subpath/"
	s.urlBase = "/subpath/"
	handler = s.WebRoutes()

	req = httptest.NewRequest(http.MethodGet, "/", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("GET / with URLBase returned status %d, want %d", w.Code, http.StatusOK)
	}
	body = w.Body.String()
	if !strings.Contains(body, `<base href="/subpath/">`) {
		t.Errorf("GET / response does not contain <base href=\"/subpath/\": %s", body)
	}
	if !strings.Contains(body, `urlBase="/subpath/"`) {
		t.Errorf("GET / response does not contain urlBase=\"/subpath/\": %s", body)
	}
}
