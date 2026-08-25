// app/api/v1/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { performUnderwriting } from '@/lib/underwriting';
import { Store } from '@/lib/store';
import { BorrowerProfile, LoanApplication, Transaction } from '@/lib/types';

function sanitizeStr(str: unknown, max = 150): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F<>]/g, '').trim().substring(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { borrower, application, transactions } = body as {
      borrower?: BorrowerProfile;
      application?: LoanApplication;
      transactions?: Transaction[];
    };

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'Valid transactions list required.' }, { status: 400 });
    }

    if (transactions.length > 5000) {
      return NextResponse.json({ error: 'Transactions batch exceeds maximum allowed limit (5,000 items).' }, { status: 413 });
    }

    const borrowerProfile: BorrowerProfile = {
      business_name: sanitizeStr(borrower?.business_name, 120) || 'MSME Enterprise',
      tax_identifier: sanitizeStr(borrower?.tax_identifier, 50) || 'TAX-001',
      contact_email: sanitizeStr(borrower?.contact_email, 120) || 'finance@borrower.com',
      borrower_type: borrower?.borrower_type === 'individual_proprietor' ? 'individual_proprietor' : borrower?.borrower_type === 'enterprise' ? 'enterprise' : 'msme',
      industry: sanitizeStr(borrower?.industry, 100) || 'MSME Commercial',
    };

    const requestedAmount = Math.max(1000, Math.min(Number(application?.requested_amount) || 50000, 100000000));
    const tenorMonths = Math.max(1, Math.min(Number(application?.tenor_months) || 24, 360));

    const loanApp: LoanApplication = {
      requested_amount: requestedAmount,
      tenor_months: tenorMonths,
      purpose: sanitizeStr(application?.purpose, 200) || 'Working Capital',
      annual_interest_rate: Math.max(1.0, Math.min(Number(application?.annual_interest_rate) || 14.0, 100.0)),
      status: 'processing',
    };

    const report = await performUnderwriting(borrowerProfile, loanApp, transactions.slice(0, 5000));
    Store.saveReport(report);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal analysis error';
    return NextResponse.json({ error: `Analysis error: ${msg}` }, { status: 500 });
  }
}

