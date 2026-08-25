// app/api/v1/status/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sanitizedId = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);

  if (!sanitizedId) {
    return NextResponse.json({ error: 'Invalid task ID format.' }, { status: 400 });
  }

  const task = Store.getTask(sanitizedId);

  if (!task) {
    return NextResponse.json({ error: 'Task ID not found.' }, { status: 404 });
  }

  return NextResponse.json(task);
}

