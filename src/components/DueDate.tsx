'use client';

import { formatDistanceToNow, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

export function DueDate({ date }: { date: string }) {
  const d = parseISO(date);
  const overdue = isPast(d) && !isToday(d);

  let text: string;
  if (isToday(d)) text = 'Today';
  else if (isTomorrow(d)) text = 'Tomorrow';
  else text = formatDistanceToNow(d, { addSuffix: true });

  const styles = overdue
    ? 'text-red-400 bg-red-900/20'
    : isToday(d)
      ? 'text-amber-400 bg-amber-900/20'
      : 'text-board-text-tertiary bg-board-badge';

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${styles}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {text}
    </span>
  );
}
