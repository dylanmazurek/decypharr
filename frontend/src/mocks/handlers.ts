import { http, HttpResponse } from 'msw';
import { DecypharrConfig, EntryHealth, TorrentItem } from '../types';
import {
  MOCK_BROWSE_DATA,
  MOCK_CATEGORIES,
  MOCK_CONFIG_DATA,
  MOCK_FILES_MAP,
  MOCK_REPAIR_HEALTH,
  MOCK_STATS_DATA,
  MOCK_TORRENTS,
} from './fixtures';

let mockTorrents: TorrentItem[] = [...MOCK_TORRENTS];
let mockRepair: EntryHealth[] = [...MOCK_REPAIR_HEALTH];
let mockConfig: DecypharrConfig = { ...MOCK_CONFIG_DATA };

export const handlers = [
  // Torrents Info
  http.get('*/api/v2/torrents/info', ({ request }) => {
    const url = new URL(request.url);
    const filter = url.searchParams.get('filter') || 'all';
    const category = url.searchParams.get('category') || '';

    const results = mockTorrents.filter((t) => {
      if (category && t.category !== category) return false;
      const state = (t.state || '').toLowerCase();
      if (filter === 'downloading') return state.includes('download');
      if (filter === 'completed')
        return state.includes('complete') || state.includes('upload') || state.includes('seed');
      if (filter === 'paused') return state.includes('pause');
      return true;
    });

    return HttpResponse.json(results);
  }),

  // Torrent Files
  http.get('*/api/v2/torrents/files', ({ request }) => {
    const url = new URL(request.url);
    const hash = url.searchParams.get('hash') || '';

    if (MOCK_FILES_MAP[hash]) {
      return HttpResponse.json(MOCK_FILES_MAP[hash]);
    }

    const t = mockTorrents.find((item) => item.hash === hash);
    return HttpResponse.json([
      {
        index: 0,
        name: `${t?.name || 'MediaFile'}.mkv`,
        size: t?.size || 10737418240,
        progress: t?.progress || 1.0,
        priority: 1,
      },
    ]);
  }),

  // Add Torrent
  http.post('*/api/v2/torrents/add', async ({ request }) => {
    const formData = await request.formData();
    const rawUrl = (formData.get('urls') as string) || '';
    const file = formData.get('torrents') as File | null;
    const cat = (formData.get('category') as string) || '';
    const isPaused = formData.get('paused') === 'true';

    let name = file?.name?.replace(/\.torrent$/i, '') || 'Custom.Download.Media.2160p';
    if (!file && rawUrl) {
      const match = rawUrl.match(/dn=([^&]+)/);
      if (match) name = decodeURIComponent(match[1]);
      else name = rawUrl.substring(0, 36);
    }

    const newTorrent: TorrentItem = {
      hash: Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2),
      name,
      size: 15000000000,
      progress: isPaused ? 0.0 : 0.05,
      dlspeed: isPaused ? 0 : 25000000,
      upspeed: 0,
      eta: isPaused ? 8640000 : 600,
      state: isPaused ? 'paused' : 'downloading',
      category: cat || 'movies',
      num_seeds: 50,
      num_leechs: 10,
      added_on: Math.floor(Date.now() / 1000),
    };

    mockTorrents = [newTorrent, ...mockTorrents];
    return new HttpResponse('Ok', { status: 200 });
  }),

  // Pause Torrents
  http.post('*/api/v2/torrents/pause', async ({ request }) => {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const hashes = (params.get('hashes') || '').split('|');
    const set = new Set(hashes);

    mockTorrents = mockTorrents.map((t) =>
      set.has(t.hash) ? { ...t, state: 'paused', dlspeed: 0, upspeed: 0 } : t
    );
    return new HttpResponse(null, { status: 200 });
  }),

  // Resume Torrents
  http.post('*/api/v2/torrents/resume', async ({ request }) => {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const hashes = (params.get('hashes') || '').split('|');
    const set = new Set(hashes);

    mockTorrents = mockTorrents.map((t) =>
      set.has(t.hash)
        ? {
          ...t,
          state: t.progress === 1 ? 'uploading' : 'downloading',
          dlspeed: t.progress === 1 ? 0 : 35000000,
        }
        : t
    );
    return new HttpResponse(null, { status: 200 });
  }),

  // Delete Torrents
  http.post('*/api/v2/torrents/delete', async ({ request }) => {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const hashes = (params.get('hashes') || '').split('|');
    const set = new Set(hashes);

    mockTorrents = mockTorrents.filter((t) => !set.has(t.hash));
    return new HttpResponse(null, { status: 200 });
  }),

  // Recheck Torrents
  http.post('*/api/v2/torrents/recheck', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Categories
  http.get('*/api/v2/torrents/categories', () => {
    return HttpResponse.json(MOCK_CATEGORIES);
  }),

  // Browse Directory
  http.get('*/api/browse*', ({ request }) => {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/browse\/?/, '');
    const clean = decodeURIComponent(path).replace(/^\//, '');

    const data = MOCK_BROWSE_DATA[clean] || {
      current_dir: clean,
      total: 0,
      entries: [],
    };
    return HttpResponse.json(data);
  }),

  // Stats
  http.get('*/debug/stats', () => {
    return HttpResponse.json({
      ...MOCK_STATS_DATA,
      torrents_count: mockTorrents.length,
      active_downloads: mockTorrents.filter((t) => t.state === 'downloading').length,
    });
  }),

  // Repair Health & Status
  http.get('*/api/repair/health', () => {
    return HttpResponse.json(mockRepair);
  }),
  http.get('*/api/repair/status', () => {
    return HttpResponse.json({ running: false, scanned: mockRepair.length });
  }),
  http.get('*/api/repair/runs', () => {
    return HttpResponse.json([]);
  }),
  http.post('*/api/arr/reacquire', () => {
    return HttpResponse.json({ ok: true });
  }),

  // Run Repair
  http.post('*/api/repair/run', () => {
    return HttpResponse.json({ ok: true, scanned: mockRepair.length });
  }),

  // Fix Repair
  http.post('*/api/repair/fix', async ({ request }) => {
    const body = (await request.json()) as { names?: string[] };
    const names = body?.names || [];
    const nameSet = new Set(names);

    mockRepair = mockRepair.map((item) => {
      if (names.length === 0 || nameSet.has(item.entry_name)) {
        return {
          ...item,
          status: 'healthy',
          broken_count: 0,
          failure_reason: '',
          last_ok_at: new Date().toISOString(),
        };
      }
      return item;
    });

    return HttpResponse.json({ ok: true, fixed: names.length || mockRepair.length });
  }),

  // Config
  http.get('*/api/config', () => {
    return HttpResponse.json(mockConfig);
  }),

  http.post('*/api/config', async ({ request }) => {
    const body = (await request.json()) as DecypharrConfig;
    mockConfig = { ...body };
    return new HttpResponse(null, { status: 200 });
  }),

  // Auth mocks
  http.post('*/login', () => new HttpResponse(null, { status: 200 })),
  http.post('*/logout', () => new HttpResponse(null, { status: 200 })),
  http.post('*/register', () => new HttpResponse(null, { status: 200 })),
  http.post('*/setup', () => new HttpResponse(null, { status: 200 })),
];
