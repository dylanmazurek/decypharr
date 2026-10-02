import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatsData } from '../types';

export const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatUptime = (seconds?: number): string => {
    if (!seconds) return '0s';
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (days > 0) return `${days}d ${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <i className="bi bi-graph-up text-2xl text-secondary"></i>
        <div>
          <h2 className="text-xl font-bold">System Telemetry & Stats</h2>
          <p className="text-xs text-base-content/60">
            Real-time server metrics, resource usage, and account statistics
          </p>
        </div>
      </div>

      {loading && !stats ? (
        <div className="text-center py-16">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat bg-base-100 rounded-xl border border-base-300">
            <div className="stat-figure text-primary">
              <i className="bi bi-clock-history text-3xl"></i>
            </div>
            <div className="stat-title">Uptime</div>
            <div className="stat-value text-2xl">{formatUptime(stats?.uptime)}</div>
            <div className="stat-desc">Since last server start</div>
          </div>

          <div className="stat bg-base-100 rounded-xl border border-base-300">
            <div className="stat-figure text-secondary">
              <i className="bi bi-cpu text-3xl"></i>
            </div>
            <div className="stat-title">Goroutines</div>
            <div className="stat-value text-2xl">{stats?.goroutines ?? 0}</div>
            <div className="stat-desc">Active Go threads</div>
          </div>

          <div className="stat bg-base-100 rounded-xl border border-base-300">
            <div className="stat-figure text-accent">
              <i className="bi bi-memory text-3xl"></i>
            </div>
            <div className="stat-title">Memory Alloc</div>
            <div className="stat-value text-2xl">{formatBytes(stats?.memory_alloc)}</div>
            <div className="stat-desc">Sys: {formatBytes(stats?.memory_sys)}</div>
          </div>

          <div className="stat bg-base-100 rounded-xl border border-base-300">
            <div className="stat-figure text-info">
              <i className="bi bi-arrow-down-up text-3xl"></i>
            </div>
            <div className="stat-title">Active Torrents</div>
            <div className="stat-value text-2xl">{stats?.torrents_count ?? 0}</div>
            <div className="stat-desc">{stats?.active_downloads ?? 0} downloading</div>
          </div>

          {/* Details / Raw JSON view if extra fields exist */}
          {stats && (
            <div className="col-span-full bg-base-100 rounded-xl border border-base-300 p-5 mt-4">
              <h3 className="font-semibold text-sm mb-3">System Diagnostics</h3>
              <pre className="bg-base-200 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-80">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
