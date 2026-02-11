import fs from 'fs/promises';
import path from 'path';
import { Board, Task, Column, Label, Attachment, CreateTaskInput, UpdateTaskInput, MoveTaskInput } from '../types/kanban';
import { generateId } from './ids';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'kanban.json');
export const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

// Use globalThis to share state between custom server and Next.js API routes
// (they run in the same Node.js process but different webpack module instances)
const g = globalThis as typeof globalThis & { __kanban_board?: Board };

function createDefaultBoard(): Board {
  const now = new Date().toISOString();
  return {
    version: 1,
    columns: [
      { id: generateId('col'), title: 'To Do', position: 1000, createdAt: now },
      { id: generateId('col'), title: 'In Progress', position: 2000, createdAt: now },
      { id: generateId('col'), title: 'Done', position: 3000, createdAt: now },
    ],
    tasks: [],
    labels: [
      { id: generateId('lbl'), name: 'work', color: '#3b82f6' },
      { id: generateId('lbl'), name: 'personal', color: '#10b981' },
    ],
    updatedAt: now,
  };
}

async function persistBoard(): Promise<void> {
  const board = g.__kanban_board!;
  board.updatedAt = new Date().toISOString();
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmpFile = DATA_FILE + '.tmp';
  await fs.writeFile(tmpFile, JSON.stringify(board, null, 2), 'utf-8');
  await fs.rename(tmpFile, DATA_FILE);
}

export async function initStore(): Promise<Board> {
  if (g.__kanban_board) return g.__kanban_board;
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    g.__kanban_board = JSON.parse(raw);
    // Migrate: ensure all tasks have attachments array
    for (const task of g.__kanban_board!.tasks) {
      if (!task.attachments) task.attachments = [];
    }
  } catch {
    g.__kanban_board = createDefaultBoard();
    await persistBoard();
  }
  return g.__kanban_board!;
}

export function getBoard(): Board {
  if (!g.__kanban_board) {
    // Lazy init from file synchronously via require-style read
    // This shouldn't happen normally since initStore is called at server start
    throw new Error('Store not initialized. Call initStore() first.');
  }
  return g.__kanban_board;
}

// ─── Position helpers ───

function getMaxPosition(items: { position: number }[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map(i => i.position));
}

function getMinPosition(items: { position: number }[]): number {
  if (items.length === 0) return 2000;
  return Math.min(...items.map(i => i.position));
}

function getTasksInColumn(columnId: string): Task[] {
  const board = g.__kanban_board!;
  return board.tasks
    .filter(t => t.columnId === columnId)
    .sort((a, b) => a.position - b.position);
}

// ─── Task operations ───

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const board = g.__kanban_board!;
  const columnId = input.columnId || board.columns[0]?.id;
  if (!columnId || !board.columns.find(c => c.id === columnId)) {
    throw new Error(`Column not found: ${input.columnId || 'no columns exist'}`);
  }

  const tasksInColumn = getTasksInColumn(columnId);
  const now = new Date().toISOString();

  const task: Task = {
    id: generateId('task'),
    title: input.title,
    description: input.description || '',
    priority: input.priority || 'none',
    dueDate: input.dueDate || null,
    labels: input.labels || [],
    checklist: (input.checklist || []).map(text => ({
      id: generateId('chk'),
      text,
      completed: false,
    })),
    attachments: [],
    columnId,
    position: getMaxPosition(tasksInColumn) + 1000,
    createdAt: now,
    updatedAt: now,
  };

  board.tasks.push(task);
  await persistBoard();
  return task;
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  const board = g.__kanban_board!;
  const task = board.tasks.find(t => t.id === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  if (input.title !== undefined) task.title = input.title;
  if (input.description !== undefined) task.description = input.description;
  if (input.priority !== undefined) task.priority = input.priority;
  if (input.dueDate !== undefined) task.dueDate = input.dueDate;
  if (input.labels !== undefined) task.labels = input.labels;
  if (input.checklist !== undefined) task.checklist = input.checklist;
  if (input.attachments !== undefined) task.attachments = input.attachments;
  task.updatedAt = new Date().toISOString();

  await persistBoard();
  return task;
}

