'use client';

export function SyncStatus({ connected }: { connected: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${connected
          ? 'text-board-success bg-board-badge'
          : 'text-board-danger bg-board-badge'
        }`}
      title={connected ? 'Live' : 'Disconnected'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-board-success' : 'bg-board-danger'}`} />
      {connected ? 'Live' : 'Offline'}
    </div>
  );
}
