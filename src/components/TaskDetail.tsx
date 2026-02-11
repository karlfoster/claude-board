'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Task, Label, Priority, Attachment, UpdateTaskInput } from '@/types/kanban';
import { Checklist } from './Checklist';

interface TaskDetailProps {
  task: Task;
  labels: Label[];
  onUpdate: (taskId: string, input: UpdateTaskInput) => void;
  onDelete: (taskId: string) => void;
  onUploadAttachment: (taskId: string, file: File) => Promise<Attachment>;
  onRemoveAttachment: (taskId: string, attachmentId: string) => Promise<void>;
  onClose: () => void;
}

const priorities: { value: Priority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function TaskDetail({ task, labels, onUpdate, onDelete, onUploadAttachment, onRemoveAttachment, onClose }: TaskDetailProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [taskLabels, setTaskLabels] = useState(task.labels);
  const [checklist, setChecklist] = useState(task.checklist);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachments = task.attachments || [];

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDueDate(task.dueDate || '');
    setTaskLabels(task.labels);
    setChecklist(task.checklist);
  }, [task]);

  const saveField = useCallback((fields: UpdateTaskInput) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate(task.id, fields);
    }, 400);
  }, [onUpdate, task.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, previewImage]);

  const toggleLabel = (labelId: string) => {
    const next = taskLabels.includes(labelId)
      ? taskLabels.filter(l => l !== labelId)
      : [...taskLabels, labelId];
    setTaskLabels(next);
    onUpdate(task.id, { labels: next });
  };

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      await onUploadAttachment(task.id, file);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [onUploadAttachment, task.id]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleUpload(file);
        return;
      }
    }
  }, [handleUpload]);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    modal.addEventListener('paste', handlePaste as EventListener);
    return () => modal.removeEventListener('paste', handlePaste as EventListener);
  }, [handlePaste]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        handleUpload(file);
        break;
      }
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    try {
      await onRemoveAttachment(task.id, attachmentId);
    } catch (err) {
      console.error('Remove failed:', err);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[8vh] px-4" style={{ isolation: 'isolate' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--modal-overlay)] backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-board-card border border-board-border rounded-lg shadow-2xl
          w-full max-w-lg max-h-[80vh] flex flex-col z-10"
        tabIndex={-1}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-20 rounded-lg border-2 border-dashed border-board-accent bg-board-accent-subtle flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <svg className="w-8 h-8 text-board-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm font-medium text-board-accent">Drop image here</span>
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-md text-board-text-tertiary
            hover:text-board-text hover:bg-board-hover transition-colors z-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <input
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              saveField({ title: e.target.value });
            }}
            className="w-full text-lg font-semibold bg-transparent text-board-text
              outline-none border-b-2 border-transparent focus:border-board-accent
              transition-colors pb-1 pr-8"
            placeholder="Task title"
          />

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-board-text-secondary uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                saveField({ description: e.target.value });
              }}
              rows={3}
              className="w-full text-sm bg-board-input text-board-text rounded-md border border-board-border
                p-3 outline-none focus:border-board-accent resize-none transition-colors
                placeholder:text-board-text-tertiary"
              placeholder="Add a description..."
            />
          </div>

          {/* Priority + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-board-text-secondary uppercase tracking-wider mb-1.5 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => {
                  const p = e.target.value as Priority;
                  setPriority(p);
                  onUpdate(task.id, { priority: p });
                }}
                className="w-full text-sm bg-board-input text-board-text rounded-md border border-board-border
                  px-3 py-2 outline-none focus:border-board-accent transition-colors cursor-pointer
                  appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.25rem' }}
              >
                {priorities.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-board-text-secondary uppercase tracking-wider mb-1.5 block">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate ? dueDate.substring(0, 10) : ''}
                onChange={e => {
                  const val = e.target.value || null;
                  setDueDate(val || '');
                  onUpdate(task.id, { dueDate: val ? new Date(val).toISOString() : null });
                }}
                className="w-full text-sm bg-board-input text-board-text rounded-md border border-board-border
                  px-3 py-2 outline-none focus:border-board-accent transition-colors"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-board-text-secondary uppercase tracking-wider">
                Labels
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {labels.map(label => {
                const isSelected = taskLabels.includes(label.id);
                return (
                  <button
                    key={label.id}
                    onClick={() => toggleLabel(label.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium
                      border transition-all duration-150 ${isSelected
                        ? 'border-board-accent bg-board-accent-subtle shadow-sm'
                        : 'border-board-border bg-board-card hover:border-board-accent/40 opacity-70 hover:opacity-100'
                      }`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                    <span className="text-board-text">{label.name}</span>
                    {isSelected && (
                      <svg className="w-3 h-3 text-board-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
              {labels.length === 0 && (
                <span className="text-xs text-board-text-tertiary italic">No labels defined.</span>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-board-text-secondary uppercase tracking-wider">
                Attachments
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[11px] font-medium text-board-accent hover:text-board-accent-hover transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : '+ Add image'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
            </div>

            {attachments.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="group/att relative rounded-md overflow-hidden border border-board-border bg-board-input">
                    <img
                      src={att.path}
                      alt={att.filename}
                      className="w-full h-20 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewImage(att.path)}
                    />
                    <button
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover/att:opacity-100 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-4 rounded-md border border-dashed border-board-border
                  text-board-text-tertiary hover:text-board-text-secondary hover:border-board-accent/30
                  transition-colors cursor-pointer text-xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <span>Paste, drop, or click to add an image</span>
              </div>
            )}
          </div>

          {/* Checklist */}
          <Checklist
            items={checklist}
            onChange={items => {
              setChecklist(items);
              onUpdate(task.id, { checklist: items });
            }}
          />
        </div>

        {/* Footer - fixed at bottom */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3.5
          border-t border-board-border bg-board-card rounded-b-lg">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-board-danger">Delete this task?</span>
                <button
                  onClick={() => { onDelete(task.id); onClose(); }}
                  className="px-2.5 py-1 text-xs font-medium bg-board-danger text-white rounded-md
                    hover:bg-board-danger-hover transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs text-board-text-secondary hover:text-board-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs font-medium text-board-text-tertiary hover:text-board-danger transition-colors"
              >
                Delete task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
