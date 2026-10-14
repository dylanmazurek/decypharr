import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useRouter } from '../context/RouterContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { UploadCloud, Link as LinkIcon, FileUp } from 'lucide-react';

export const DownloadPage: React.FC = () => {
  const { addToast } = useToast();
  const { navigate } = useRouter();
  const [urls, setUrls] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [savePath, setSavePath] = useState('');
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urls.trim() && !file) {
      addToast('Please provide a magnet link / URL or upload a .torrent file', 'warning');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (urls.trim()) {
        formData.append('urls', urls.trim());
      }
      if (file) {
        formData.append('torrents', file);
      }
      if (category) {
        formData.append('category', category);
      }
      if (savePath.trim()) {
        formData.append('savepath', savePath.trim());
      }
      if (paused) {
        formData.append('paused', 'true');
      }

      await api.addTorrent(formData);
      addToast('Torrent added successfully', 'success');
      navigate('/');
    } catch (err: any) {
      addToast(err.message || 'Failed to add torrent', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Add Torrents"
        subtitle="Queue downloads via Magnet links, HTTP URLs, or .torrent files"
      />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Magnet / URLs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                Magnet Links or URLs
              </label>
              <span className="text-[11px] font-mono text-muted-foreground">One per line</span>
            </div>
            <textarea
              className="w-full h-28 p-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              placeholder="magnet:?xt=urn:btih:..."
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
            />
          </div>

          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative px-3 text-[11px] font-semibold uppercase tracking-wider bg-card text-muted-foreground">
              OR
            </span>
          </div>

          {/* File Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileUp className="w-3.5 h-3.5" />
              Upload .torrent File
            </label>
            <input
              type="file"
              accept=".torrent"
              className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-border file:text-xs file:font-medium file:bg-elevated file:text-foreground hover:file:bg-raised file:cursor-pointer p-1.5 rounded-lg bg-elevated/40 border border-border"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Category & Save Path */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              {Object.keys(categories).length > 0 ? (
                <select
                  className="w-full h-9 px-3 text-xs rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">(None)</option>
                  {Object.keys(categories).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. movies, tv"
                  className="w-full h-9 px-3 text-xs rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Custom Save Path
                </label>
                <span className="text-[11px] text-muted-foreground">Optional</span>
              </div>
              <input
                type="text"
                placeholder="/downloads/custom"
                className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
              />
            </div>
          </div>

          {/* Options */}
          <div className="pt-1">
            <label className="flex items-center gap-3 p-3 rounded-lg bg-elevated/60 border border-border cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-border accent-primary cursor-pointer"
                checked={paused}
                onChange={(e) => setPaused(e.target.checked)}
              />
              <span className="text-xs text-foreground font-medium">
                Add torrent in paused state
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="min-w-[120px]"
            >
              <UploadCloud className="w-4 h-4" />
              {loading ? 'Adding...' : 'Add Torrent'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
