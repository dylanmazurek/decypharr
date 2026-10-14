import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { TorrentItem, TorrentFile } from '../types';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusStrip, StatCell } from '../components/ui/StatusStrip';
import { Segmented } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import {
  ArrowDown,
  ArrowUp,
  Play,
  Pause,
  Trash2,
  RotateCw,
  Search,
  HardDrive,
  FolderOpen,
  X,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const { addToast } = useToast();
  const [torrents, setTorrents] = useState<TorrentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');
  const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());
  const [selectedTorrent, setSelectedTorrent] = useState<TorrentItem | null>(null);
  const [files, setFiles] = useState<TorrentFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);

  const fetchTorrents = useCallback(async () => {
    try {
      const data = await api.getTorrents(filter, category);
      setTorrents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch torrents:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, category]);

  useEffect(() => {
    fetchTorrents();
    api.getCategories().then(setCategories).catch(() => {});
    const interval = setInterval(fetchTorrents, 2500);
    return () => clearInterval(interval);
  }, [fetchTorrents]);

  const viewDetails = async (t: TorrentItem) => {
    setSelectedTorrent(t);
    setLoadingFiles(true);
    try {
      const f = await api.getTorrentFiles(t.hash);
      setFiles(Array.isArray(f) ? f : []);
    } catch {
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedHashes(new Set(filteredTorrents.map((t) => t.hash)));
    } else {
      setSelectedHashes(new Set());
    }
  };

  const toggleSelect = (hash: string) => {
    setSelectedHashes((prev) => {
      const next = new Set(prev);
      if (next.has(hash)) next.delete(hash);
      else next.add(hash);
      return next;
    });
  };

  const handlePause = async () => {
    if (selectedHashes.size === 0) return;
    try {
      await api.pauseTorrents(Array.from(selectedHashes));
      addToast(`Paused ${selectedHashes.size} item(s)`, 'success');
      fetchTorrents();
    } catch (err: any) {
      addToast(err.message || 'Failed to pause', 'error');
    }
  };

  const handleResume = async () => {
    if (selectedHashes.size === 0) return;
    try {
      await api.resumeTorrents(Array.from(selectedHashes));
      addToast(`Resumed ${selectedHashes.size} item(s)`, 'success');
      fetchTorrents();
    } catch (err: any) {
      addToast(err.message || 'Failed to resume', 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedHashes.size === 0) return;
    try {
      await api.deleteTorrents(Array.from(selectedHashes), deleteFiles);
      addToast(`Deleted ${selectedHashes.size} item(s)`, 'success');
      setSelectedHashes(new Set());
      setShowDeleteModal(false);
      fetchTorrents();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete', 'error');
    }
  };

  const handleRecheck = async () => {
    if (selectedHashes.size === 0) return;
    try {
      await api.recheckTorrents(Array.from(selectedHashes));
      addToast(`Rechecking ${selectedHashes.size} item(s)`, 'info');
      fetchTorrents();
    } catch (err: any) {
      addToast(err.message || 'Failed to recheck', 'error');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSec: number): string => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
    return `${formatBytes(bytesPerSec)}/s`;
  };

  const formatEta = (seconds: number): string => {
    if (!seconds || seconds >= 8640000) return '∞';
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const filteredTorrents = useMemo(() => {
    return torrents.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [torrents, search]);

  const stats = useMemo(() => {
    let dlTotal = 0;
    let upTotal = 0;
    let downloadingCount = 0;
    let completedCount = 0;
    let pausedCount = 0;

    torrents.forEach((t) => {
      dlTotal += t.dlspeed || 0;
      upTotal += t.upspeed || 0;
      const state = (t.state || '').toLowerCase();
      if (state.includes('download')) downloadingCount++;
      else if (state.includes('complete') || state.includes('upload') || state.includes('seed'))
        completedCount++;
      else if (state.includes('pause')) pausedCount++;
    });

    return {
      total: torrents.length,
      dlTotal,
      upTotal,
      downloadingCount,
      completedCount,
      pausedCount,
    };
  }, [torrents]);

  const filterOptions = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'downloading', label: 'Downloading', count: stats.downloadingCount },
    { value: 'completed', label: 'Completed', count: stats.completedCount },
    { value: 'paused', label: 'Paused', count: stats.pausedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Torrents"
        subtitle="Active media transfers and download queues"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTorrents}
              title="Refresh"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Signature Status Strip */}
      <StatusStrip columns={4}>
        <StatCell
          label="Total Transfers"
          value={<span className="font-mono">{stats.total}</span>}
          subtext="Active in client"
          icon={<HardDrive className="w-4 h-4" />}
          statusDot="ok"
        />
        <StatCell
          label="Download Speed"
          value={
            <span className="font-mono text-primary flex items-center gap-1.5">
              <ArrowDown className="w-4 h-4 shrink-0 text-primary" />
              {formatSpeed(stats.dlTotal)}
            </span>
          }
          subtext="Aggregate inbound"
        />
        <StatCell
          label="Upload Speed"
          value={
            <span className="font-mono text-accent-foreground flex items-center gap-1.5">
              <ArrowUp className="w-4 h-4 shrink-0 text-accent-foreground" />
              {formatSpeed(stats.upTotal)}
            </span>
          }
          subtext="Aggregate outbound"
        />
        <StatCell
          label="Active Queues"
          value={
            <span className="font-mono">
              {stats.downloadingCount} <span className="text-sm font-normal text-muted-foreground">DL</span> /{' '}
              {stats.completedCount} <span className="text-sm font-normal text-muted-foreground">Done</span>
            </span>
          }
          subtext={stats.pausedCount > 0 ? `${stats.pausedCount} paused` : 'Running smoothly'}
        />
      </StatusStrip>

      {/* Filter and Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-card-lift">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Filter */}
          <Segmented
            options={filterOptions}
            value={filter}
            onChange={(val) => setFilter(val)}
            size="sm"
          />

          {/* Categories Selector */}
          {Object.keys(categories).length > 0 && (
            <select
              className="h-8 px-2.5 text-xs rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {Object.keys(categories).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Batch Actions & Search */}
        <div className="flex items-center gap-2 justify-between lg:justify-end">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedHashes.size === 0}
              onClick={handleResume}
              title="Resume selected"
            >
              <Play className="w-3.5 h-3.5 text-success" />
              <span className="hidden sm:inline">Resume</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedHashes.size === 0}
              onClick={handlePause}
              title="Pause selected"
            >
              <Pause className="w-3.5 h-3.5 text-warning" />
              <span className="hidden sm:inline">Pause</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedHashes.size === 0}
              onClick={handleRecheck}
              title="Force recheck"
            >
              <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedHashes.size === 0}
              onClick={() => setShowDeleteModal(true)}
              title="Delete selected"
              className={selectedHashes.size > 0 ? 'text-destructive-text hover:bg-destructive/10' : ''}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>

            {selectedHashes.size > 0 && (
              <span className="text-xs text-muted-foreground font-mono ml-1">
                ({selectedHashes.size})
              </span>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-44 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Filter names..."
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Torrents Table */}
      <div className="rounded-xl border border-border bg-card shadow-card-lift overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-elevated/70 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-border accent-primary cursor-pointer"
                    checked={
                      filteredTorrents.length > 0 &&
                      selectedHashes.size === filteredTorrents.length
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="py-2.5 px-3 font-semibold">Name</th>
                <th className="py-2.5 px-3 w-24 font-semibold">Size</th>
                <th className="py-2.5 px-3 w-36 font-semibold">Progress</th>
                <th className="py-2.5 px-3 w-28 font-semibold">Status</th>
                <th className="py-2.5 px-3 w-24 font-semibold">DL Speed</th>
                <th className="py-2.5 px-3 w-20 font-semibold">ETA</th>
                <th className="py-2.5 px-3 w-16 font-semibold">Seeds</th>
                <th className="py-2.5 px-3 w-16 font-semibold">Peers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-muted-foreground">
                    <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-xs">Loading torrents...</p>
                  </td>
                </tr>
              ) : filteredTorrents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="text-sm font-medium text-foreground">No torrents found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {search ? 'Try adjusting your search query' : 'Queue is currently empty'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTorrents.map((t) => {
                  const isSelected = selectedHashes.has(t.hash);
                  const progressPct = Math.round((t.progress || 0) * 100);
                  const isDone = t.progress === 1;

                  return (
                    <tr
                      key={t.hash}
                      className={cn(
                        'transition-colors cursor-pointer group',
                        isSelected ? 'bg-raised/70' : 'hover:bg-elevated/50'
                      )}
                      onClick={() => viewDetails(t)}
                    >
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-border accent-primary cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleSelect(t.hash)}
                        />
                      </td>
                      <td className="py-2.5 px-3 max-w-xs md:max-w-md truncate font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="truncate" title={t.name}>
                            {t.name}
                          </span>
                          {t.category && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-elevated border border-border text-muted-foreground shrink-0">
                              {t.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                        {formatBytes(t.size)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-elevated rounded-full h-1.5 overflow-hidden">
                            <div
                              className={cn(
                                'h-full transition-all duration-300 rounded-full',
                                isDone ? 'bg-success' : 'bg-primary'
                              )}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                            {progressPct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border',
                            t.state.includes('download')
                              ? 'bg-primary/10 border-primary/30 text-accent-foreground'
                              : t.state.includes('upload') || t.state.includes('seed')
                              ? 'bg-success/10 border-success/30 text-success'
                              : t.state.includes('pause')
                              ? 'bg-warning/10 border-warning/30 text-warning'
                              : t.state.includes('error')
                              ? 'bg-destructive/10 border-destructive/30 text-destructive-text'
                              : 'bg-elevated border-border text-muted-foreground'
                          )}
                        >
                          {t.state}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-primary">
                        {formatSpeed(t.dlspeed)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                        {formatEta(t.eta)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                        {t.num_seeds ?? '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">
                        {t.num_leechs ?? '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="rounded-xl border border-border bg-card shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2.5 text-destructive-text font-semibold text-lg">
              <AlertTriangle className="w-5 h-5" />
              <span>Delete Torrents</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to remove {selectedHashes.size} selected item(s) from Decypharr?
            </p>
            <label className="flex items-center gap-3 p-3 rounded-lg bg-elevated border border-border cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-border accent-destructive cursor-pointer"
                checked={deleteFiles}
                onChange={(e) => setDeleteFiles(e.target.checked)}
              />
              <span className="text-xs text-foreground font-medium">
                Also permanently delete downloaded files from disk
              </span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                Delete Items
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Torrent Details Modal */}
      {selectedTorrent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="rounded-xl border border-border bg-card shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-start p-5 border-b border-border bg-elevated/40">
              <div className="min-w-0 pr-4">
                <h3 className="font-semibold text-base text-foreground truncate" title={selectedTorrent.name}>
                  {selectedTorrent.name}
                </h3>
                <div className="text-xs font-mono text-muted-foreground mt-1 truncate">
                  Hash: {selectedTorrent.hash}
                </div>
              </div>
              <button
                type="button"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated cursor-pointer"
                onClick={() => setSelectedTorrent(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border-b border-border">
              <div className="bg-card p-3.5">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Size</div>
                <div className="font-mono text-sm font-semibold text-foreground mt-0.5">
                  {formatBytes(selectedTorrent.size)}
                </div>
              </div>
              <div className="bg-card p-3.5">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Status</div>
                <div className="text-xs uppercase font-semibold text-foreground mt-0.5">
                  {selectedTorrent.state}
                </div>
              </div>
              <div className="bg-card p-3.5">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Download</div>
                <div className="font-mono text-sm font-semibold text-primary mt-0.5">
                  {formatSpeed(selectedTorrent.dlspeed)}
                </div>
              </div>
              <div className="bg-card p-3.5">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">Upload</div>
                <div className="font-mono text-sm font-semibold text-accent-foreground mt-0.5">
                  {formatSpeed(selectedTorrent.upspeed)}
                </div>
              </div>
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm text-foreground">
                  Files ({files.length})
                </h4>
              </div>

              {loadingFiles ? (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs mt-2">Loading file contents...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="text-sm text-muted-foreground italic py-6 text-center">
                  No individual file details available
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-elevated/60 border-b border-border text-muted-foreground font-semibold">
                        <th className="py-2 px-3">File Name</th>
                        <th className="py-2 px-3 w-24">Size</th>
                        <th className="py-2 px-3 w-32">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {files.map((f, idx) => (
                        <tr key={idx} className="hover:bg-elevated/40">
                          <td className="py-2 px-3 max-w-md truncate text-foreground" title={f.name}>
                            {f.name}
                          </td>
                          <td className="py-2 px-3 font-mono text-muted-foreground">
                            {formatBytes(f.size)}
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {Math.round((f.progress || 0) * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end bg-elevated/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTorrent(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
