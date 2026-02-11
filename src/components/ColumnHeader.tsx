'use client';

import { useState, useRef, useEffect } from 'react';

interface ColumnHeaderProps {
  title: string;
  count: number;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function ColumnHeader({ title, count, onRename, onDelete }: ColumnHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setValue(title);
  }, [title]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) {
      onRename(trimmed);
    } else {
      setValue(title);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between px-3 py-3">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setValue(title); setEditing(false); }
            }}
            className="flex-1 text-[13px] font-semibold bg-transparent border-b border-board-accent
              text-board-text outline-none px-0 py-0"
          />
        ) : (
          <h3
            onDoubleClick={() => setEditing(true)}
            className="text-[13px] font-semibold text-board-text-secondary uppercase tracking-wider truncate cursor-default"
          >
            {title}
          </h3>
        )}
        <span className="flex-shrink-0 text-[11px] font-medium text-board-text-tertiary bg-board-badge
          w-5 h-5 rounded-full flex items-center justify-center">
          {count}
        </span>
      </div>

      <div className="relative ml-1">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded-md hover:bg-board-hover text-board-text-tertiary
            hover:text-board-text-secondary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-20 w-40 bg-board-card border border-board-border
              rounded-lg shadow-lg py-1 overflow-hidden">
              <button
                onClick={() => { setEditing(true); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-board-text hover:bg-board-hover transition-colors"
              >
                Rename
              </button>
              <button
                onClick={() => { onDelete(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-board-danger hover:bg-board-hover transition-colors"
              >
                Delete column
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
