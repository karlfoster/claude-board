import { NextRequest, NextResponse } from 'next/server';
import { updateLabel, deleteLabel } from '@/lib/store';
import { broadcast } from '@/lib/websocket';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ labelId: string }> }) {
  try {
    const { labelId } = await params;
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!body.color?.trim()) {
      return NextResponse.json({ error: 'Color is required' }, { status: 400 });
    }
    const label = await updateLabel(labelId, body.name.trim(), body.color.trim());
    broadcast({ type: 'label_updated', payload: { label }, timestamp: new Date().toISOString() });
    return NextResponse.json(label);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ labelId: string }> }) {
  try {
    const { labelId } = await params;
    await deleteLabel(labelId);
    broadcast({ type: 'label_deleted', payload: { labelId }, timestamp: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
