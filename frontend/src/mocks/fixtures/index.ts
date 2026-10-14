import {
  BrowseResponse,
  EntryHealth,
  StatsData
} from '../../types';

const MOCK_BROWSE_DATA: Record<string, BrowseResponse> = {
  '': {
    current_dir: '',
    total: 4,
    entries: [
      {
        name: 'Movies',
        path: 'Movies',
        is_dir: true,
        size: 0,
        mod_time: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        name: 'TV Shows',
        path: 'TV Shows',
        is_dir: true,
        size: 0,
        mod_time: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        name: 'Anime',
        path: 'Anime',
        is_dir: true,
        size: 0,
        mod_time: new Date(Date.now() - 14400000).toISOString(),
      },
      {
        name: 'Downloads',
        path: 'Downloads',
        is_dir: true,
        size: 0,
        mod_time: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
  },
  'Movies': {
    current_dir: 'Movies',
    total: 3,
    entries: [
      {
        name: 'Dune.Part.Two.2024.2160p.mkv',
        path: 'Movies/Dune.Part.Two.2024.2160p.mkv',
        is_dir: false,
        size: 73400320000,
        mod_time: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        name: 'Blade.Runner.2049.2017.1080p.mkv',
        path: 'Movies/Blade.Runner.2049.2017.1080p.mkv',
        is_dir: false,
        size: 15246983168,
        mod_time: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        name: 'Oppenheimer.2023.2160p.mkv',
        path: 'Movies/Oppenheimer.2023.2160p.mkv',
        is_dir: false,
        size: 85899345920,
        mod_time: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  },
  'TV Shows': {
    current_dir: 'TV Shows',
    total: 2,
    entries: [
      {
        name: 'Severance',
        path: 'TV Shows/Severance',
        is_dir: true,
        size: 0,
        mod_time: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        name: 'Shogun (2024)',
        path: 'TV Shows/Shogun (2024)',
        is_dir: true,
        size: 0,
        mod_time: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  },
  'Anime': {
    current_dir: 'Anime',
    total: 2,
    entries: [
      {
        name: 'Spirited Away (2001).mkv',
        path: 'Anime/Spirited Away (2001).mkv',
        is_dir: false,
        size: 10522669056,
        mod_time: new Date(Date.now() - 259200000).toISOString(),
      },
      {
        name: 'Cyberpunk Edgerunners S01',
        path: 'Anime/Cyberpunk Edgerunners S01',
        is_dir: true,
        size: 0,
        mod_time: new Date(Date.now() - 43200000).toISOString(),
      },
    ],
  },
};

const MOCK_STATS_DATA: StatsData = {
  uptime: 452892, // ~5.2 days
  goroutines: 38,
  memory_alloc: 134217728, // 128 MB
  memory_sys: 268435456, // 256 MB
  memory_total: 536870912,
  active_downloads: 2,
  active_uploads: 3,
  download_speed: 62700000, // 59.8 MB/s
  upload_speed: 2540000, // 2.4 MB/s
  total_downloaded: 4294967296000, // ~4.0 TB
  total_uploaded: 1610612736000, // ~1.5 TB
  torrents_count: 6,
};

const MOCK_REPAIR_HEALTH: EntryHealth[] = [
  {
    entry_name: 'Dune.Part.Two.2024.2160p.UHD.BluRay.x265-SURCODE',
    status: 'healthy',
    file_count: 4,
    broken_count: 0,
    last_ok_at: new Date(Date.now() - 1800000).toISOString(),
    failure_reason: '',
  },
  {
    entry_name: 'Severance.S02.2160p.ATVP.WEB-DL.DDP5.1.Atmos.H.265-FLUX',
    status: 'healthy',
    file_count: 5,
    broken_count: 0,
    last_ok_at: new Date(Date.now() - 3600000).toISOString(),
    failure_reason: '',
  },
  {
    entry_name: 'Blade.Runner.2049.2017.1080p.BluRay.x264-SPARKS',
    status: 'healthy',
    file_count: 1,
    broken_count: 0,
    last_ok_at: new Date(Date.now() - 86400000).toISOString(),
    failure_reason: '',
  },
  {
    entry_name: 'The.Matrix.1999.2160p.UHD.BluRay.x265-TERMINAL',
    status: 'broken',
    file_count: 1,
    broken_count: 1,
    last_checked_at: new Date(Date.now() - 900000).toISOString(),
    failure_reason: 'CRC checksum mismatch or file incomplete on disk',
    broken_files: [
      {
        file_name: 'The.Matrix.1999.2160p.mkv',
        reason: 'Missing data pieces 1420-1435',
        size: 58000000000,
      },
    ],
  },
];

export { MOCK_CATEGORIES } from './categories';
export { MOCK_CONFIG_DATA } from './config';
export { MOCK_FILES_MAP, MOCK_TORRENTS } from './torrents';
export { MOCK_BROWSE_DATA, MOCK_REPAIR_HEALTH, MOCK_STATS_DATA };
