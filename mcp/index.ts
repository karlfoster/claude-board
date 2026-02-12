#!/usr/bin/env node

// Disable colors to prevent ANSI codes from breaking JSON parsing
process.env.NODE_DISABLE_COLORS = '1';
process.env.NO_COLOR = '1';

import { fileURLToPath } from 'url';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

const __filename_mcp = fileURLToPath(import.meta.url);
const __dirname_mcp = path.dirname(__filename_mcp);

const KANBAN_API_URL = process.env.KANBAN_API_URL || 'http://localhost:3333';
let serverProcess: ChildProcess | null = null;

// ─── HTTP helper ───

async function apiRequest(path: string, options?: RequestInit): Promise<unknown> {
  const url = `${KANBAN_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }
  return data;
}

// ─── Tool definitions ───

const tools: Tool[] = [
  {
    name: 'kanban_get_board',
    description: 'Get the full Kanban board state including all columns, tasks, and labels',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'kanban_list_tasks',
    description: 'List tasks, optionally filtered by column, priority, or label',
    inputSchema: {
      type: 'object',
      properties: {
        columnId: { type: 'string', description: 'Filter by column ID' },
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'], description: 'Filter by priority' },
        label: { type: 'string', description: 'Filter by label name' },
      },
    },
  },
  {
    name: 'kanban_create_task',
    description: 'Create a new task on the Kanban board',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title (required)' },
        description: { type: 'string', description: 'Task description' },
        columnId: { type: 'string', description: 'Column ID to add task to (defaults to first column)' },
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'], description: 'Task priority level' },
        dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Label names to apply' },
        checklist: { type: 'array', items: { type: 'string' }, description: 'Checklist items as text strings' },
      },
      required: ['title'],
    },
  },
  {
    name: 'kanban_update_task',
    description: 'Update an existing task (title, description, priority, due date, labels, checklist)',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to update' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
        dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format, or empty string to clear' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Label names to apply (replaces existing)' },
        checklist: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              text: { type: 'string' },
              completed: { type: 'boolean' },
            },
          },
          description: 'Full checklist (replaces existing)',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanban_move_task',
    description: 'Move a task to a different column or reposition within the same column',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to move' },
        targetColumnId: { type: 'string', description: 'Target column ID' },
        position: { type: 'string', enum: ['top', 'bottom'], description: 'Position in target column (default: bottom)' },
      },
      required: ['taskId', 'targetColumnId'],
    },
  },
  {
    name: 'kanban_delete_task',
    description: 'Permanently delete a task from the board',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to delete' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanban_manage_labels',
    description: 'Create, update, delete, or list labels on the board',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'update', 'delete', 'list'], description: 'Action to perform' },
        labelId: { type: 'string', description: 'Label ID (for update, delete)' },
        name: { type: 'string', description: 'Label name (for create, update)' },
        color: { type: 'string', description: 'Label hex color e.g. #3b82f6 (for create, update)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'kanban_manage_columns',
    description: 'Create, rename, reorder, or delete columns on the board',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'rename', 'reorder', 'delete'], description: 'Action to perform' },
        columnId: { type: 'string', description: 'Column ID (for rename, delete)' },
        title: { type: 'string', description: 'Column title (for create, rename)' },
        columnIds: { type: 'array', items: { type: 'string' }, description: 'Ordered column IDs (for reorder)' },
      },
      required: ['action'],
    },
  },
];

// ─── Lazy server startup ───

let serverReady: Promise<void> | null = null;

function lazyEnsureServer(): Promise<void> {
  if (!serverReady) {
    serverReady = ensureServer().catch((err) => {
      serverReady = null; // Reset so next call retries
      throw err;
    });
  }
  return serverReady;
}

// ─── Tool handlers ───

async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  await lazyEnsureServer();
  switch (name) {
    case 'kanban_get_board': {
      const board = await apiRequest('/api/board');
      return JSON.stringify(board, null, 2);
    }

    case 'kanban_list_tasks': {
      const params = new URLSearchParams();
      if (args.columnId) params.set('columnId', args.columnId as string);
      if (args.priority) params.set('priority', args.priority as string);
      if (args.label) params.set('label', args.label as string);
      const qs = params.toString();
      const tasks = await apiRequest(`/api/tasks${qs ? '?' + qs : ''}`);
      return JSON.stringify(tasks, null, 2);
    }

    case 'kanban_create_task': {
      const body: Record<string, unknown> = { title: args.title };
      if (args.description) body.description = args.description;
      if (args.columnId) body.columnId = args.columnId;
      if (args.priority) body.priority = args.priority;
      if (args.dueDate) body.dueDate = new Date(args.dueDate as string).toISOString();
      if (args.labels) body.labels = args.labels;
      if (args.checklist) body.checklist = args.checklist;
      const task = await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return JSON.stringify(task, null, 2);
    }

    case 'kanban_update_task': {
      const { taskId, ...updates } = args;
      if (updates.dueDate === '') {
        updates.dueDate = null;
      } else if (updates.dueDate) {
        updates.dueDate = new Date(updates.dueDate as string).toISOString();
      }
      const task = await apiRequest(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return JSON.stringify(task, null, 2);
    }

    case 'kanban_move_task': {
      const task = await apiRequest(`/api/tasks/${args.taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          targetColumnId: args.targetColumnId,
          position: args.position || 'bottom',
        }),
      });
      return JSON.stringify(task, null, 2);
    }

    case 'kanban_delete_task': {
      await apiRequest(`/api/tasks/${args.taskId}`, { method: 'DELETE' });
      return JSON.stringify({ success: true, message: `Task ${args.taskId} deleted` });
    }

    case 'kanban_manage_labels': {
      const action = args.action as string;
      switch (action) {
        case 'create': {
          const label = await apiRequest('/api/labels', {
            method: 'POST',
            body: JSON.stringify({ name: args.name, color: args.color }),
          });
          return JSON.stringify(label, null, 2);
        }
        case 'update': {
          const label = await apiRequest(`/api/labels/${args.labelId}`, {
            method: 'PUT',
            body: JSON.stringify({ name: args.name, color: args.color }),
          });
          return JSON.stringify(label, null, 2);
        }
        case 'delete': {
          await apiRequest(`/api/labels/${args.labelId}`, { method: 'DELETE' });
          return JSON.stringify({ success: true, message: `Label ${args.labelId} deleted` });
        }
        case 'list': {
          const board = await apiRequest('/api/board') as { labels: unknown[] };
          return JSON.stringify(board.labels, null, 2);
        }
        default:
          throw new Error(`Unknown label action: ${action}`);
      }
    }

    case 'kanban_manage_columns': {
      const action = args.action as string;
      switch (action) {
        case 'create': {
          const col = await apiRequest('/api/columns', {
            method: 'POST',
            body: JSON.stringify({ title: args.title }),
          });
          return JSON.stringify(col, null, 2);
        }
        case 'rename': {
          const col = await apiRequest(`/api/columns/${args.columnId}`, {
            method: 'PUT',
            body: JSON.stringify({ title: args.title }),
          });
          return JSON.stringify(col, null, 2);
        }
        case 'reorder': {
          const cols = await apiRequest('/api/columns', {
            method: 'PUT',
            body: JSON.stringify({ columnIds: args.columnIds }),
          });
          return JSON.stringify(cols, null, 2);
        }
        case 'delete': {
          await apiRequest(`/api/columns/${args.columnId}`, { method: 'DELETE' });
          return JSON.stringify({ success: true, message: `Column ${args.columnId} deleted` });
        }
        default:
          throw new Error(`Unknown column action: ${action}`);
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Auto-start Next.js server ───

async function ensureServer(): Promise<void> {
  try {
    const res = await fetch(`${KANBAN_API_URL}/api/health`);
    if (res.ok) return;
  } catch {
    // Not running, start it
  }

  console.error('[kanban-mcp] Server not running, auto-starting...');

  // The project root is two levels up from dist/mcp/
  const projectRoot = path.resolve(__dirname_mcp, '..', '..');

  const tsxBin = path.join(projectRoot, 'node_modules', '.bin', 'tsx');
  serverProcess = spawn(tsxBin, [path.join(projectRoot, 'server.ts')], {
    cwd: projectRoot,
    env: { ...process.env, PORT: '3333', PATH: process.env.PATH || '' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  serverProcess.stdout?.on('data', (data: Buffer) => {
    console.error(`[kanban-server] ${data.toString().trim()}`);
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[kanban-server] ${data.toString().trim()}`);
  });

  serverProcess.on('error', (err) => {
    console.error('[kanban-mcp] Failed to start server:', err.message);
  });

  serverProcess.on('exit', (code) => {
    console.error(`[kanban-mcp] Server exited (code=${code})`);
    serverProcess = null;
  });

  // Wait for health endpoint
  const timeout = 30_000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch(`${KANBAN_API_URL}/api/health`);
      if (res.ok) {
        console.error('[kanban-mcp] Server started successfully');
        return;
      }
    } catch {
      // Not ready yet
    }
  }

  console.error('[kanban-mcp] Server did not start within 30s, continuing anyway');
}

function cleanup(): void {
  if (serverProcess && !serverProcess.killed) {
    console.error('[kanban-mcp] Shutting down server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });

// ─── MCP Server ───

const server = new Server(
  { name: 'kanban', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleTool(name, (args || {}) as Record<string, unknown>);
    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ─── Start ───

async function main() {
  // Start the Next.js server first (before MCP handshake), matching the Excalidraw pattern
  console.error('[claude-board] Starting Claude Board server...');
  await ensureServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[claude-board] MCP server ready');
}

main().catch((err) => {
  console.error('[kanban-mcp] Fatal error:', err);
  process.exit(1);
});
