import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { DecypharrConfig } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Save,
  Code2,
  Server,
  Folder,
  Key,
  LayoutGrid,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { addToast } = useToast();
  const [config, setConfig] = useState<DecypharrConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [rawJson, setRawJson] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getConfig();
      setConfig(data || {});
      setRawJson(JSON.stringify(data || {}, null, 2));
    } catch (err: any) {
      addToast(err.message || 'Failed to load configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      let toSave = config;
      if (jsonMode) {
        try {
          toSave = JSON.parse(rawJson);
        } catch {
          throw new Error('Invalid JSON format in editor');
        }
      }
      await api.updateConfig(toSave);
      setConfig(toSave);
      setRawJson(JSON.stringify(toSave, null, 2));
      addToast('Configuration saved successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path: string[], value: any) => {
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let current = next;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Manage directories, network bindings, and debrid providers"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!jsonMode) {
                  setRawJson(JSON.stringify(config, null, 2));
                } else {
                  try {
                    setConfig(JSON.parse(rawJson));
                  } catch {
                    // ignore
                  }
                }
                setJsonMode(!jsonMode);
              }}
            >
              {jsonMode ? (
                <>
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Form View
                </>
              ) : (
                <>
                  <Code2 className="w-3.5 h-3.5" />
                  Raw JSON
                </>
              )}
            </Button>

            {/* Single Primary Amber Button */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleSave()}
              disabled={saving || loading}
              className="min-w-[110px]"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card className="text-center py-16 text-muted-foreground">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-xs">Loading configuration...</p>
        </Card>
      ) : jsonMode ? (
        <Card className="p-4">
          <textarea
            className="w-full h-[600px] p-4 font-mono text-xs leading-relaxed rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
          />
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Server & Network */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Server className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">
                Server & Network
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Port
                </label>
                <input
                  type="number"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={config.port ?? 8080}
                  onChange={(e) => updateField(['port'], parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bind Address
                </label>
                <input
                  type="text"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={config.bind_address ?? '0.0.0.0'}
                  onChange={(e) => updateField(['bind_address'], e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  URL Base
                </label>
                <input
                  type="text"
                  placeholder="e.g. /decypharr"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={config.url_base ?? ''}
                  onChange={(e) => updateField(['url_base'], e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Directories & Storage */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Folder className="w-4 h-4 text-warning" />
              <h3 className="font-semibold text-sm text-foreground">
                Directories & Storage
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Download Path
                </label>
                <input
                  type="text"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={config.download_path ?? ''}
                  onChange={(e) => updateField(['download_path'], e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Watch Path
                </label>
                <input
                  type="text"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={config.watch_path ?? ''}
                  onChange={(e) => updateField(['watch_path'], e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Debrid Providers */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Key className="w-4 h-4 text-accent-foreground" />
              <h3 className="font-semibold text-sm text-foreground">
                Debrid Provider API Keys
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Real-Debrid API Key
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={config.real_debrid_key ?? config.debrid?.realdebrid?.api_key ?? ''}
                  onChange={(e) => updateField(['real_debrid_key'], e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  TorBox API Key
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={config.torbox_key ?? config.debrid?.torbox?.api_key ?? ''}
                  onChange={(e) => updateField(['torbox_key'], e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AllDebrid API Key
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={config.alldebrid_key ?? config.debrid?.alldebrid?.api_key ?? ''}
                  onChange={(e) => updateField(['alldebrid_key'], e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Premiumize API Key
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  value={config.premiumize_key ?? config.debrid?.premiumize?.api_key ?? ''}
                  onChange={(e) => updateField(['premiumize_key'], e.target.value)}
                />
              </div>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};
