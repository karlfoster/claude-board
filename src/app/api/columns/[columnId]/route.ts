import { NextRequest, NextResponse } from 'next/server';
import { updateColumn, deleteColumn } from '@/lib/store';
import { broadcast } from '@/lib/websocket';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ columnId: string }> }) {
  try {
    const { columnId } = await params;
    const body = await request.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const column = await updateColumn(columnId, body.title.trim());
    broadcast({ type: 'column_updated', payload: { column }, timestamp: new Date().toISOString() });
    return NextResponse.json(column);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ columnId: string }> }) {
  try {
    const { columnId } = await params;
    await deleteColumn(columnId);
    broadcast({ type: 'column_deleted', payload: { columnId }, timestamp: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
