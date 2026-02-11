'use client';

import { useState } from 'react';
import { ChecklistItem } from '@/types/kanban';

interface ChecklistProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

export function Checklist({ items, onChange }: ChecklistProps) {
  const [newItem, setNewItem] = useState('');
  const completed = items.filter(i => i.completed).length;

  const toggle = (id: string) => {
    onChange(items.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  const remove = (id: string) => {
    onChange(items.filter(i => i.id !== id));
  };

  const add = () => {
    const text = newItem.trim();
    if (!text) return;
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    onChange([...items, { id, text, completed: false }]);
    setNewItem('');
  };

  const pct = items.length > 0 ? (completed / items.length) * 100 : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-board-text-secondary uppercase tracking-wider">
          Checklist
        </span>
        {items.length > 0 && (
          <span className="text-xs font-medium text-board-text-tertiary">
            {completed}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="w-full h-1 rounded-full bg-board-badge overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              pct === 100 ? 'bg-board-success' : 'bg-board-accent'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="space-y-0.5">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2.5 group py-1 px-1 -mx-1 rounded hover:bg-board-hover transition-colors">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggle(item.id)}
              className="w-4 h-4 rounded border-board-border text-board-accent focus:ring-board-accent
                focus:ring-offset-0 cursor-pointer"
            />
            <span className={`flex-1 text-sm ${item.completed ? 'line-through text-board-text-tertiary' : 'text-board-text'}`}>
              {item.text}
            </span>
            <button
              onClick={() => remove(item.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-board-text-tertiary
                hover:text-board-danger transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <input
        type="text"
        value={newItem}
        onChange={e => setNewItem(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') add(); }}
        placeholder="Add item..."
        className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-board-border bg-transparent
          text-board-text placeholder:text-board-text-tertiary outline-none
          focus:border-board-accent transition-colors"
      />
    </div>
  );
}
