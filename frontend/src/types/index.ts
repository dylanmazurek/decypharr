// Global injected Decypharr configuration
declare global {
  interface Window {
    __DECYPHARR__?: {
      urlBase?: string;
      version?: string;
      setupRequired?: boolean;
      setupError?: string;
      authEnabled?: boolean;
      user?: string;
    };
  }
}

export interface DecypharrMeta {
  urlBase: string;
  version: string;
  setupRequired: boolean;
  setupError?: string;
  authEnabled: boolean;
  user?: string;
}

export interface TorrentItem {
  hash: string;
  name: string;
  size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  eta: number;
  state: string;
  category?: string;
  tags?: string;
  num_seeds?: number;
  num_leechs?: number;
  total_seeds?: number;
  total_leechs?: number;
  ratio?: number;
  added_on?: number;
  completion_on?: number;
  content_path?: string;
  magnet_uri?: string;
  save_path?: string;
}

export interface TorrentFile {
  index: number;
  name: string;
  size: number;
  progress: number;
  priority: number;
  is_seed?: boolean;
  piece_range?: [number, number];
  availability?: number;
}

export interface BrowseItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  mod_time: string;
  extension?: string;
}

export interface RepairCheckResult {
  path: string;
  status: 'ok' | 'corrupt' | 'missing' | 'error';
  message?: string;
  torrent_hash?: string;
  torrent_name?: string;
}

export interface StatsData {
  uptime?: number;
  goroutines?: number;
  memory_alloc?: number;
  memory_total?: number;
  memory_sys?: number;
  active_downloads?: number;
  active_uploads?: number;
  download_speed?: number;
  upload_speed?: number;
  total_downloaded?: number;
  total_uploaded?: number;
  torrents_count?: number;
  [key: string]: unknown;
}

export interface DebridAccountStatus {
  service: string;
  active: boolean;
  username?: string;
  email?: string;
  premium?: boolean;
  expiration?: string;
  points?: number;
}

export interface DecypharrConfig {
  [key: string]: any;
}
