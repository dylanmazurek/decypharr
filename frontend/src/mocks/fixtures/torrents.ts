import { TorrentFile, TorrentItem } from "../../types";

const MOCK_TORRENTS: TorrentItem[] = [
  {
    hash: '4a6b2c89d0e1f3456789abcdef0123456789abcd',
    name: 'Dune.Part.Two.2024.2160p.UHD.BluRay.x265-SURCODE',
    size: 73400320000, // 68.36 GB
    progress: 0.68,
    dlspeed: 48500000, // 46.25 MB/s
    upspeed: 1240000, // 1.18 MB/s
    eta: 480, // 8 minutes
    state: 'downloading',
    category: 'movies',
    num_seeds: 148,
    num_leechs: 24,
    total_seeds: 320,
    total_leechs: 45,
    ratio: 0.12,
    added_on: Math.floor(Date.now() / 1000) - 3600,
  },
  {
    hash: '8f12a34bc56de7890123456789abcdef01234567',
    name: 'Severance.S02.2160p.ATVP.WEB-DL.DDP5.1.Atmos.H.265-FLUX',
    size: 37580963840, // 35.0 GB
    progress: 0.89,
    dlspeed: 14200000, // 13.54 MB/s
    upspeed: 850000, // 830 KB/s
    eta: 310, // ~5 minutes
    state: 'downloading',
    category: 'tv',
    num_seeds: 84,
    num_leechs: 12,
    total_seeds: 180,
    total_leechs: 22,
    ratio: 0.45,
    added_on: Math.floor(Date.now() / 1000) - 7200,
  },
  {
    hash: '1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
    name: 'Blade.Runner.2049.2017.1080p.BluRay.x264-SPARKS',
    size: 15246983168, // 14.2 GB
    progress: 1.0,
    dlspeed: 0,
    upspeed: 450000, // 439 KB/s
    eta: 8640000,
    state: 'uploading',
    category: 'movies',
    num_seeds: 92,
    num_leechs: 8,
    total_seeds: 210,
    total_leechs: 15,
    ratio: 2.14,
    added_on: Math.floor(Date.now() / 1000) - 86400,
  },
  {
    hash: '9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d',
    name: 'Shogun.2024.S01.1080p.DSNP.WEB-DL.DDP5.1.Atmos.H.264-FLUX',
    size: 23622320128, // 22.0 GB
    progress: 1.0,
    dlspeed: 0,
    upspeed: 320000,
    eta: 8640000,
    state: 'uploading',
    category: 'tv',
    num_seeds: 65,
    num_leechs: 4,
    total_seeds: 140,
    total_leechs: 10,
    ratio: 1.68,
    added_on: Math.floor(Date.now() / 1000) - 172800,
  },
  {
    hash: '3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
    name: 'Cyberpunk.Edgerunners.S01.1080p.NF.WEB-DL.DDP5.1.x264-FLUX',
    size: 9234120704, // 8.6 GB
    progress: 0.42,
    dlspeed: 0,
    upspeed: 0,
    eta: 8640000,
    state: 'paused',
    category: 'anime',
    num_seeds: 45,
    num_leechs: 6,
    total_seeds: 90,
    total_leechs: 12,
    ratio: 0.05,
    added_on: Math.floor(Date.now() / 1000) - 43200,
  },
  {
    hash: '5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e',
    name: 'Spirited.Away.2001.1080p.BluRay.x264-FGT',
    size: 10522669056, // 9.8 GB
    progress: 1.0,
    dlspeed: 0,
    upspeed: 180000,
    eta: 8640000,
    state: 'uploading',
    category: 'anime',
    num_seeds: 110,
    num_leechs: 2,
    total_seeds: 250,
    total_leechs: 8,
    ratio: 3.42,
    added_on: Math.floor(Date.now() / 1000) - 259200,
  },
];

const MOCK_FILES_MAP: Record<string, TorrentFile[]> = {
  '4a6b2c89d0e1f3456789abcdef0123456789abcd': [
    {
      index: 0,
      name: 'Dune.Part.Two.2024.2160p.UHD.BluRay.x265-SURCODE.mkv',
      size: 72800000000,
      progress: 0.68,
      priority: 1,
    },
    {
      index: 1,
      name: 'Subs/Dune.Part.Two.2024.en.srt',
      size: 184320,
      progress: 1.0,
      priority: 1,
    },
    {
      index: 2,
      name: 'Subs/Dune.Part.Two.2024.es.srt',
      size: 172032,
      progress: 1.0,
      priority: 1,
    },
    {
      index: 3,
      name: 'Sample/dune2.sample.mkv',
      size: 600000000,
      progress: 1.0,
      priority: 1,
    },
  ],
  '8f12a34bc56de7890123456789abcdef01234567': [
    {
      index: 0,
      name: 'Severance.S02E01.2160p.mkv',
      size: 7516192768,
      progress: 1.0,
      priority: 1,
    },
    {
      index: 1,
      name: 'Severance.S02E02.2160p.mkv',
      size: 7516192768,
      progress: 1.0,
      priority: 1,
    },
    {
      index: 2,
      name: 'Severance.S02E03.2160p.mkv',
      size: 7516192768,
      progress: 1.0,
      priority: 1,
    },
    {
      index: 3,
      name: 'Severance.S02E04.2160p.mkv',
      size: 7516192768,
      progress: 0.82,
      priority: 1,
    },
    {
      index: 4,
      name: 'Severance.S02E05.2160p.mkv',
      size: 7516192768,
      progress: 0.64,
      priority: 1,
    },
  ],
};

export { MOCK_FILES_MAP, MOCK_TORRENTS };
