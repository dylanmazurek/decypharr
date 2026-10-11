import React, { useState } from 'react';
import { api, getMeta, apiUrl } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle, AlertOctagon, User, Folder, Key } from 'lucide-react';

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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-xl p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center text-center">
            <img src="./images/logo.png" alt="Decypharr" className="w-14 h-14 mb-3 object-contain" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome to Decypharr</h2>
            <p className="text-xs text-muted-foreground mt-1">Initial System Setup Wizard</p>
          </div>

          {meta.setupError && (
            <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive-text text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{meta.setupError}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
                <User className="w-3.5 h-3.5" />
                <span>1. Admin Credentials</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Admin Username</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 text-xs rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Admin Password</label>
                  <input
                    type="password"
                    className="w-full h-9 px-3 text-xs rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                  <input
                    type="password"
                    className="w-full h-9 px-3 text-xs rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
                <Folder className="w-3.5 h-3.5" />
                <span>2. Storage Paths</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Download Directory</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    value={downloadPath}
                    onChange={(e) => setDownloadPath(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Watch Directory</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    value={watchPath}
                    onChange={(e) => setWatchPath(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
                <Key className="w-3.5 h-3.5" />
                <span>3. Debrid Provider (Optional)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Provider</label>
                  <select
                    className="w-full h-9 px-3 text-xs rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    value={debridProvider}
                    onChange={(e) => setDebridProvider(e.target.value)}
                  >
                    <option value="realdebrid">Real-Debrid</option>
                    <option value="torbox">TorBox</option>
                    <option value="alldebrid">AllDebrid</option>
                    <option value="premiumize">Premiumize</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">API Key / Token</label>
                  <input
                    type="password"
                    placeholder="Optional token"
                    className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    value={debridKey}
                    onChange={(e) => setDebridKey(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center"
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Complete Setup'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
