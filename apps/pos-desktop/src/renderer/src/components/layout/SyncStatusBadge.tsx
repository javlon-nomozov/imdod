import { useEffect, useState } from 'react';
import { useT } from '../../i18n/useT';

interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
}

/** `PosScreen` sarlavhasida — kassir tarmoq holatini doim ko'rib turishi uchun. */
export function SyncStatusBadge() {
  const { t, interpolate } = useT();
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    void window.imdod.getSyncStatus().then(setStatus);
    return window.imdod.onSyncStatusChange(setStatus);
  }, []);

  if (!status) return null;

  const label = status.syncing ? t.sync.syncing : status.online ? t.sync.online : t.sync.offline;
  const dotColor = status.syncing ? 'bg-amber-400' : status.online ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span>{label}</span>
      {status.pendingCount > 0 && (
        <span>{interpolate(t.sync.pending, { count: status.pendingCount })}</span>
      )}
      {status.lastSyncAt && (
        <span>
          {interpolate(t.sync.lastSync, { time: new Date(status.lastSyncAt).toLocaleTimeString('uz-UZ') })}
        </span>
      )}
    </div>
  );
}
