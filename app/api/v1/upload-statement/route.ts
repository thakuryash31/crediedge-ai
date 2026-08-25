// app/api/v1/upload-statement/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseCSVStatement, parseTextStatement } from '@/lib/parser';
import { categorizeTransactionsWithGemini } from '@/lib/gemini';
import { performUnderwriting } from '@/lib/underwriting';
import { Store } from '@/lib/store';
import { BorrowerProfile, LoanApplication, IngestionTask } from '@/lib/types';

// Cybersecurity Safeguards
const MAX_RAW_TEXT_BYTES = 10 * 1024 * 1024; // 10MB max upload size

function sanitizeInputString(str: unknown, maxLen = 150): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F<>]/g, '').trim().substring(0, maxLen);
}

function sanitizeFilename(name: unknown): string {
  if (typeof name !== 'string') return 'statement.csv';
  // Strip path traversal characters (../, ..\, /, \)
  const base = name.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.substring(0, 100) || 'statement.csv';
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let rawText = '';
    let filename = 'statement.csv';
    let requestedAmount = 50000;
    let tenorMonths = 24;
    let businessName = 'MSME Borrower';
    let taxId = 'TAX-AUTO-01';
    let email = 'finance@borrower.com';
    let purpose = 'Working Capital Expansion';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const textContent = formData.get('text') as string | null;

      if (formData.get('business_name')) businessName = sanitizeInputString(formData.get('business_name'), 120);
      if (formData.get('tax_identifier')) taxId = sanitizeInputString(formData.get('tax_identifier'), 50);
      if (formData.get('contact_email')) email = sanitizeInputString(formData.get('contact_email'), 120);
      if (formData.get('requested_amount')) requestedAmount = parseFloat(String(formData.get('requested_amount'))) || 50000;
      if (formData.get('tenor_months')) tenorMonths = parseInt(String(formData.get('tenor_months')), 10) || 24;
      if (formData.get('purpose')) purpose = sanitizeInputString(formData.get('purpose'), 200);

      if (file) {
        if (file.size > MAX_RAW_TEXT_BYTES) {
          return NextResponse.json({ error: 'File size exceeds maximum allowed limit (10MB).' }, { status: 413 });
        }
        filename = sanitizeFilename(file.name);
        rawText = await file.text();
      } else if (textContent) {
        if (textContent.length > MAX_RAW_TEXT_BYTES) {
          return NextResponse.json({ error: 'Payload exceeds maximum allowed size (10MB).' }, { status: 413 });
        }
        rawText = textContent;
        filename = 'pasted_statement.txt';
      } else {
        return NextResponse.json({ error: 'No file or statement content provided.' }, { status: 400 });
      }
    } else {
      const body = await req.json();
      rawText = typeof body.content === 'string' ? body.content : typeof body.text === 'string' ? body.text : typeof body.csv === 'string' ? body.csv : '';
      
      if (rawText.length > MAX_RAW_TEXT_BYTES) {
        return NextResponse.json({ error: 'Payload exceeds maximum allowed size (10MB).' }, { status: 413 });
      }

      filename = sanitizeFilename(body.filename || 'statement.csv');
      if (body.business_name) businessName = sanitizeInputString(body.business_name, 120);
      if (body.tax_identifier) taxId = sanitizeInputString(body.tax_identifier, 50);
      if (body.contact_email) email = sanitizeInputString(body.contact_email, 120);
      if (body.requested_amount) requestedAmount = parseFloat(body.requested_amount) || 50000;
      if (body.tenor_months) tenorMonths = parseInt(body.tenor_months, 10) || 24;
      if (body.purpose) purpose = sanitizeInputString(body.purpose, 200);
    }

    // Sanitize loan bounds
    requestedAmount = Math.max(1000, Math.min(requestedAmount, 100000000));
    tenorMonths = Math.max(1, Math.min(tenorMonths, 360));

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ error: 'Statement content is empty.' }, { status: 400 });
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Initial Parsing
    let transactions = rawText.includes(',')
      ? parseCSVStatement(rawText)
      : parseTextStatement(rawText);

    if (transactions.length === 0) {
      // Fallback try pipe/text parsing
      transactions = parseTextStatement(rawText);
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract valid financial transactions from the provided file. Please verify format.' },
        { status: 422 }
      );
    }

    // 2. AI Categorization Enhancement (Gemini or heuristic)
    transactions = await categorizeTransactionsWithGemini(rawText.substring(0, 2000), transactions);

    // 3. Store Borrower and Application
    const borrower: BorrowerProfile = Store.saveBorrower({
      business_name: businessName || 'MSME Enterprise',
      tax_identifier: taxId || 'TAX-AUTO-01',
      contact_email: email || 'finance@borrower.com',
      borrower_type: 'msme',
      industry: 'MSME Commercial',
    });

    const application: LoanApplication = Store.saveApplication({
      borrower_id: borrower.id,
      requested_amount: requestedAmount,
      tenor_months: tenorMonths,
      purpose: purpose || 'Working Capital',
      annual_interest_rate: 14.0,
      status: 'processing',
    });

    // 4. Perform Full Financial Underwriting Analysis
    const report = await performUnderwriting(borrower, application, transactions);
    Store.saveReport(report);

    // 5. Complete Task
    const task: IngestionTask = {
      task_id: taskId,
      filename,
      status: 'completed',
      created_at: new Date().toISOString(),
      transactions_saved: transactions.length,
      data: transactions,
      report,
    };
    Store.setTask(taskId, task);

    return NextResponse.json({
      message: 'Statement parsed and categorized successfully.',
      task_id: taskId,
      status: 'completed',
      transactions_saved: transactions.length,
      borrower,
      application,
      report,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal processing error';
    console.error('Upload statement error:', err);
    return NextResponse.json({ error: `Processing error: ${errorMsg}` }, { status: 500 });
  }
}

