'use client';

import { Label } from '@/types/kanban';

export function LabelPill({ label }: { label: Label }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none"
      style={{
        backgroundColor: `${label.color}18`,
        color: label.color,
      }}
    >
      {label.name}
    </span>
  );
}
