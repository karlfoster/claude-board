import { NextRequest, NextResponse } from 'next/server';
import { updateTask, moveTask, deleteTask, getBoard, updateTaskPositions } from '@/lib/store';
import { broadcast } from '@/lib/websocket';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const task = await updateTask(taskId, body);
    broadcast({ type: 'task_updated', payload: { task }, timestamp: new Date().toISOString() });
    return NextResponse.json(task);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const body = await request.json();

    // Batch position update (from drag-and-drop)
    if (body.positions) {
      await updateTaskPositions(body.positions);
      const board = getBoard();
      broadcast({ type: 'task_moved', payload: { board }, timestamp: new Date().toISOString() });
      return NextResponse.json({ ok: true });
    }

    // Single task move
    const result = await moveTask(taskId, body);
    broadcast({
      type: 'task_moved',
      payload: { task: result.task, fromColumnId: result.fromColumnId },
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(result.task);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    await deleteTask(taskId);
    broadcast({ type: 'task_deleted', payload: { taskId }, timestamp: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
