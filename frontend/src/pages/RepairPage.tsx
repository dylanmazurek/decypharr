import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const RepairPage: React.FC = () => {
  const { addToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [reacquiring, setReacquiring] = useState(false);
  const [report, setReport] = useState<any[] | null>(null);

  const loadHealth = async () => {
    try {
      const res = await api.getRepairHealth();
      if (Array.isArray(res)) {
        setReport(res);
      }
    } catch {
      // ignore on initial load
    }
  };

  React.useEffect(() => {
    loadHealth();
  }, []);

  const handleRunCheck = async () => {
    setChecking(true);
    try {
      await api.runRepair({ force: true });
      const res = await api.getRepairHealth();
      setReport(Array.isArray(res) ? res : (res as any)?.items || []);
      addToast('Health check complete', 'success');
    } catch (err: any) {
      addToast(err.message || 'Health check failed', 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleReacquire = async (entryOrHash?: string) => {
    setReacquiring(true);
    try {
      if (entryOrHash) {
        await api.fixBroken([entryOrHash]);
        addToast(`Repair fix triggered for ${entryOrHash}`, 'success');
      } else {
        await api.fixBroken([]);
        addToast('Repair fix triggered for all broken entries', 'success');
      }
      await loadHealth();
    } catch (err: any) {
      addToast(err.message || 'Action failed', 'error');
    } finally {
      setReacquiring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <i className="bi bi-tools text-2xl text-warning"></i>
          <div>
            <h2 className="text-xl font-bold">Repair & Health Check</h2>
            <p className="text-xs text-base-content/60">
              Verify integrity of downloaded media files and reacquire broken or missing torrents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn btn-primary btn-sm"
            onClick={handleRunCheck}
            disabled={checking}
          >
            {checking ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <i className="bi bi-shield-check"></i>
            )}
            Run Health Check
          </button>
          <button
            className="btn btn-warning btn-sm"
            onClick={() => handleReacquire()}
            disabled={reacquiring}
          >
            {reacquiring ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <i className="bi bi-arrow-repeat"></i>
            )}
            Reacquire All Broken
          </button>
        </div>
      </div>

      <div className="bg-base-100 rounded-xl border border-base-300 p-4">
        {checking ? (
          <div className="text-center py-16">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm opacity-70 mt-3">Scanning media files for integrity...</p>
          </div>
        ) : report === null ? (
          <div className="text-center py-16 text-base-content/60">
            <i className="bi bi-clipboard-pulse text-5xl block mb-3 opacity-40"></i>
            <p className="font-medium">No scan report available</p>
            <p className="text-xs opacity-70 mt-1">
              Click &quot;Run Health Check&quot; above to scan your storage for corrupted or missing media.
            </p>
          </div>
        ) : report.length === 0 ? (
          <div className="text-center py-16 text-success">
            <i className="bi bi-check-circle-fill text-5xl block mb-3"></i>
            <p className="font-bold text-lg">All files are healthy!</p>
            <p className="text-xs opacity-70 mt-1">No missing or corrupted files were detected.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="border-b border-base-300">
                  <th>Status</th>
                  <th>Path / Title</th>
                  <th>Message</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {report.map((item, idx) => (
                  <tr key={idx} className="hover:bg-base-200/50">
                    <td>
                      <span
                        className={`badge badge-sm uppercase ${
                          item.status === 'ok' || item.status === 'healthy'
                            ? 'badge-success'
                            : item.status === 'corrupt' || item.status === 'broken'
                            ? 'badge-error'
                            : item.status === 'repairing'
                            ? 'badge-info'
                            : 'badge-warning'
                        }`}
                      >
                        {item.status || 'Issue'}
                      </span>
                    </td>
                    <td className="font-mono text-xs max-w-md truncate" title={item.entry_name || item.path}>
                      {item.entry_name || item.path}
                    </td>
                    <td className="text-xs opacity-70">{item.failure_reason || item.message || '-'}</td>
                    <td className="text-right">
                      {(item.entry_name || item.torrent_hash) && (
                        <button
                          className="btn btn-xs btn-outline btn-warning"
                          onClick={() => handleReacquire(item.entry_name || item.torrent_hash)}
                          disabled={reacquiring}
                        >
                          Fix / Reacquire
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
