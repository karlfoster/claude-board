import { NextResponse } from 'next/server';
import { getBoard } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const board = getBoard();
  return new NextResponse(JSON.stringify(board), {
    headers: { 'Content-Type': 'application/json' },
  });
}
