import React, { useState } from 'react';
import { api, getMeta, apiUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

export const SetupPage: React.FC = () => {
  const meta = getMeta();
  const { addToast } = useToast();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [downloadPath, setDownloadPath] = useState('/downloads');
  const [watchPath, setWatchPath] = useState('/watch');
  const [debridProvider, setDebridProvider] = useState('realdebrid');
  const [debridKey, setDebridKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      addToast('Please provide an admin password', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('download_path', downloadPath);
      formData.append('watch_path', watchPath);
      formData.append('debrid_provider', debridProvider);
      formData.append('debrid_key', debridKey);

      await api.submitSetup(formData);
      addToast('Setup completed successfully! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = apiUrl('/');
      }, 1000);
    } catch (err: any) {
      addToast(err.message || 'Setup submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-xl bg-base-100 shadow-xl border border-base-300">
        <form onSubmit={handleSubmit} className="card-body">
          <div className="flex flex-col items-center mb-4">
            <img src="./images/logo.png" alt="Decypharr" className="w-16 h-16 mb-2 object-contain" />
            <h2 className="card-title text-2xl font-bold">Welcome to Decypharr</h2>
            <p className="text-xs text-base-content/60">Initial System Setup Wizard</p>
          </div>

          {meta.setupError && (
            <div className="alert alert-error text-xs mb-4">
              <i className="bi bi-exclamation-octagon"></i>
              <span>{meta.setupError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="divider text-xs uppercase font-semibold text-primary">1. Admin Credentials</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs">Admin Username</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs">Admin Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered input-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-control sm:col-span-2">
                <label className="label">
                  <span className="label-text text-xs">Confirm Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered input-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="divider text-xs uppercase font-semibold text-primary">2. Storage Paths</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs">Download Directory</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  value={downloadPath}
                  onChange={(e) => setDownloadPath(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs">Watch Directory</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  value={watchPath}
                  onChange={(e) => setWatchPath(e.target.value)}
                />
              </div>
            </div>

            <div className="divider text-xs uppercase font-semibold text-primary">3. Debrid Provider (Optional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs">Provider</span>
                </label>
                <select
                  className="select select-bordered select-sm"
                  value={debridProvider}
                  onChange={(e) => setDebridProvider(e.target.value)}
                >
                  <option value="realdebrid">Real-Debrid</option>
                  <option value="torbox">TorBox</option>
                  <option value="alldebrid">AllDebrid</option>
                  <option value="premiumize">Premiumize</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs">API Key / Token</span>
                </label>
                <input
                  type="password"
                  placeholder="Optional token"
                  className="input input-bordered input-sm font-mono"
                  value={debridKey}
                  onChange={(e) => setDebridKey(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card-actions justify-end mt-6">
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
