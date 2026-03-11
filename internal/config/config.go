package config

import (
	"cmp"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

var (
	instance   *Config
	once       sync.Once
	configPath string
)

type Debrid struct {
	Name              string   `json:"name,omitempty"`
	APIKey            string   `json:"api_key,omitempty"`
	HostURL           string   `json:"host_url,omitempty"`
	DownloadAPIKeys   []string `json:"download_api_keys,omitempty"`
	DownloadUncached  bool     `json:"download_uncached,omitempty"`
	CheckCached       bool     `json:"check_cached,omitempty"`
	RateLimit         string   `json:"rate_limit,omitempty"` // 200/minute or 10/second
	DownloadRateLimit string   `json:"download_rate_limit,omitempty"`
	Proxy             string   `json:"proxy,omitempty"`
	UnpackRar         bool     `json:"unpack_rar,omitempty"`
	AddSamples        bool     `json:"add_samples,omitempty"`
	MinimumFreeSlot   int      `json:"minimum_free_slot,omitempty"` // Minimum active pots to use this debrid
	Limit             int      `json:"limit,omitempty"`             // Maximum number of total torrents
}

type QBitTorrent struct {
	Username        string   `json:"username,omitempty"`
	Password        string   `json:"password,omitempty"`
	Port            string   `json:"port,omitempty"` // deprecated
	DownloadFolder  string   `json:"download_folder,omitempty"`
	Categories      []string `json:"categories,omitempty"`
	RefreshInterval int      `json:"refresh_interval,omitempty"`
	SkipPreCache    bool     `json:"skip_pre_cache,omitempty"`
	MaxDownloads    int      `json:"max_downloads,omitempty"`
}

type Arr struct {
	Name             string `json:"name,omitempty"`
	Host             string `json:"host,omitempty"`
	Token            string `json:"token,omitempty"`
	Cleanup          bool   `json:"cleanup,omitempty"`
	DownloadUncached *bool  `json:"download_uncached,omitempty"`
	SelectedDebrid   string `json:"selected_debrid,omitempty"`
	Source           string `json:"source,omitempty"` // The source of the arr, e.g. "auto", "config", "". Auto means it was automatically detected from the arr
}

type Auth struct {
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	APIToken string `json:"api_token,omitempty"`
}

type Config struct {
	// server
	BindAddress string `json:"bind_address,omitempty"`
	URLBase     string `json:"url_base,omitempty"`
	Port        string `json:"port,omitempty"`

	LogLevel           string      `json:"log_level,omitempty"`
	Debrids            []Debrid    `json:"debrids,omitempty"`
	QBitTorrent        QBitTorrent `json:"qbittorrent,omitempty"`
	Arrs               []Arr       `json:"arrs,omitempty"`
	AllowedExt         []string    `json:"allowed_file_types,omitempty"`
	MinFileSize        string      `json:"min_file_size,omitempty"` // Minimum file size to download, 10MB, 1GB, etc
	MaxFileSize        string      `json:"max_file_size,omitempty"` // Maximum file size to download (0 means no limit)
	Path               string      `json:"-"`                       // Path to save the config file
	UseAuth            bool        `json:"use_auth,omitempty"`
	Auth               *Auth       `json:"-"`
	DiscordWebhook     string      `json:"discord_webhook_url,omitempty"`
	RemoveStalledAfter string      `json:"remove_stalled_after,omitzero"`
	CallbackURL        string      `json:"callback_url,omitempty"`
}

func (c *Config) JsonFile() string {
	return filepath.Join(c.Path, "config.json")
}

func (c *Config) AuthFile() string {
	return filepath.Join(c.Path, "auth.json")
}

func (c *Config) TorrentsFile() string {
	return filepath.Join(c.Path, "torrents.json")
}

func (c *Config) loadConfig() error {
	// Load the config file
	if configPath == "" {
		return fmt.Errorf("config path not set")
	}

	c.Path = configPath
	file, err := os.ReadFile(c.JsonFile())
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Printf("Config file not found, creating a new one at %s\n", c.JsonFile())

			if err := c.createConfig(c.Path); err != nil {
				return fmt.Errorf("failed to create config file: %w", err)
			}

			return c.Save()
		}

		return fmt.Errorf("error reading config file: %w", err)
	}

	if err := json.Unmarshal(file, &c); err != nil {
		return fmt.Errorf("error unmarshaling config: %w", err)
	}

	c.setDefaults()
	return nil
}

func validateDebrids(debrids []Debrid) error {
	if len(debrids) == 0 {
		return errors.New("no debrids configured")
	}

	for _, debrid := range debrids {
		// Basic field validation
		if debrid.APIKey == "" {
			return errors.New("debrid api key is required")
		}

	}

	return nil
}

func validateQbitTorrent(config *QBitTorrent) error {
	if config.DownloadFolder == "" {
		return errors.New("qbittorent download folder is required")
	}

	if _, err := os.Stat(config.DownloadFolder); os.IsNotExist(err) {
		return fmt.Errorf("qbittorent download folder(%s) does not exist", config.DownloadFolder)
	}

	return nil
}

