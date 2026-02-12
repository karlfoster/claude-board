import { NextRequest, NextResponse } from 'next/server';
import { createLabel, getBoard } from '@/lib/store';
import { broadcast } from '@/lib/websocket';

export async function GET() {
  return NextResponse.json(getBoard().labels);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!body.color?.trim()) {
      return NextResponse.json({ error: 'Color is required' }, { status: 400 });
    }
    const label = await createLabel(body.name.trim(), body.color.trim());
    broadcast({ type: 'label_created', payload: { label }, timestamp: new Date().toISOString() });
    return NextResponse.json(label, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
