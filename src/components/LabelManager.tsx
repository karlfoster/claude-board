'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Label } from '@/types/kanban';

interface LabelManagerProps {
    labels: Label[];
    onAddLabel: (name: string, color: string) => void;
    onUpdateLabel: (id: string, name: string, color: string) => void;
    onDeleteLabel: (id: string) => void;
    onClose: () => void;
}

const PRESET_COLORS = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#84cc16', // lime-500
    '#22c55e', // green-500
    '#10b981', // emerald-500
    '#06b6d4', // cyan-500
    '#0ea5e9', // sky-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#d946ef', // fuchsia-500
    '#f43f5e', // rose-500
    '#78716c', // stone-500
];

export function LabelManager({ labels, onAddLabel, onUpdateLabel, onDeleteLabel, onClose }: LabelManagerProps) {
    const [newLabelName, setNewLabelName] = useState('');
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[8]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleCreate = () => {
        if (!newLabelName.trim()) return;
        onAddLabel(newLabelName.trim(), selectedColor);
        setNewLabelName('');
        setSelectedColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{ isolation: 'isolate' }}>
            <div
                className="absolute inset-0 bg-[var(--modal-overlay)] backdrop-blur-[2px]"
                onClick={onClose}
            />

            <div
                ref={modalRef}
                className="relative bg-board-card border border-board-border rounded-lg shadow-2xl
          w-full max-w-md flex flex-col z-10 overflow-hidden"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-board-border">
                    <h2 className="text-lg font-semibold text-board-text">Manage Labels</h2>
                    <button
                        onClick={onClose}
                        className="text-board-text-tertiary hover:text-board-text transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Create New Label */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-board-text-secondary uppercase tracking-wider">
                            Create New Label
                        </h3>
                        <div className="flex gap-2">
                            <input
                                value={newLabelName}
                                onChange={e => setNewLabelName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                placeholder="Label name..."
                                className="flex-1 text-sm bg-board-input text-board-text rounded-md border border-board-border
                  px-3 py-2 outline-none focus:border-board-accent transition-colors"
                            />
                            <button
                                onClick={handleCreate}
                                disabled={!newLabelName.trim()}
                                className="px-4 py-2 bg-board-accent text-white rounded-md text-sm font-medium
                  hover:bg-board-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Create
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-board-accent ring-offset-board-card scale-110' : ''
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-board-border" />

                    {/* Existing Labels */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-board-text-secondary uppercase tracking-wider">
                            Existing Labels
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {labels.length === 0 ? (
                                <p className="text-sm text-board-text-tertiary italic">No labels created yet.</p>
                            ) : (
                                labels.map(label => (
                                    <div key={label.id} className="flex items-center gap-2 group">
                                        {editingId === label.id ? (
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    autoFocus
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            onUpdateLabel(label.id, editName, label.color);
                                                            setEditingId(null);
                                                        }
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                    className="flex-1 text-sm bg-board-input text-board-text rounded border border-board-accent
                            px-2 py-1 outline-none"
                                                />
                                                <button
                                                    onClick={() => {
                                                        onUpdateLabel(label.id, editName, label.color);
                                                        setEditingId(null);
                                                    }}
                                                    className="text-board-success hover:text-board-success/80"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span
                                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: label.color }}
                                                />
                                                <span className="flex-1 text-sm text-board-text font-medium">{label.name}</span>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(label.id);
                                                            setEditName(label.name);
                                                        }}
                                                        className="p-1 text-board-text-secondary hover:text-board-accent"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteLabel(label.id)}
                                                        className="p-1 text-board-text-secondary hover:text-board-danger"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
