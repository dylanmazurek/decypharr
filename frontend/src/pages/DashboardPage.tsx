import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { TorrentItem, TorrentFile } from '../types';
import { useToast } from '../context/ToastContext';

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
      // Don't show toast on routine polling errors
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
    torrents.forEach((t) => {
      dlTotal += t.dlspeed || 0;
      upTotal += t.upspeed || 0;
    });
    return {
      total: torrents.length,
      dlTotal,
      upTotal,
    };
  }, [torrents]);

  return (
    <div className="space-y-4">
      {/* Top action toolbar & status summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-base-100 p-4 rounded-xl border border-base-300">
        <div className="flex flex-wrap items-center gap-2">
          <div className="join join-horizontal">
            <button
              className={`join-item btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter('all')}
            >
              All ({torrents.length})
            </button>
            <button
              className={`join-item btn btn-sm ${filter === 'downloading' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter('downloading')}
            >
              Downloading
            </button>
            <button
              className={`join-item btn btn-sm ${filter === 'completed' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
            <button
              className={`join-item btn btn-sm ${filter === 'paused' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter('paused')}
            >
              Paused
            </button>
          </div>

          {Object.keys(categories).length > 0 && (
            <select
              className="select select-sm select-bordered"
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

        {/* Global Transfer Speed */}
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-1 text-primary">
            <i className="bi bi-arrow-down"></i>
            <span>{formatSpeed(stats.dlTotal)}</span>
          </div>
          <div className="flex items-center gap-1 text-secondary">
            <i className="bi bi-arrow-up"></i>
            <span>{formatSpeed(stats.upTotal)}</span>
          </div>
        </div>
      </div>

      {/* Batch action bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-base-100 p-3 rounded-xl border border-base-300">
        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm btn-outline btn-success"
            disabled={selectedHashes.size === 0}
            onClick={handleResume}
            title="Resume"
          >
            <i className="bi bi-play-fill text-lg"></i>
          </button>
          <button
            className="btn btn-sm btn-outline btn-warning"
            disabled={selectedHashes.size === 0}
            onClick={handlePause}
            title="Pause"
          >
            <i className="bi bi-pause-fill text-lg"></i>
          </button>
          <button
            className="btn btn-sm btn-outline btn-error"
            disabled={selectedHashes.size === 0}
            onClick={() => setShowDeleteModal(true)}
            title="Delete"
          >
            <i className="bi bi-trash-fill"></i>
          </button>
          <button
            className="btn btn-sm btn-outline"
            disabled={selectedHashes.size === 0}
            onClick={handleRecheck}
            title="Force Recheck"
          >
            <i className="bi bi-arrow-repeat"></i>
          </button>
          {selectedHashes.size > 0 && (
            <span className="text-xs text-base-content/70 ml-2">
              {selectedHashes.size} selected
            </span>
          )}
        </div>

        <div className="relative">
          <i className="bi bi-search absolute left-3 top-2.5 text-base-content/50"></i>
          <input
            type="text"
            placeholder="Search torrents..."
            className="input input-sm input-bordered pl-9 w-full sm:w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Torrents Table */}
      <div className="bg-base-100 rounded-xl border border-base-300 overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr className="border-b border-base-300 bg-base-200/50">
              <th className="w-10">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={
                    filteredTorrents.length > 0 &&
                    selectedHashes.size === filteredTorrents.length
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th>Name</th>
              <th className="w-24">Size</th>
              <th className="w-36">Progress</th>
              <th className="w-24">Status</th>
              <th className="w-24">DL Speed</th>
              <th className="w-20">ETA</th>
              <th className="w-16">Seeds</th>
              <th className="w-16">Peers</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-12">
                  <span className="loading loading-spinner loading-md"></span>
                </td>
              </tr>
            ) : filteredTorrents.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-base-content/60">
                  <i className="bi bi-inbox text-4xl block mb-2 opacity-40"></i>
                  No torrents found
                </td>
              </tr>
            ) : (
              filteredTorrents.map((t) => {
                const isSelected = selectedHashes.has(t.hash);
                const progressPct = Math.round((t.progress || 0) * 100);
                return (
                  <tr
                    key={t.hash}
                    className={`hover:bg-base-200/40 cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                    onClick={() => viewDetails(t)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={isSelected}
                        onChange={() => toggleSelect(t.hash)}
                      />
                    </td>
                    <td className="font-medium max-w-xs truncate" title={t.name}>
                      {t.name}
                      {t.category && (
                        <span className="badge badge-xs badge-neutral ml-2">
                          {t.category}
                        </span>
                      )}
                    </td>
                    <td>{formatBytes(t.size)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <progress
                          className={`progress w-20 ${
                            t.progress === 1 ? 'progress-success' : 'progress-primary'
                          }`}
                          value={progressPct}
                          max="100"
                        ></progress>
                        <span className="text-xs">{progressPct}%</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm uppercase text-[10px] ${
                          t.state.includes('download')
                            ? 'badge-primary'
                            : t.state.includes('upload') || t.state.includes('seed')
                            ? 'badge-success'
                            : t.state.includes('pause')
                            ? 'badge-warning'
                            : t.state.includes('error')
                            ? 'badge-error'
                            : 'badge-ghost'
                        }`}
                      >
                        {t.state}
                      </span>
                    </td>
                    <td>{formatSpeed(t.dlspeed)}</td>
                    <td>{formatEta(t.eta)}</td>
                    <td>{t.num_seeds ?? '-'}</td>
                    <td>{t.num_leechs ?? '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error flex items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill"></i> Delete Torrents
            </h3>
            <p className="py-4">
              Are you sure you want to delete {selectedHashes.size} selected torrent(s)?
            </p>
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-error checkbox-sm"
                  checked={deleteFiles}
                  onChange={(e) => setDeleteFiles(e.target.checked)}
                />
                <span className="label-text">Also delete downloaded files from disk</span>
              </label>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Torrent Details Drawer/Modal */}
      {selectedTorrent && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start border-b border-base-300 pb-3">
              <div>
                <h3 className="font-bold text-lg truncate max-w-xl" title={selectedTorrent.name}>
                  {selectedTorrent.name}
                </h3>
                <div className="text-xs text-base-content/60 font-mono mt-1">
                  Hash: {selectedTorrent.hash}
                </div>
              </div>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setSelectedTorrent(null)}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4 text-xs">
              <div className="bg-base-200/60 p-2.5 rounded-lg">
                <div className="opacity-60">Size</div>
                <div className="font-bold text-sm">{formatBytes(selectedTorrent.size)}</div>
              </div>
              <div className="bg-base-200/60 p-2.5 rounded-lg">
                <div className="opacity-60">Status</div>
                <div className="font-bold text-sm uppercase">{selectedTorrent.state}</div>
              </div>
              <div className="bg-base-200/60 p-2.5 rounded-lg">
                <div className="opacity-60">DL Speed</div>
                <div className="font-bold text-sm text-primary">
                  {formatSpeed(selectedTorrent.dlspeed)}
                </div>
              </div>
              <div className="bg-base-200/60 p-2.5 rounded-lg">
                <div className="opacity-60">UP Speed</div>
                <div className="font-bold text-sm text-secondary">
                  {formatSpeed(selectedTorrent.upspeed)}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h4 className="font-semibold text-sm mb-2">Files ({files.length})</h4>
              {loadingFiles ? (
                <div className="text-center py-6">
                  <span className="loading loading-spinner loading-sm"></span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-sm opacity-60 italic py-4">No file details available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-xs w-full">
                    <thead>
                      <tr className="border-b border-base-300">
                        <th>File Name</th>
                        <th className="w-24">Size</th>
                        <th className="w-32">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((f, idx) => (
                        <tr key={idx} className="hover:bg-base-200/50">
                          <td className="max-w-md truncate" title={f.name}>
                            {f.name}
                          </td>
                          <td>{formatBytes(f.size)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <progress
                                className="progress progress-primary w-16"
                                value={Math.round((f.progress || 0) * 100)}
                                max="100"
                              ></progress>
                              <span className="text-[11px]">
                                {Math.round((f.progress || 0) * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-action border-t border-base-300 pt-3">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setSelectedTorrent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
