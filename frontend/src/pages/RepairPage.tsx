import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';

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
      <PageHeader
        title="Repair & Health Check"
        subtitle="Verify integrity of downloaded media files and reacquire broken torrents"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReacquire()}
              disabled={reacquiring}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {reacquiring ? 'Reacquiring...' : 'Reacquire All Broken'}
            </Button>
            {/* Exactly one primary amber button per screen */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunCheck}
              disabled={checking}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {checking ? 'Scanning...' : 'Run Health Check'}
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden p-0">
        {checking ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-foreground mt-3">Scanning media files for integrity...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a moment depending on library size</p>
          </div>
        ) : report === null ? (
          <div className="text-center py-20 text-muted-foreground">
            <ClipboardCheck className="w-10 h-10 mx-auto opacity-30 mb-3" />
            <p className="font-medium text-foreground">No scan report available</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Click &quot;Run Health Check&quot; above to scan your storage for corrupted or missing media files.
            </p>
          </div>
        ) : report.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
            <p className="font-semibold text-foreground text-base">All files are healthy!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No corrupted, damaged, or missing files were detected in your media storage.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-elevated/70 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
                  <th className="py-2.5 px-4 w-28">Status</th>
                  <th className="py-2.5 px-4">Path / Title</th>
                  <th className="py-2.5 px-4">Message</th>
                  <th className="py-2.5 px-4 text-right w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.map((item, idx) => {
                  const isHealthy = item.status === 'ok' || item.status === 'healthy';
                  const isCorrupt = item.status === 'corrupt' || item.status === 'broken';

                  return (
                    <tr key={idx} className="hover:bg-elevated/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border',
                            isHealthy
                              ? 'bg-success/10 border-success/30 text-success'
                              : isCorrupt
                              ? 'bg-destructive/10 border-destructive/30 text-destructive-text'
                              : 'bg-warning/10 border-warning/30 text-warning'
                          )}
                        >
                          {item.status || 'Issue'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs max-w-md truncate text-foreground" title={item.entry_name || item.path}>
                        {item.entry_name || item.path}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">
                        {item.failure_reason || item.message || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {(item.entry_name || item.torrent_hash) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReacquire(item.entry_name || item.torrent_hash)}
                            disabled={reacquiring}
                            className="text-xs h-7 px-2"
                          >
                            <AlertTriangle className="w-3 h-3 text-warning" />
                            Fix
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
