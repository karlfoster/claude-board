import { NextRequest, NextResponse } from 'next/server';
import { updateTaskPositions, getBoard } from '@/lib/store';
import { broadcast } from '@/lib/websocket';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.positions || !Array.isArray(body.positions)) {
      return NextResponse.json({ error: 'positions array required' }, { status: 400 });
    }
    await updateTaskPositions(body.positions);
    const board = getBoard();
    broadcast({ type: 'task_moved', payload: { board }, timestamp: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
