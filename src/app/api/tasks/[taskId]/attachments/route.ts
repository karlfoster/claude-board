import { NextRequest, NextResponse } from 'next/server';
import { addAttachment, removeAttachment } from '@/lib/store';
import { broadcast } from '@/lib/websocket';

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { task, attachment } = await addAttachment(taskId, file.name, buffer);
    broadcast({ type: 'task_updated', payload: { task }, timestamp: new Date().toISOString() });
    return NextResponse.json(attachment);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const { attachmentId } = await request.json();
    if (!attachmentId) {
      return NextResponse.json({ error: 'No attachmentId provided' }, { status: 400 });
    }
    const task = await removeAttachment(taskId, attachmentId);
    broadcast({ type: 'task_updated', payload: { task }, timestamp: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
