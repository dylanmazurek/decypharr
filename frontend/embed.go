package frontend

import (
	"embed"
	"io/fs"
	"os"
	"path/filepath"
)

//go:embed all:dist
var distFS embed.FS

// FS returns an fs.FS containing the built frontend assets.
// It checks the filesystem first (for local development or container overrides)
// and falls back to the embedded files.
func FS() (fs.FS, error) {
	candidates := []string{
		"frontend/dist",
		"dist",
		filepath.Join("..", "..", "frontend", "dist"),
		filepath.Join("..", "frontend", "dist"),
		"/app/frontend/dist",
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && st.IsDir() {
			if _, err := os.Stat(filepath.Join(c, "index.html")); err == nil {
				return os.DirFS(c), nil
			}
		}
	}
	return fs.Sub(distFS, "dist")
}
