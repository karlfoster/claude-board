export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Attachment {
  id: string;
  filename: string;
  path: string;
  size: number;
  uploadedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  labels: string[];
  checklist: ChecklistItem[];
  attachments: Attachment[];
  columnId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  title: string;
  position: number;
  createdAt: string;
}

export interface Board {
  version: 1;
  columns: Column[];
  tasks: Task[];
  labels: Label[];
  updatedAt: string;
}

// API input types

export interface CreateTaskInput {
  title: string;
  description?: string;
  columnId?: string;
  priority?: Priority;
  dueDate?: string | null;
  labels?: string[];
  checklist?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  labels?: string[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
}

export interface MoveTaskInput {
  targetColumnId: string;
  position?: 'top' | 'bottom' | number;
}

export interface CreateColumnInput {
  title: string;
}

export interface UpdateColumnInput {
  title?: string;
}

// WebSocket message types

export type WSMessageType =
  | 'board_state'
  | 'task_created'
  | 'task_updated'
  | 'task_moved'
  | 'task_deleted'
  | 'column_created'
  | 'column_updated'
  | 'column_deleted'
  | 'columns_reordered'
  | 'label_created'
  | 'label_updated'
  | 'label_deleted';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: string;
}
