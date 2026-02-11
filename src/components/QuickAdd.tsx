'use client';

import { useState, useRef } from 'react';

interface QuickAddProps {
  onAdd: (title: string) => void;
}

export function QuickAdd({ onAdd }: QuickAddProps) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const title = value.trim();
    if (!title || submitting) return;
    setSubmitting(true);
    setValue('');
    try {
      onAdd(title);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-shrink-0 px-2.5 py-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') {
            setValue('');
            inputRef.current?.blur();
          }
        }}
        placeholder="+ Add a task..."
        className="w-full px-3 py-2 text-[13px] rounded-md bg-transparent border border-transparent
          hover:bg-board-hover focus:bg-board-card focus:border-board-accent
          text-board-text placeholder:text-board-text-tertiary
          outline-none transition-all duration-150"
      />
    </div>
  );
}
