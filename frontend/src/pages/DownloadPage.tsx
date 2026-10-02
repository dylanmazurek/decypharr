import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useRouter } from '../context/RouterContext';

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
      <div className="flex items-center gap-3">
        <i className="bi bi-cloud-download text-2xl text-primary"></i>
        <div>
          <h2 className="text-xl font-bold">Add Torrents</h2>
          <p className="text-xs text-base-content/60">
            Download files via Magnet links, HTTP URLs, or .torrent files
          </p>
        </div>
      </div>

      <div className="bg-base-100 rounded-xl border border-base-300 p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Magnet Links or URLs</span>
              <span className="label-text-alt text-base-content/50">One per line</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-28 font-mono text-xs"
              placeholder="magnet:?xt=urn:btih:..."
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
            ></textarea>
          </div>

          <div className="divider text-xs text-base-content/50 uppercase">OR</div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Upload .torrent File</span>
            </label>
            <input
              type="file"
              accept=".torrent"
              className="file-input file-input-bordered file-input-primary w-full"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Category</span>
              </label>
              {Object.keys(categories).length > 0 ? (
                <select
                  className="select select-bordered w-full"
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
                  className="input input-bordered w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Custom Save Path</span>
                <span className="label-text-alt text-base-content/50">Optional</span>
              </label>
              <input
                type="text"
                placeholder="/downloads/custom"
                className="input input-bordered w-full"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={paused}
                onChange={(e) => setPaused(e.target.checked)}
              />
              <span className="label-text">Add torrent in paused state</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary min-w-[120px]"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Add Torrent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
