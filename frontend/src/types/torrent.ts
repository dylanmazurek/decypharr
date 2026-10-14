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