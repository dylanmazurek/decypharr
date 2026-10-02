package server

import (
	"net/http"

	json "github.com/bytedance/sonic"
	"github.com/dylanmazurek/decypharr/internal/config"
)

func (s *Server) LoginHandler(w http.ResponseWriter, r *http.Request) {
	cfg := config.Get()
	if cfg.NeedsAuth() {
		http.Redirect(w, r, "/register", http.StatusSeeOther)
		return
	}
	auth := cfg.GetAuth()
	tokenOnly := auth != nil && auth.TokenOnly

	if r.Method == http.MethodGet {
		s.serveSPA(w, r)
		return
	}

	var username, password string
	var credentials struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.ConfigDefault.NewDecoder(r.Body).Decode(&credentials); err == nil {
		username = credentials.Username
		password = credentials.Password
	}
	if username == "" {
		username = r.FormValue("username")
		password = r.FormValue("password")
	}

	ok := config.VerifyAuth(username, password)
	if !ok && tokenOnly {
		// Token-only mode has no password, so the API token takes its place.
		// This is the only way into the UI; without it the mode would lock the
		// user out of their own instance.
		ok = config.VerifyToken(password)
		username = "token"
	}
	if !ok {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	session, _ := s.cookie.Get(r, "auth-session")
	session.Values["authenticated"] = true
	session.Values["username"] = username
	if err := session.Save(r, w); err != nil {
		http.Error(w, "Error saving session", http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (s *Server) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := s.cookie.Get(r, "auth-session")
	session.Values["authenticated"] = false
	session.Options.MaxAge = -1
	_ = session.Save(r, w)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

func (s *Server) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	cfg := config.Get()

	// Registration exists only to set the first credential. Once auth is
	// configured — including token-only mode, which never has a password — it
	// must stay closed, or anyone could overwrite the stored credentials.
	if !cfg.NeedsAuth() {
		if r.Method == http.MethodPost {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	if r.Method == http.MethodGet {
		s.serveSPA(w, r)
		return
	}

	username := r.FormValue("username")
	password := r.FormValue("password")
	confirmPassword := r.FormValue("confirmPassword")

	if username == "" {
		var req struct {
			Username        string `json:"username"`
			Password        string `json:"password"`
			ConfirmPassword string `json:"confirmPassword"`
		}
		if err := json.ConfigDefault.NewDecoder(r.Body).Decode(&req); err == nil {
			username = req.Username
			password = req.Password
			confirmPassword = req.ConfirmPassword
		}
	}

	if password != confirmPassword && confirmPassword != "" {
		http.Error(w, "Passwords do not match", http.StatusBadRequest)
		return
	}

	if err := cfg.SetCredentials(username, password); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Create a session
	session, _ := s.cookie.Get(r, "auth-session")
	session.Values["authenticated"] = true
	session.Values["username"] = username
	if err := session.Save(r, w); err != nil {
		http.Error(w, "Error saving session", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (s *Server) IndexHandler(w http.ResponseWriter, r *http.Request) {
	s.serveSPA(w, r)
}

func (s *Server) DownloadHandler(w http.ResponseWriter, r *http.Request) {
	s.serveSPA(w, r)
}

func (s *Server) RepairHandler(w http.ResponseWriter, r *http.Request) {
	s.serveSPA(w, r)
}

func (s *Server) ReacquireHandler(w http.ResponseWriter, r *http.Request) {
	s.serveSPA(w, r)
}

func (s *Server) ConfigHandler(w http.ResponseWriter, r *http.Request) {
	s.serveSPA(w, r)
}

func (s *Server) StatsHandler(w http.ResponseWriter, r *http.Request) {
	s.serveSPA(w, r)
}

func (s *Server) BrowseHandler(w http.ResponseWriter, r *http.Request) {
	s.serveSPA(w, r)
}
