import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatsData } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusStrip, StatCell } from '../components/ui/StatusStrip';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Clock,
  Cpu,
  Database,
  ArrowDownUp,
  RotateCw,
  Terminal,
} from 'lucide-react';

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
      <PageHeader
        title="System Telemetry"
        subtitle="Real-time server resource usage and runtime diagnostics"
        actions={
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RotateCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        }
      />

      {loading && !stats ? (
        <Card className="text-center py-16 text-muted-foreground">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs">Loading telemetry...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Status Strip metrics */}
          <StatusStrip columns={4}>
            <StatCell
              label="Uptime"
              value={<span className="font-mono">{formatUptime(stats?.uptime)}</span>}
              subtext="Since last startup"
              icon={<Clock className="w-4 h-4 text-primary" />}
              statusDot="ok"
            />
            <StatCell
              label="Goroutines"
              value={<span className="font-mono">{stats?.goroutines ?? 0}</span>}
              subtext="Active Go threads"
              icon={<Cpu className="w-4 h-4 text-accent-foreground" />}
            />
            <StatCell
              label="Memory Alloc"
              value={<span className="font-mono">{formatBytes(stats?.memory_alloc)}</span>}
              subtext={`System: ${formatBytes(stats?.memory_sys)}`}
              icon={<Database className="w-4 h-4 text-muted-foreground" />}
            />
            <StatCell
              label="Total Torrents"
              value={<span className="font-mono">{stats?.torrents_count ?? 0}</span>}
              subtext={`${stats?.active_downloads ?? 0} downloading`}
              icon={<ArrowDownUp className="w-4 h-4 text-success" />}
            />
          </StatusStrip>

          {/* Raw Diagnostics JSON block */}
          {stats && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-foreground">
                  Runtime Diagnostics Payload
                </h3>
              </div>
              <pre className="p-4 rounded-lg bg-elevated border border-border text-xs font-mono text-foreground/90 overflow-x-auto max-h-96 leading-relaxed">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
