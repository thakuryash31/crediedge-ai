// app/api/v1/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'operational',
    system: 'CrediEdge AI Core',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
