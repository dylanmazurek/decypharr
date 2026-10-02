import { DecypharrMeta, TorrentItem, TorrentFile, BrowseItem, StatsData, DecypharrConfig } from '../types';

export function getMeta(): DecypharrMeta {
  const injected = window.__DECYPHARR__ || {};
  return {
    urlBase: (injected.urlBase || '').replace(/\/$/, ''),
    version: injected.version || 'v1.1.5',
    setupRequired: !!injected.setupRequired,
    setupError: injected.setupError || '',
    authEnabled: injected.authEnabled ?? true,
    user: injected.user || '',
  };
}

export function apiUrl(path: string): string {
  const { urlBase } = getMeta();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${urlBase}${cleanPath}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = apiUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/setup')) {
      window.location.href = apiUrl('/login');
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && (errJson.error || errJson.message)) {
        errorMsg = errJson.error || errJson.message;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) errorMsg = text;
      } catch {
        // use default errorMsg
      }
    }
    throw new Error(errorMsg);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return response.text() as unknown as Promise<T>;
}

export const api = {
  // Torrents
  getTorrents: async (filter = 'all', category?: string): Promise<TorrentItem[]> => {
    const params = new URLSearchParams();
    if (filter && filter !== 'all') params.append('filter', filter);
    if (category) params.append('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';
    // Support qBittorrent compatibility API endpoints
    return request<TorrentItem[]>(`/api/v2/torrents/info${qs}`);
  },

  getTorrentFiles: async (hash: string): Promise<TorrentFile[]> => {
    return request<TorrentFile[]>(`/api/v2/torrents/files?hash=${encodeURIComponent(hash)}`);
  },

  addTorrent: async (formData: FormData): Promise<void> => {
    const url = apiUrl('/api/v2/torrents/add');
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Failed to add torrent: ${res.statusText}`);
    }
  },

  pauseTorrents: async (hashes: string[]): Promise<void> => {
    const body = new URLSearchParams();
    body.append('hashes', hashes.join('|'));
    await request<void>('/api/v2/torrents/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  },

  resumeTorrents: async (hashes: string[]): Promise<void> => {
    const body = new URLSearchParams();
    body.append('hashes', hashes.join('|'));
    await request<void>('/api/v2/torrents/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  },

  deleteTorrents: async (hashes: string[], deleteFiles: boolean): Promise<void> => {
    const body = new URLSearchParams();
    body.append('hashes', hashes.join('|'));
    body.append('deleteFiles', deleteFiles ? 'true' : 'false');
    await request<void>('/api/v2/torrents/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  },

  recheckTorrents: async (hashes: string[]): Promise<void> => {
    const body = new URLSearchParams();
    body.append('hashes', hashes.join('|'));
    await request<void>('/api/v2/torrents/recheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  },

  getCategories: async (): Promise<Record<string, { name: string; savePath: string }>> => {
    try {
      return await request<Record<string, { name: string; savePath: string }>>('/api/v2/torrents/categories');
    } catch {
      return {};
    }
  },

  // File browser
  browse: async (path = ''): Promise<{ path: string; items: BrowseItem[] }> => {
    const qs = path ? `?path=${encodeURIComponent(path)}` : '';
    return request<{ path: string; items: BrowseItem[] }>(`/api/browse${qs}`);
  },

  // Repair & Health check
  checkRepair: async (): Promise<any> => {
    return request<any>('/api/repair/check');
  },

  reacquire: async (hash?: string): Promise<any> => {
    return request<any>('/api/repair/reacquire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash }),
    });
  },

  // Stats
  getStats: async (): Promise<StatsData> => {
    return request<StatsData>('/api/stats');
  },

  // Config
  getConfig: async (): Promise<DecypharrConfig> => {
    return request<DecypharrConfig>('/api/config');
  },

  updateConfig: async (config: DecypharrConfig): Promise<void> => {
    await request<void>('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  },

  // Auth
  login: async (formData: FormData): Promise<void> => {
    const url = apiUrl('/login');
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Login failed');
    }
  },

  register: async (formData: FormData): Promise<void> => {
    const url = apiUrl('/register');
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Registration failed');
    }
  },

  logout: async (): Promise<void> => {
    try {
      await fetch(apiUrl('/logout'), { method: 'POST' });
    } catch {
      // ignore
    }
    window.location.href = apiUrl('/login');
  },

  // Setup
  submitSetup: async (formData: FormData): Promise<void> => {
    const url = apiUrl('/setup');
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Setup failed');
    }
  },
};
