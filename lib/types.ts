// lib/types.ts

export enum TransactionCategory {
  RECURRING_REVENUE = 'recurring_revenue',
  NON_RECURRING_REVENUE = 'non_recurring_revenue',
  SALARY_PAYOUT = 'salary_payout',
  LOAN_EMI = 'loan_emi',
  UTILITY_OVERHEAD = 'utility_overhead',
  TAX_PAYMENT = 'tax_payment',
  HIGH_RISK_OUTFLOW = 'high_risk_outflow',
  DISCRETIONARY = 'discretionary',
  UNKNOWN = 'unknown',
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum UnderwritingDecision {
  RECOMMENDED_APPROVAL = 'recommended_approval',
  CONDITIONAL_APPROVAL = 'conditional_approval',
  MANUAL_REVIEW_REQUIRED = 'manual_review_required',
  HIGH_RISK_DECLINE = 'high_risk_decline',
}

export interface Transaction {
  id?: string;
  cash_flow_id?: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  is_recurring: boolean;
  confidence?: number;
  risk_flag?: string | null;
  running_balance?: number;
}

export interface BorrowerProfile {
  id?: string;
  business_name: string;
  tax_identifier: string;
  contact_email: string;
  borrower_type: 'msme' | 'enterprise' | 'individual_proprietor';
  industry?: string;
  years_in_operation?: number;
}

export interface LoanApplication {
  id?: string;
  borrower_id?: string;
  requested_amount: number;
  tenor_months: number;
  purpose: string;
  annual_interest_rate: number;
  status: 'draft' | 'processing' | 'approved' | 'conditional' | 'rejected';
  created_at?: string;
}

export interface MonthlyCashFlow {
  month: string; // YYYY-MM
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  recurring_inflow: number;
  non_recurring_inflow: number;
  loan_emi_outflow: number;
  salary_outflow: number;
  tax_outflow: number;
  utility_outflow: number;
  discretionary_outflow: number;
  high_risk_outflow: number;
  transaction_count: number;
  closing_balance: number;
}

export interface CategoryBreakdown {
  category: TransactionCategory;
  label: string;
  total_amount: number;
  count: number;
  percentage_of_flow: number;
  type: TransactionType;
  color: string;
}

export interface RiskIndicator {
  code: string;
  title: string;
  severity: RiskLevel;
  description: string;
  impact: string;
  detected_count?: number;
  total_amount?: number;
}

export interface UnderwritingMetrics {
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  average_monthly_inflow: number;
  average_monthly_outflow: number;
  average_monthly_balance: number;
  minimum_monthly_balance: number;
  recurring_revenue_ratio: number; // 0 to 1
  dscr: number; // Debt Service Coverage Ratio
  foir: number; // Fixed Obligation to Income Ratio
  existing_monthly_emi: number;
  proposed_monthly_emi: number;
  projected_dscr_with_loan: number;
  max_safe_loan_amount: number;
  cash_flow_volatility: number; // standard deviation / mean
  months_analyzed: number;
  risk_score: number; // 300 to 900
  risk_grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  decision: UnderwritingDecision;
}

export interface UnderwritingReport {
  application: LoanApplication;
  borrower: BorrowerProfile;
  metrics: UnderwritingMetrics;
  monthly_cash_flows: MonthlyCashFlow[];
  category_breakdowns: CategoryBreakdown[];
  risk_indicators: RiskIndicator[];
  executive_summary: string;
  strengths: string[];
  risk_factors: string[];
  recommended_covenants: string[];
  transactions: Transaction[];
  generated_at: string;
}

export interface IngestionTask {
  task_id: string;
  filename?: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  error?: string;
  transactions_saved?: number;
  data?: Transaction[];
  report?: UnderwritingReport;
}
