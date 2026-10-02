import React, { useState, useEffect, useCallback } from 'react';
import { api, apiUrl } from '../services/api';
import { BrowseItem } from '../types';
import { useToast } from '../context/ToastContext';

export const BrowsePage: React.FC = () => {
  const { addToast } = useToast();
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const data = await api.browse(path);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setCurrentPath(data?.path || path);
    } catch (err: any) {
      addToast(err.message || 'Failed to browse directory', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadDirectory('');
  }, [loadDirectory]);

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleItemClick = (item: BrowseItem) => {
    if (item.is_dir) {
      handleNavigate(item.path);
    } else {
      // Direct file download/view link
      const downloadLink = apiUrl(`/webdav/${item.path.replace(/^\//, '')}`);
      window.open(downloadLink, '_blank');
    }
  };

  const breadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    return (
      <div className="text-sm breadcrumbs">
        <ul>
          <li>
            <button
              className="text-primary hover:underline font-semibold"
              onClick={() => handleNavigate('')}
            >
              <i className="bi bi-house mr-1"></i> Root
            </button>
          </li>
          {parts.map((p, idx) => {
            const subPath = parts.slice(0, idx + 1).join('/');
            const isLast = idx === parts.length - 1;
            return (
              <li key={subPath}>
                {isLast ? (
                  <span className="font-semibold">{p}</span>
                ) : (
                  <button
                    className="text-primary hover:underline"
                    onClick={() => handleNavigate(subPath)}
                  >
                    {p}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-4 rounded-xl border border-base-300">
        <div>{breadcrumbs()}</div>
        <div className="relative">
          <i className="bi bi-search absolute left-3 top-2.5 text-base-content/50"></i>
          <input
            type="text"
            placeholder="Filter files..."
            className="input input-sm input-bordered pl-9 w-full sm:w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-base-100 rounded-xl border border-base-300 overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr className="border-b border-base-300 bg-base-200/50">
              <th>Name</th>
              <th className="w-28">Size</th>
              <th className="w-44">Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-12">
                  <span className="loading loading-spinner loading-md"></span>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-base-content/60">
                  <i className="bi bi-folder-x text-4xl block mb-2 opacity-40"></i>
                  Folder is empty
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.path}
                  className="hover:bg-base-200/50 cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <td className="font-medium flex items-center gap-2 max-w-lg truncate">
                    {item.is_dir ? (
                      <i className="bi bi-folder-fill text-warning text-lg"></i>
                    ) : (
                      <i className="bi bi-file-earmark-text text-primary text-lg"></i>
                    )}
                    <span className="truncate">{item.name}</span>
                  </td>
                  <td>{item.is_dir ? '-' : formatBytes(item.size)}</td>
                  <td className="text-xs opacity-70">
                    {item.mod_time ? new Date(item.mod_time).toLocaleString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
