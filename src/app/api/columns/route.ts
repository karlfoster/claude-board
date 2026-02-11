import { NextRequest, NextResponse } from 'next/server';
import { createColumn, reorderColumns, getBoard } from '@/lib/store';
import { broadcast } from '@/lib/websocket';

export async function GET() {
  return NextResponse.json(getBoard().columns);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const column = await createColumn(body.title.trim());
    broadcast({ type: 'column_created', payload: { column }, timestamp: new Date().toISOString() });
    return NextResponse.json(column, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.columnIds || !Array.isArray(body.columnIds)) {
      return NextResponse.json({ error: 'columnIds array required' }, { status: 400 });
    }
    const columns = await reorderColumns(body.columnIds);
    broadcast({ type: 'columns_reordered', payload: { columns }, timestamp: new Date().toISOString() });
    return NextResponse.json(columns);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
