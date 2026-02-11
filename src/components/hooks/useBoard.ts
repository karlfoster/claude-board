'use client';

import { useState, useCallback, useEffect } from 'react';
import { Board, Task, Column, Attachment, CreateTaskInput, UpdateTaskInput, WSMessage, Label } from '@/types/kanban';

const API = '/api';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export function useBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async () => {
    try {
      const data = await apiFetch<Board>(`${API}/board`);
      setBoard(data);
    } catch (err) {
      console.error('Failed to fetch board:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // WebSocket message handler
  const handleWSMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case 'board_state':
        setBoard((msg.payload as { board: Board }).board);
        break;
      case 'task_created': {
        const { task } = msg.payload as { task: Task };
        setBoard(prev => {
          if (!prev) return prev;
          // Deduplicate: WS broadcast reaches the same client that created the task
          if (prev.tasks.some(t => t.id === task.id)) return prev;
          return { ...prev, tasks: [...prev.tasks, task] };
        });
        break;
      }
      case 'task_updated': {
        const { task } = msg.payload as { task: Task };
        setBoard(prev => prev ? {
          ...prev,
          tasks: prev.tasks.map(t => t.id === task.id ? task : t),
        } : prev);
        break;
      }
      case 'task_moved': {
        const payload = msg.payload as { task?: Task; board?: Board };
        if (payload.board) {
          setBoard(payload.board);
        } else if (payload.task) {
          const task = payload.task;
          setBoard(prev => prev ? {
            ...prev,
            tasks: prev.tasks.map(t => t.id === task.id ? task : t),
          } : prev);
        }
        break;
      }
      case 'task_deleted': {
        const { taskId } = msg.payload as { taskId: string };
        setBoard(prev => prev ? {
          ...prev,
          tasks: prev.tasks.filter(t => t.id !== taskId),
        } : prev);
        break;
      }
      case 'column_created': {
        const { column } = msg.payload as { column: Column };
        setBoard(prev => {
          if (!prev) return prev;
          if (prev.columns.some(c => c.id === column.id)) return prev;
          return { ...prev, columns: [...prev.columns, column] };
        });
        break;
      }
      case 'column_updated': {
        const { column } = msg.payload as { column: Column };
        setBoard(prev => prev ? {
          ...prev,
          columns: prev.columns.map(c => c.id === column.id ? column : c),
        } : prev);
        break;
      }
      case 'column_deleted': {
        const { columnId } = msg.payload as { columnId: string };
        // Refetch board since tasks may have moved
        fetchBoard();
        break;
      }
      case 'columns_reordered': {
        const { columns } = msg.payload as { columns: Column[] };
        setBoard(prev => prev ? { ...prev, columns } : prev);
        break;
      }
    }
  }, [fetchBoard]);

  // ─── Task operations ───

  const createTask = useCallback(async (input: CreateTaskInput) => {
    const task = await apiFetch<Task>(`${API}/tasks`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    // WebSocket will update the board
    return task;
  }, []);

  const updateTask = useCallback(async (taskId: string, input: UpdateTaskInput) => {
    const task = await apiFetch<Task>(`${API}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return task;
  }, []);

  const moveTask = useCallback(async (taskId: string, targetColumnId: string, position?: 'top' | 'bottom') => {
    const task = await apiFetch<Task>(`${API}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetColumnId, position: position || 'bottom' }),
    });
    return task;
  }, []);

  const updateTaskPositions = useCallback(async (positions: { taskId: string; columnId: string; position: number }[]) => {
    // Optimistic update
    setBoard(prev => {
      if (!prev) return prev;
      const updated = { ...prev, tasks: [...prev.tasks] };
      for (const pos of positions) {
        const task = updated.tasks.find(t => t.id === pos.taskId);
        if (task) {
          const idx = updated.tasks.indexOf(task);
          updated.tasks[idx] = { ...task, columnId: pos.columnId, position: pos.position };
        }
      }
      return updated;
    });

    await apiFetch(`${API}/tasks/_batch`, {
      method: 'PATCH',
      body: JSON.stringify({ positions }),
    }).catch(() => {
      // Revert on failure
      fetchBoard();
    });
  }, [fetchBoard]);

  const deleteTask = useCallback(async (taskId: string) => {
    await apiFetch(`${API}/tasks/${taskId}`, { method: 'DELETE' });
  }, []);

  const uploadAttachment = useCallback(async (taskId: string, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API}/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Upload error: ${res.status}`);
    }
    return res.json();
  }, []);

  const removeAttachment = useCallback(async (taskId: string, attachmentId: string) => {
    await apiFetch(`${API}/tasks/${taskId}/attachments`, {
      method: 'DELETE',
      body: JSON.stringify({ attachmentId }),
    });
  }, []);

  // ─── Column operations ───

  const createColumn = useCallback(async (title: string) => {
    const column = await apiFetch<Column>(`${API}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return column;
  }, []);

  const updateColumn = useCallback(async (columnId: string, title: string) => {
    const column = await apiFetch<Column>(`${API}/columns/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
    return column;
  }, []);

  const deleteColumn = useCallback(async (columnId: string) => {
    await apiFetch(`${API}/columns/${columnId}`, { method: 'DELETE' });
  }, []);

  const reorderColumns = useCallback(async (columnIds: string[]) => {
    await apiFetch(`${API}/columns`, {
      method: 'PUT',
      body: JSON.stringify({ columnIds }),
    });
  }, []);

  // ─── Label operations ───

  const createLabel = useCallback(async (name: string, color: string) => {
    const label = await apiFetch<Label>(`${API}/labels`, {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    // WebSocket update will handler board refresh
    return label;
  }, []);

  const updateLabel = useCallback(async (labelId: string, name: string, color: string) => {
    const label = await apiFetch<Label>(`${API}/labels/${labelId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, color }),
    });
    return label;
  }, []);

  const deleteLabel = useCallback(async (labelId: string) => {
    await apiFetch(`${API}/labels/${labelId}`, { method: 'DELETE' });
  }, []);

  return {
    board,
    loading,
    handleWSMessage,
    fetchBoard,
    createTask,
    updateTask,
    moveTask,
    updateTaskPositions,
    deleteTask,
    uploadAttachment,
    removeAttachment,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    createLabel,
    updateLabel,
    deleteLabel,
  };
}