func ValidateConfig(config *Config) error {
	// Run validations concurrently

	if err := validateDebrids(config.Debrids); err != nil {
		return err
	}

	if err := validateQbitTorrent(&config.QBitTorrent); err != nil {
		return err
	}

	return nil
}

// generateAPIToken creates a new random API token
func generateAPIToken() (string, error) {
	bytes := make([]byte, 32) // 256-bit token
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	return hex.EncodeToString(bytes), nil
}

func SetConfigPath(path string) {
	configPath = path
}

func Get() *Config {
	once.Do(func() {
		instance = &Config{} // Initialize instance first
		err := instance.loadConfig()
		if err != nil {
			_, _ = fmt.Fprintf(os.Stderr, "configuration Error: %v\n", err)
			os.Exit(1)
		}
	})

	return instance
}

func (c *Config) GetMinFileSize() int64 {
	// 0 means no limit
	if c.MinFileSize == "" {
		return 0
	}

	s, err := ParseSize(c.MinFileSize)
	if err != nil {
		return 0
	}

	return s
}

func (c *Config) GetMaxFileSize() int64 {
	// 0 means no limit
	if c.MaxFileSize == "" {
		return 0
	}

	s, err := ParseSize(c.MaxFileSize)
	if err != nil {
		return 0
	}

	return s
}

func (c *Config) IsSizeAllowed(size int64) bool {
	if size == 0 {
		return true // Maybe the debrid hasn't reported the size yet
	}

	if c.GetMinFileSize() > 0 && size < c.GetMinFileSize() {
		return false
	}

	if c.GetMaxFileSize() > 0 && size > c.GetMaxFileSize() {
		return false
	}

	return true
}

func (c *Config) SecretKey() string {
	return cmp.Or(os.Getenv("DECYPHARR_SECRET_KEY"), "\"wqj(v%lj*!-+kf@4&i95rhh_!5_px5qnuwqbr%cjrvrozz_r*(\"")
}

func (c *Config) GetAuth() *Auth {
	if !c.UseAuth {
		return nil
	}

	if c.Auth == nil {
		c.Auth = &Auth{}
		_, err := os.Stat(c.AuthFile())
		if err == nil {
			file, err := os.ReadFile(c.AuthFile())
			if err == nil {
				_ = json.Unmarshal(file, c.Auth)
			}
		}
	}

	return c.Auth
}

func (c *Config) SaveAuth(auth *Auth) error {
	c.Auth = auth
	data, err := json.Marshal(auth)
	if err != nil {
		return err
	}

	return os.WriteFile(c.AuthFile(), data, 0644)
}

func (c *Config) NeedsSetup() error {
	return ValidateConfig(c)
}

func (c *Config) NeedsAuth() bool {
	if c.UseAuth {
		return c.GetAuth().Username == ""
	}

	return false
}

func (c *Config) updateDebrid(d Debrid) Debrid {
	var downloadKeys []string

	if len(d.DownloadAPIKeys) > 0 {
		downloadKeys = d.DownloadAPIKeys
	} else {
		// If no download API keys are specified, use the main API key
		downloadKeys = []string{d.APIKey}
	}
	d.DownloadAPIKeys = downloadKeys
	return d
}

func (c *Config) setDefaults() {
	for i, debrid := range c.Debrids {
		c.Debrids[i] = c.updateDebrid(debrid)
	}

	if len(c.AllowedExt) == 0 {
		c.AllowedExt = getDefaultExtensions()
	}

	c.Port = cmp.Or(c.Port, c.QBitTorrent.Port)

	if c.URLBase == "" {
		c.URLBase = "/"
	}
	// validate url base starts with /
	if !strings.HasPrefix(c.URLBase, "/") {
		c.URLBase = "/" + c.URLBase
	}
	if !strings.HasSuffix(c.URLBase, "/") {
		c.URLBase += "/"
	}

	// Load the auth file
	c.Auth = c.GetAuth()

	// Generate API token if auth is enabled and no token exists
	if c.UseAuth {
		if c.Auth == nil {
			c.Auth = &Auth{}
		}
		if c.Auth.APIToken == "" {
			if token, err := generateAPIToken(); err == nil {
				c.Auth.APIToken = token
				// Save the updated auth config
				_ = c.SaveAuth(c.Auth)
			}
		}
	}
}

func (c *Config) Save() error {

	c.setDefaults()

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	if err := os.WriteFile(c.JsonFile(), data, 0644); err != nil {
		return err
	}
	return nil
}

func (c *Config) createConfig(path string) error {
	// Create the directory if it doesn't exist
	if err := os.MkdirAll(path, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	c.Path = path
	c.URLBase = "/"
	c.Port = "8282"
	c.LogLevel = "info"
	c.UseAuth = true
	c.QBitTorrent = QBitTorrent{
		DownloadFolder:  filepath.Join(path, "downloads"),
		Categories:      []string{"sonarr", "radarr"},
		RefreshInterval: 15,
	}
	return nil
}

// Reload forces a reload of the configuration from disk
func Reload() {
	instance = nil
	once = sync.Once{}
}

func DefaultFreeSlot() int {
	return 10
}
