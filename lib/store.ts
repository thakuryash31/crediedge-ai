// lib/store.ts
import { IngestionTask, BorrowerProfile, LoanApplication, UnderwritingReport } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Max items per in-memory store to prevent Memory Exhaustion (DoS)
const MAX_STORE_ENTRIES = 500;

function setBounded<K, V>(map: Map<K, V>, key: K, value: V, max = MAX_STORE_ENTRIES): void {
  if (map.size >= max) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    }
  }
  map.set(key, value);
}

// In-Memory storage maps with bounded capacity
const TASK_STORE = new Map<string, IngestionTask>();
const BORROWER_STORE = new Map<string, BorrowerProfile>();
const APPLICATION_STORE = new Map<string, LoanApplication>();
const REPORT_STORE = new Map<string, UnderwritingReport>();

// Optional Supabase Client
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (url && key) {
    if (!supabaseClient) {
      try {
        supabaseClient = createClient(url, key);
      } catch (err) {
        console.warn('[CrediEdge AI] Supabase initialization notice:', err instanceof Error ? err.message : 'failed');
      }
    }
    return supabaseClient;
  }
  return null;
}

export const Store = {
  // Task Management
  setTask(id: string, task: IngestionTask) {
    const sanitizedId = String(id).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    setBounded(TASK_STORE, sanitizedId, task);
  },

  getTask(id: string): IngestionTask | undefined {
    const sanitizedId = String(id).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    return TASK_STORE.get(sanitizedId);
  },

  // Borrower Management
  saveBorrower(borrower: BorrowerProfile): BorrowerProfile {
    const rawId = borrower.id || `borrower_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const id = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    const saved = { ...borrower, id };
    setBounded(BORROWER_STORE, id, saved);

    // Optional Supabase persist
    const sb = getSupabaseClient();
    if (sb) {
      void Promise.resolve(
        sb.from('borrowers').insert({
          id,
          business_name: saved.business_name,
          tax_identifier: saved.tax_identifier,
          contact_email: saved.contact_email,
          borrower_type: saved.borrower_type,
        })
      ).catch((e: Error) => {
        console.warn('Supabase borrower insert notice:', e.message);
      });
    }

    return saved;
  },

  getBorrower(id: string): BorrowerProfile | undefined {
    const sanitizedId = String(id).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    return BORROWER_STORE.get(sanitizedId);
  },

  // Loan Application Management
  saveApplication(app: LoanApplication): LoanApplication {
    const rawId = app.id || `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const id = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    const saved = { ...app, id, created_at: app.created_at || new Date().toISOString() };
    setBounded(APPLICATION_STORE, id, saved);

    // Optional Supabase persist
    const sb = getSupabaseClient();
    if (sb) {
      void Promise.resolve(
        sb.from('applications').insert({
          id,
          borrower_id: saved.borrower_id,
          requested_amount: saved.requested_amount,
          status: saved.status,
        })
      ).catch((e: Error) => {
        console.warn('Supabase application insert notice:', e.message);
      });
    }

    return saved;
  },

  getApplication(id: string): LoanApplication | undefined {
    const sanitizedId = String(id).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    return APPLICATION_STORE.get(sanitizedId);
  },

  // Underwriting Report Management
  saveReport(report: UnderwritingReport): UnderwritingReport {
    const rawId = report.application.id || `rep_${Date.now()}`;
    const id = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    setBounded(REPORT_STORE, id, report);
    return report;
  },

  getReport(id: string): UnderwritingReport | undefined {
    const sanitizedId = String(id).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    return REPORT_STORE.get(sanitizedId);
  },
};

