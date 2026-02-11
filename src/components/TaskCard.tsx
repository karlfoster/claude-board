'use client';

import React from 'react';
import { Task, Label } from '@/types/kanban';
import { PriorityBadge } from './PriorityBadge';
import { DueDate } from './DueDate';
import { LabelPill } from './LabelPill';

interface TaskCardProps {
  task: Task;
  labels: Label[];
  onClick: () => void;
  onDelete: () => void;
  onComplete: () => void;
}

export const TaskCard = React.memo(function TaskCard({ task, labels, onClick, onDelete, onComplete }: TaskCardProps) {
  const taskLabels = task.labels
    .map(id => labels.find(l => l.id === id))
    .filter((l): l is Label => !!l);

  const checklistTotal = task.checklist.length;
  const checklistDone = task.checklist.filter(i => i.completed).length;

  const priorityAccent: Record<string, string> = {
    none: '',
    low: 'border-l-stone-400',
    medium: 'border-l-sky-400',
    high: 'border-l-amber-400',
    urgent: 'border-l-red-400',
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete();
  };

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer rounded-md border border-board-border
        ${task.priority !== 'none' ? `border-l-[3px] ${priorityAccent[task.priority]}` : ''}
        bg-board-card shadow-[var(--card-shadow)]
        hover:shadow-[var(--card-shadow-hover)] hover:border-board-accent/30
        transition-all duration-150 p-2`}
    >
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200">
        {/* Complete button */}
        <button
          onClick={handleComplete}
          className="p-1 rounded text-board-text-tertiary
            hover:text-board-success hover:bg-board-success/10
            transition-colors"
          title="Move to Done"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="p-1 rounded text-board-text-tertiary
            hover:text-board-danger hover:bg-board-danger/10
            transition-colors"
          title="Delete task"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Labels row on top */}
      {taskLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5 pr-6">
          {taskLabels.map(label => (
            <LabelPill key={label.id} label={label} />
          ))}
        </div>
      )}

      <p className="text-[13px] font-medium text-board-text leading-snug pr-4">{task.title}</p>

      {/* Attachment thumbnails */}
      {(task.attachments?.length ?? 0) > 0 && (
        <div className="flex gap-1 mt-1.5 overflow-hidden">
          {task.attachments.slice(0, 3).map(att => (
            <img
              key={att.id}
              src={att.path}
              alt=""
              className="w-10 h-10 rounded object-cover border border-board-border"
            />
          ))}
          {task.attachments.length > 3 && (
            <div className="w-10 h-10 rounded border border-board-border bg-board-input flex items-center justify-center">
              <span className="text-[10px] font-medium text-board-text-tertiary">+{task.attachments.length - 3}</span>
            </div>
          )}
        </div>
      )}

      {(task.priority !== 'none' || task.dueDate || checklistTotal > 0 || (task.attachments?.length ?? 0) > 0) && (
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {task.priority !== 'none' && <PriorityBadge priority={task.priority} />}
          {task.dueDate && <DueDate date={task.dueDate} />}
          {checklistTotal > 0 && (
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3 text-board-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className={`text-[11px] font-medium ${checklistDone === checklistTotal ? 'text-board-success' : 'text-board-text-tertiary'
                }`}>
                {checklistDone}/{checklistTotal}
              </span>
            </span>
          )}
          {(task.attachments?.length ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3 text-board-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <span className="text-[11px] font-medium text-board-text-tertiary">{task.attachments.length}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
});
