package server

import (
	"fmt"
	"html/template"
	"io"
	"net/http"
	"strings"

	json "github.com/bytedance/sonic"
	"github.com/dylanmazurek/decypharr/frontend"
	"github.com/dylanmazurek/decypharr/internal/config"
	"github.com/dylanmazurek/decypharr/pkg/version"
)

func (s *Server) getFrontendFS() error {
	if s.frontendFS == nil {
		fsys, err := frontend.FS()
		if err != nil {
			return err
		}
		s.frontendFS = fsys
	}
	return nil
}

func (s *Server) serveSPA(w http.ResponseWriter, r *http.Request) {
	if err := s.getFrontendFS(); err != nil {
		http.Error(w, "Frontend not available: "+err.Error(), http.StatusInternalServerError)
		return
	}

	indexFile, err := s.frontendFS.Open("index.html")
	if err != nil {
		http.Error(w, "index.html not found: "+err.Error(), http.StatusNotFound)
		return
	}
	defer indexFile.Close()

	content, err := io.ReadAll(indexFile)
	if err != nil {
		http.Error(w, "Failed to read index.html: "+err.Error(), http.StatusInternalServerError)
		return
	}

	cfg := config.Get()
	auth := cfg.GetAuth()
	tokenOnly := auth != nil && auth.TokenOnly
	needsAuth := cfg.NeedsAuth()

	baseHref := cfg.URLBase
	if baseHref == "" {
		baseHref = "/"
	}
	if !strings.HasSuffix(baseHref, "/") {
		baseHref += "/"
	}

	data := map[string]any{
		"urlBase":    cfg.URLBase,
		"setupError": cfg.SetupError(),
		"tokenOnly":  tokenOnly,
		"needsAuth":  needsAuth,
		"version":    version.Version,
	}
	dataJSON, _ := json.ConfigDefault.Marshal(data)

	inject := fmt.Sprintf(`<base href="%s"><script id="__DECYPHARR_DATA__">window.__DECYPHARR__=%s;window.urlBase=%q;</script>`,
		template.HTMLEscapeString(baseHref),
		string(dataJSON),
		cfg.URLBase,
	)

	htmlStr := string(content)
	if strings.Contains(htmlStr, "<!-- __DECYPHARR_INJECT__ -->") {
		htmlStr = strings.Replace(htmlStr, "<!-- __DECYPHARR_INJECT__ -->", inject, 1)
	} else if strings.Contains(htmlStr, "</head>") {
		htmlStr = strings.Replace(htmlStr, "</head>", inject+"</head>", 1)
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(htmlStr))
}
