import React, { useState, useEffect, useCallback } from 'react';
import { api, apiUrl } from '../services/api';
import { BrowseItem } from '../types';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Folder,
  File,
  Home,
  Search,
  ChevronRight,
  FolderOpen,
  RotateCw,
} from 'lucide-react';

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
      const list = Array.isArray(data?.entries)
        ? data.entries
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : [];
      setItems(list);
      setCurrentPath(data?.current_dir ?? (data as any)?.path ?? path);
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
      const downloadLink = apiUrl(`/webdav/${item.path.replace(/^\//, '')}`);
      window.open(downloadLink, '_blank');
    }
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

  const parts = currentPath.split('/').filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="File Browser"
        subtitle="Inspect and download media files stored on the server"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDirectory(currentPath)}
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Breadcrumb path toolbar & search */}
      <Card className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded bg-elevated hover:bg-raised text-foreground font-semibold transition-colors cursor-pointer"
            onClick={() => handleNavigate('')}
          >
            <Home className="w-3.5 h-3.5 text-primary" />
            <span>root</span>
          </button>
          {parts.map((p, idx) => {
            const subPath = parts.slice(0, idx + 1).join('/');
            const isLast = idx === parts.length - 1;
            return (
              <React.Fragment key={subPath}>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {isLast ? (
                  <span className="px-2 py-1 rounded bg-raised text-foreground font-semibold truncate max-w-xs">
                    {p}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="px-2 py-1 rounded hover:bg-elevated text-muted-foreground hover:text-foreground transition-colors cursor-pointer truncate max-w-xs"
                    onClick={() => handleNavigate(subPath)}
                  >
                    {p}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="relative w-full sm:w-60 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Filter files..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Directory Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-elevated/70 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4 w-32">Size</th>
                <th className="py-2.5 px-4 w-48">Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-16 text-muted-foreground">
                    <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-xs">Loading directory...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-16 text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="text-sm font-medium text-foreground">Folder is empty</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      No files or subdirectories found
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.path}
                    className="hover:bg-elevated/50 transition-colors cursor-pointer group"
                    onClick={() => handleItemClick(item)}
                  >
                    <td className="py-2.5 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2.5 max-w-xl truncate">
                        {item.is_dir ? (
                          <Folder className="w-4 h-4 text-warning shrink-0" />
                        ) : (
                          <File className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate group-hover:text-primary transition-colors">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                      {item.is_dir ? '-' : formatBytes(item.size)}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                      {item.mod_time ? new Date(item.mod_time).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
