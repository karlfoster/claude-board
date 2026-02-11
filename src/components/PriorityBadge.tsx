'use client';

import { Priority } from '@/types/kanban';

const config: Record<Priority, { bg: string; text: string; label: string; pulse?: boolean }> = {
  none: { bg: '', text: '', label: '' },
  low: { bg: 'bg-stone-800/50', text: 'text-stone-400', label: 'Low' },
  medium: { bg: 'bg-sky-900/25', text: 'text-sky-400', label: 'Medium' },
  high: { bg: 'bg-amber-900/25', text: 'text-amber-400', label: 'High' },
  urgent: { bg: 'bg-red-900/25', text: 'text-red-400', label: 'Urgent', pulse: true },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === 'none') return null;
  const { bg, text, label, pulse } = config[priority];

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${bg} ${pulse ? 'animate-pulse-urgent' : ''}`}>
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${text}`}>
        {label}
      </span>
    </span>
  );
}
