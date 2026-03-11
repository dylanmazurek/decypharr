package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type TorboxMock struct {
	mu       sync.Mutex
	Torrents map[string]*Torrent
	Files    map[string][]byte
}

type Torrent struct {
	Id               int       `json:"id"`
	Hash             string    `json:"hash"`
	Name             string    `json:"name"`
	Size             int64     `json:"size"`
	Progress         float64   `json:"progress"`
	DownloadState    string    `json:"download_state"`
	DownloadFinished bool      `json:"download_finished"`
	Files            []File    `json:"files"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
	DownloadSpeed    int64     `json:"download_speed"`
	Seeds            int       `json:"seeds"`
}

type File struct {
	Id           int    `json:"id"`
	Md5          string `json:"md5"`
	Hash         string `json:"hash"`
	Name         string `json:"name"`
	Size         int64  `json:"size"`
	MimeType     string `json:"mimetype"`
	ShortName    string `json:"short_name"`
	AbsolutePath string `json:"absolute_path"`
}

type Response struct {
	Success bool        `json:"success"`
	Error   interface{} `json:"error"`
	Detail  string      `json:"detail"`
	Data    interface{} `json:"data"`
}

func main() {
	mock := &TorboxMock{
		Torrents: make(map[string]*Torrent),
		Files:    make(map[string][]byte),
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/api/torrents/checkcached", mock.checkCached)
	r.Post("/api/torrents/createtorrent", mock.createTorrent)
	r.Get("/api/torrents/mylist", mock.myList)
	r.Get("/api/torrents/mylist/", mock.myList)
	r.Post("/api/torrents/controltorrent", mock.controlTorrent)
	r.Get("/api/torrents/requestdl/", mock.requestDL) // Note trailing slash
	r.Get("/downloads/{id}", mock.downloadFile)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting mock Torbox server on :%s", port)
	http.ListenAndServe(":"+port, r)
}

func (m *TorboxMock) checkCached(w http.ResponseWriter, r *http.Request) {
	hashes := r.URL.Query().Get("hash")
	hashList := strings.Split(hashes, ",")

	result := make(map[string]interface{})
	for _, h := range hashList {
		// Mock: all hashes starting with "CACHED" are cached
		if strings.HasPrefix(strings.ToUpper(h), "CACHED") || true { // Always cached for easy testing?
			// Let's make everything cached for simplicity unless it starts with UNCACHED
			if strings.HasPrefix(strings.ToUpper(h), "UNCACHED") {
				continue
			}

			result[h] = struct {
				Name string `json:"name"`
				Size int64  `json:"size"`
				Hash string `json:"hash"`
			}{
				Name: "Test Torrent " + h,
				Size: 1024 * 1024 * 100, // 100MB
				Hash: h,
			}
		}
	}

	json.NewEncoder(w).Encode(Response{
		Success: true,
		Data:    result,
	})
}

func (m *TorboxMock) createTorrent(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(32 << 20)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	magnet := r.FormValue("magnet")
	// Parse magnet for hash/name
	// simple extraction
	hash := "UNKNOWN"
	name := "Unknown Torrent"

	if strings.Contains(magnet, "xt=urn:btih:") {
		parts := strings.Split(magnet, "xt=urn:btih:")
		if len(parts) > 1 {
			hash = strings.Split(parts[1], "&")[0]
		}
	}
	if strings.Contains(magnet, "dn=") {
		parts := strings.Split(magnet, "dn=")
		if len(parts) > 1 {
			name = strings.Split(parts[1], "&")[0]
			name, _ = filepath.Abs(name) // unescape? nah
			name = strings.ReplaceAll(name, "+", " ")
		}
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	id := rand.Intn(100000)
	idStr := strconv.Itoa(id)

	// Create dummy files
	files := []File{
		{
			Id:           1,
			Name:         "video.mp4",
			Size:         1024 * 1024 * 50,
			AbsolutePath: "/downloads/" + name + "/video.mp4",
		},
		{
			Id:           2,
			Name:         "subs.srt",
			Size:         1024,
			AbsolutePath: "/downloads/" + name + "/subs.srt",
		},
	}

	m.Torrents[idStr] = &Torrent{
		Id:               id,
		Hash:             hash,
		Name:             name,
		Size:             1024 * 1024 * 100,
		Progress:         1.0,
		DownloadState:    "cached",
		DownloadFinished: true,
		Files:            files,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
		DownloadSpeed:    1000000,
		Seeds:            10,
	}

	json.NewEncoder(w).Encode(Response{
		Success: true,
		Data: struct {
			Id   int    `json:"torrent_id"`
			Hash string `json:"hash"`
			Name string `json:"name"`
		}{
			Id:   id,
			Hash: hash,
			Name: name,
		},
	})
}

func (m *TorboxMock) myList(w http.ResponseWriter, r *http.Request) {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := r.URL.Query().Get("id")
	if id != "" {
		t, ok := m.Torrents[id]
		if !ok {
			json.NewEncoder(w).Encode(Response{Success: false, Error: "Torrent not found"})
			return
		}
		json.NewEncoder(w).Encode(Response{Success: true, Data: t})
		return
	}

	list := make([]*Torrent, 0, len(m.Torrents))
	for _, t := range m.Torrents {
		list = append(list, t)
	}

	json.NewEncoder(w).Encode(Response{Success: true, Data: list})
}

func (m *TorboxMock) controlTorrent(w http.ResponseWriter, r *http.Request) {
	var body struct {
		TorrentId string `json:"torrent_id"`
		Operation string `json:"operation"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	m.mu.Lock()
	defer m.mu.Unlock()

	if body.Operation == "delete" {
		delete(m.Torrents, body.TorrentId)
		json.NewEncoder(w).Encode(Response{Success: true, Data: "Deleted"})
	} else {
		json.NewEncoder(w).Encode(Response{Success: false, Error: "Unknown operation"})
	}
}

func (m *TorboxMock) requestDL(w http.ResponseWriter, r *http.Request) {
	// ?torrent_id=...&file_id=...&token=...
	// Returns a link
	// Data: "link"

	// We return a link to our own /downloads/{id} endpoint

	// Generate a pseudo-random link
	id := r.URL.Query().Get("file_id")

	// Assuming host is reachable from outside or inside docker
	// In docker compose, 'mock-torbox:8080'
	// But the client (Decypharr) needs to resolve it.
	// If Decypharr is in the same network, 'http://mock-torbox:8080/downloads/' + id

	dlLink := fmt.Sprintf("http://mock-torbox:8080/downloads/%s", id)

	json.NewEncoder(w).Encode(Response{
		Success: true,
		Data:    dlLink,
	})
}

func (m *TorboxMock) downloadFile(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Generate dummy content
	size := 1024 * 1024 // 1MB dummy

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"file-%s.bin\"", id))
	w.Header().Set("Content-Length", strconv.Itoa(size))

	// Write dummy zeros
	// Or pattern
	data := make([]byte, 1024)
	for i := 0; i < 1024; i++ {
		w.Write(data)
	}
}