export async function moveTask(taskId: string, input: MoveTaskInput): Promise<{ task: Task; fromColumnId: string }> {
  const board = g.__kanban_board!;
  const task = board.tasks.find(t => t.id === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const targetColumn = board.columns.find(c => c.id === input.targetColumnId);
  if (!targetColumn) throw new Error(`Column not found: ${input.targetColumnId}`);

  const fromColumnId = task.columnId;
  const tasksInTarget = getTasksInColumn(input.targetColumnId).filter(t => t.id !== taskId);

  task.columnId = input.targetColumnId;

  if (typeof input.position === 'number') {
    task.position = input.position;
  } else if (input.position === 'top') {
    task.position = getMinPosition(tasksInTarget) - 1000;
  } else {
    task.position = getMaxPosition(tasksInTarget) + 1000;
  }

  task.updatedAt = new Date().toISOString();
  await persistBoard();
  return { task, fromColumnId };
}

export async function deleteTask(taskId: string): Promise<string> {
  const board = g.__kanban_board!;
  const index = board.tasks.findIndex(t => t.id === taskId);
  if (index === -1) throw new Error(`Task not found: ${taskId}`);
  board.tasks.splice(index, 1);
  await persistBoard();
  return taskId;
}

// ─── Attachment operations ───

export async function addAttachment(taskId: string, filename: string, buffer: Buffer): Promise<{ task: Task; attachment: Attachment }> {
  const board = g.__kanban_board!;
  const task = board.tasks.find(t => t.id === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const attId = generateId('att');
  const ext = path.extname(filename) || '.bin';
  const storedName = `${attId}${ext}`;
  const filePath = path.join(UPLOADS_DIR, storedName);
  await fs.writeFile(filePath, buffer);

  const attachment: Attachment = {
    id: attId,
    filename,
    path: `/api/uploads/${storedName}`,
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
  };

  if (!task.attachments) task.attachments = [];
  task.attachments.push(attachment);
  task.updatedAt = new Date().toISOString();
  await persistBoard();
  return { task, attachment };
}

export async function removeAttachment(taskId: string, attachmentId: string): Promise<Task> {
  const board = g.__kanban_board!;
  const task = board.tasks.find(t => t.id === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const att = (task.attachments || []).find(a => a.id === attachmentId);
  if (att) {
    const storedName = att.path.split('/').pop()!;
    const filePath = path.join(UPLOADS_DIR, storedName);
    await fs.unlink(filePath).catch(() => {});
  }

  task.attachments = (task.attachments || []).filter(a => a.id !== attachmentId);
  task.updatedAt = new Date().toISOString();
  await persistBoard();
  return task;
}

// ─── Column operations ───

export async function createColumn(title: string): Promise<Column> {
  const board = g.__kanban_board!;
  const column: Column = {
    id: generateId('col'),
    title,
    position: getMaxPosition(board.columns) + 1000,
    createdAt: new Date().toISOString(),
  };
  board.columns.push(column);
  await persistBoard();
  return column;
}

export async function updateColumn(columnId: string, title: string): Promise<Column> {
  const board = g.__kanban_board!;
  const column = board.columns.find(c => c.id === columnId);
  if (!column) throw new Error(`Column not found: ${columnId}`);
  column.title = title;
  await persistBoard();
  return column;
}

export async function deleteColumn(columnId: string): Promise<string> {
  const board = g.__kanban_board!;
  const index = board.columns.findIndex(c => c.id === columnId);
  if (index === -1) throw new Error(`Column not found: ${columnId}`);

  const remainingColumns = board.columns.filter(c => c.id !== columnId);
  if (remainingColumns.length > 0) {
    const targetId = remainingColumns[0].id;
    const maxPos = getMaxPosition(getTasksInColumn(targetId));
    let offset = 1000;
    for (const task of board.tasks) {
      if (task.columnId === columnId) {
        task.columnId = targetId;
        task.position = maxPos + offset;
        offset += 1000;
      }
    }
  } else {
    board.tasks = board.tasks.filter(t => t.columnId !== columnId);
  }

  board.columns.splice(index, 1);
  await persistBoard();
  return columnId;
}

export async function reorderColumns(columnIds: string[]): Promise<Column[]> {
  const board = g.__kanban_board!;
  let position = 1000;
  for (const id of columnIds) {
    const column = board.columns.find(c => c.id === id);
    if (column) {
      column.position = position;
      position += 1000;
    }
  }
  board.columns.sort((a, b) => a.position - b.position);
  await persistBoard();
  return board.columns;
}

// ─── Label operations ───

export async function createLabel(name: string, color: string): Promise<Label> {
  const board = g.__kanban_board!;
  const label: Label = { id: generateId('lbl'), name, color };
  board.labels.push(label);
  await persistBoard();
  return label;
}

export async function deleteLabel(labelId: string): Promise<string> {
  const board = g.__kanban_board!;
  const index = board.labels.findIndex(l => l.id === labelId);
  if (index === -1) throw new Error(`Label not found: ${labelId}`);
  board.labels.splice(index, 1);
  for (const task of board.tasks) {
    task.labels = task.labels.filter(l => l !== labelId);
  }
  await persistBoard();
  return labelId;
}

// ─── Bulk position update (for drag-and-drop) ───

export async function updateTaskPositions(updates: { taskId: string; columnId: string; position: number }[]): Promise<void> {
  const board = g.__kanban_board!;
  for (const update of updates) {
    const task = board.tasks.find(t => t.id === update.taskId);
    if (task) {
      task.columnId = update.columnId;
      task.position = update.position;
      task.updatedAt = new Date().toISOString();
    }
  }
  await persistBoard();
}
