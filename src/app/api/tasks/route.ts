import { NextRequest, NextResponse } from 'next/server';
import { createTask, getBoard } from '@/lib/store';
import { broadcast } from '@/lib/websocket';
import { CreateTaskInput } from '@/types/kanban';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const columnId = searchParams.get('columnId');
  const priority = searchParams.get('priority');
  const label = searchParams.get('label');

  let tasks = getBoard().tasks;

  if (columnId) tasks = tasks.filter(t => t.columnId === columnId);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  if (label) {
    const board = getBoard();
    const labelObj = board.labels.find(l => l.name === label);
    if (labelObj) {
      tasks = tasks.filter(t => t.labels.includes(labelObj.id));
    }
  }

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskInput = await request.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Resolve label names to IDs if needed
    if (body.labels && body.labels.length > 0) {
      const board = getBoard();
      body.labels = body.labels.map(nameOrId => {
        const byId = board.labels.find(l => l.id === nameOrId);
        if (byId) return byId.id;
        const byName = board.labels.find(l => l.name.toLowerCase() === nameOrId.toLowerCase());
        return byName ? byName.id : nameOrId;
      });
    }

    const task = await createTask(body);
    broadcast({ type: 'task_created', payload: { task }, timestamp: new Date().toISOString() });
    return NextResponse.json(task, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
