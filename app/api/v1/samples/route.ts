// app/api/v1/samples/route.ts
import { NextResponse } from 'next/server';
import { SAMPLE_DATASETS } from '@/lib/samples';

export async function GET() {
  return NextResponse.json({
    samples: SAMPLE_DATASETS.map((s) => ({
      id: s.id,
      name: s.name,
      badge: s.badge,
      description: s.description,
      borrower: s.borrower,
      application: s.application,
      csvContent: s.csvContent,
    })),
  });
}
