import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { DecypharrConfig } from '../types';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <i className="bi bi-gear text-2xl text-primary"></i>
          <div>
            <h2 className="text-xl font-bold">Settings & Configuration</h2>
            <p className="text-xs text-base-content/60">
              Manage download directories, debrid providers, and server parameters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`btn btn-sm ${jsonMode ? 'btn-neutral' : 'btn-outline'}`}
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
            <i className="bi bi-code-slash mr-1"></i>
            {jsonMode ? 'Form View' : 'Raw JSON'}
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm min-w-[100px]"
            onClick={() => handleSave()}
            disabled={saving || loading}
          >
            {saving ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <i className="bi bi-save mr-1"></i>
            )}
            Save
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : jsonMode ? (
        <div className="bg-base-100 rounded-xl border border-base-300 p-4">
          <textarea
            className="textarea textarea-bordered w-full h-[600px] font-mono text-xs leading-relaxed"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
          ></textarea>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* General / Server */}
          <div className="bg-base-100 rounded-xl border border-base-300 p-5 space-y-4">
            <h3 className="font-bold text-base border-b border-base-300 pb-2 flex items-center gap-2">
              <i className="bi bi-hdd-network text-primary"></i> Server & Network
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-xs">Port</span>
                </label>
                <input
                  type="number"
                  className="input input-sm input-bordered"
                  value={config.port ?? 8080}
                  onChange={(e) => updateField(['port'], parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-xs">Bind Address</span>
                </label>
                <input
                  type="text"
                  className="input input-sm input-bordered"
                  value={config.bind_address ?? '0.0.0.0'}
                  onChange={(e) => updateField(['bind_address'], e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-xs">URL Base</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. /decypharr"
                  className="input input-sm input-bordered"
                  value={config.url_base ?? ''}
                  onChange={(e) => updateField(['url_base'], e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Storage Paths */}
          <div className="bg-base-100 rounded-xl border border-base-300 p-5 space-y-4">
            <h3 className="font-bold text-base border-b border-base-300 pb-2 flex items-center gap-2">
              <i className="bi bi-folder text-warning"></i> Directories & Storage
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-xs">Download Path</span>
                </label>
                <input
                  type="text"
                  className="input input-sm input-bordered"
                  value={config.download_path ?? ''}
                  onChange={(e) => updateField(['download_path'], e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-xs">Watch Path</span>
                </label>
                <input
                  type="text"
                  className="input input-sm input-bordered"
                  value={config.watch_path ?? ''}
                  onChange={(e) => updateField(['watch_path'], e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Debrid Provider Settings */}
          <div className="bg-base-100 rounded-xl border border-base-300 p-5 space-y-4">
            <h3 className="font-bold text-base border-b border-base-300 pb-2 flex items-center gap-2">
              <i className="bi bi-cloud-arrow-down text-info"></i> Debrid Providers
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-xs">Real-Debrid API Key</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="input input-sm input-bordered font-mono"
                  value={config.real_debrid_key ?? config.debrid?.realdebrid?.api_key ?? ''}
                  onChange={(e) => updateField(['real_debrid_key'], e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-xs">TorBox API Key</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="input input-sm input-bordered font-mono"
                  value={config.torbox_key ?? config.debrid?.torbox?.api_key ?? ''}
                  onChange={(e) => updateField(['torbox_key'], e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-xs">AllDebrid API Key</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="input input-sm input-bordered font-mono"
                  value={config.alldebrid_key ?? config.debrid?.alldebrid?.api_key ?? ''}
                  onChange={(e) => updateField(['alldebrid_key'], e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-xs">Premiumize API Key</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="input input-sm input-bordered font-mono"
                  value={config.premiumize_key ?? config.debrid?.premiumize?.api_key ?? ''}
                  onChange={(e) => updateField(['premiumize_key'], e.target.value)}
                />
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
