// lib/underwriting.ts
import {
  Transaction,
  TransactionCategory,
  TransactionType,
  BorrowerProfile,
  LoanApplication,
  MonthlyCashFlow,
  CategoryBreakdown,
  RiskIndicator,
  RiskLevel,
  UnderwritingMetrics,
  UnderwritingDecision,
  UnderwritingReport,
} from './types';
import { generateUnderwritingMemoWithAI } from './gemini';

/**
 * Computes monthly standard EMI given principal, annual interest rate, and tenor in months
 */
export function calculateMonthlyEMI(principal: number, annualRatePct: number, tenorMonths: number): number {
  if (principal <= 0 || tenorMonths <= 0) return 0;
  const monthlyRate = annualRatePct / 12 / 100;
  if (monthlyRate === 0) return principal / tenorMonths;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenorMonths)) / (Math.pow(1 + monthlyRate, tenorMonths) - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Computes maximum safe loan amount given available free monthly cash flow, interest rate, and tenor
 */
export function calculateMaxSafeLoan(availableMonthlyCash: number, annualRatePct: number, tenorMonths: number): number {
  if (availableMonthlyCash <= 0 || tenorMonths <= 0) return 0;
  // Conservative safety buffer: use at most 50% of free monthly cash flow
  const maxSafeEMI = availableMonthlyCash * 0.5;
  const monthlyRate = annualRatePct / 12 / 100;
  if (monthlyRate === 0) return maxSafeEMI * tenorMonths;
  const principal = (maxSafeEMI * (Math.pow(1 + monthlyRate, tenorMonths) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, tenorMonths));
  return Math.round(Math.max(0, principal));
}

/**
 * Aggregates transactions by month
 */
export function calculateMonthlyCashFlows(transactions: Transaction[]): MonthlyCashFlow[] {
  const monthMap = new Map<string, {
    inflow: number;
    outflow: number;
    recurringInflow: number;
    nonRecurringInflow: number;
    loanEmi: number;
    salary: number;
    tax: number;
    utility: number;
    discretionary: number;
    highRisk: number;
    count: number;
    closingBal?: number;
  }>();

  for (const tx of transactions) {
    const month = tx.date ? tx.date.substring(0, 7) : new Date().toISOString().substring(0, 7);
    const existing = monthMap.get(month) || {
      inflow: 0,
      outflow: 0,
      recurringInflow: 0,
      nonRecurringInflow: 0,
      loanEmi: 0,
      salary: 0,
      tax: 0,
      utility: 0,
      discretionary: 0,
      highRisk: 0,
      count: 0,
    };

    existing.count += 1;

    if (tx.type === TransactionType.CREDIT) {
      existing.inflow += tx.amount;
      if (tx.category === TransactionCategory.RECURRING_REVENUE || tx.is_recurring) {
        existing.recurringInflow += tx.amount;
      } else {
        existing.nonRecurringInflow += tx.amount;
      }
    } else {
      existing.outflow += tx.amount;
      if (tx.category === TransactionCategory.LOAN_EMI) existing.loanEmi += tx.amount;
      else if (tx.category === TransactionCategory.SALARY_PAYOUT) existing.salary += tx.amount;
      else if (tx.category === TransactionCategory.TAX_PAYMENT) existing.tax += tx.amount;
      else if (tx.category === TransactionCategory.UTILITY_OVERHEAD) existing.utility += tx.amount;
      else if (tx.category === TransactionCategory.DISCRETIONARY) existing.discretionary += tx.amount;
      else if (tx.category === TransactionCategory.HIGH_RISK_OUTFLOW) existing.highRisk += tx.amount;
    }

    if (tx.running_balance !== undefined) {
      existing.closingBal = tx.running_balance;
    }

    monthMap.set(month, existing);
  }

  const sortedMonths = Array.from(monthMap.keys()).sort();
  let cumulativeBalance = 25000; // Baseline initial balance estimate

  return sortedMonths.map((m) => {
    const data = monthMap.get(m)!;
    const net = data.inflow - data.outflow;
    cumulativeBalance += net;
    const closingBalance = data.closingBal !== undefined ? data.closingBal : cumulativeBalance;

    return {
      month: m,
      total_inflow: Math.round(data.inflow * 100) / 100,
      total_outflow: Math.round(data.outflow * 100) / 100,
      net_cash_flow: Math.round(net * 100) / 100,
      recurring_inflow: Math.round(data.recurringInflow * 100) / 100,
      non_recurring_inflow: Math.round(data.nonRecurringInflow * 100) / 100,
      loan_emi_outflow: Math.round(data.loanEmi * 100) / 100,
      salary_outflow: Math.round(data.salary * 100) / 100,
      tax_outflow: Math.round(data.tax * 100) / 100,
      utility_outflow: Math.round(data.utility * 100) / 100,
      discretionary_outflow: Math.round(data.discretionary * 100) / 100,
      high_risk_outflow: Math.round(data.highRisk * 100) / 100,
      transaction_count: data.count,
      closing_balance: Math.round(closingBalance * 100) / 100,
    };
  });
}

/**
 * Calculates category breakdown statistics
 */
export function calculateCategoryBreakdown(transactions: Transaction[]): CategoryBreakdown[] {
  const categoryLabels: Record<TransactionCategory, { label: string; color: string; type: TransactionType }> = {
    [TransactionCategory.RECURRING_REVENUE]: { label: 'Recurring Revenue', color: '#10B981', type: TransactionType.CREDIT },
    [TransactionCategory.NON_RECURRING_REVENUE]: { label: 'Non-Recurring Sales', color: '#06B6D4', type: TransactionType.CREDIT },
    [TransactionCategory.SALARY_PAYOUT]: { label: 'Payroll & Salaries', color: '#3B82F6', type: TransactionType.DEBIT },
    [TransactionCategory.LOAN_EMI]: { label: 'Existing Loan EMIs', color: '#F59E0B', type: TransactionType.DEBIT },
    [TransactionCategory.UTILITY_OVERHEAD]: { label: 'Utilities & Overhead', color: '#8B5CF6', type: TransactionType.DEBIT },
    [TransactionCategory.TAX_PAYMENT]: { label: 'Statutory Taxes & GST', color: '#EC4899', type: TransactionType.DEBIT },
    [TransactionCategory.HIGH_RISK_OUTFLOW]: { label: 'High Risk / Penalties', color: '#EF4444', type: TransactionType.DEBIT },
    [TransactionCategory.DISCRETIONARY]: { label: 'Discretionary / Misc', color: '#64748B', type: TransactionType.DEBIT },
    [TransactionCategory.UNKNOWN]: { label: 'Uncategorized', color: '#94A3B8', type: TransactionType.DEBIT },
  };

  const totalInflow = transactions.filter((t) => t.type === TransactionType.CREDIT).reduce((s, t) => s + t.amount, 0);
  const totalOutflow = transactions.filter((t) => t.type === TransactionType.DEBIT).reduce((s, t) => s + t.amount, 0);

  const groupMap = new Map<TransactionCategory, { amount: number; count: number }>();

  for (const cat of Object.values(TransactionCategory)) {
    groupMap.set(cat, { amount: 0, count: 0 });
  }

  for (const t of transactions) {
    const curr = groupMap.get(t.category) || { amount: 0, count: 0 };
    curr.amount += t.amount;
    curr.count += 1;
    groupMap.set(t.category, curr);
  }

  const result: CategoryBreakdown[] = [];

  for (const [cat, data] of groupMap.entries()) {
    if (data.count === 0 && data.amount === 0) continue;
    const meta = categoryLabels[cat] || { label: cat, color: '#94A3B8', type: TransactionType.DEBIT };
    const baseTotal = meta.type === TransactionType.CREDIT ? totalInflow : totalOutflow;
    const percentage = baseTotal > 0 ? (data.amount / baseTotal) * 100 : 0;

    result.push({
      category: cat,
      label: meta.label,
      total_amount: Math.round(data.amount * 100) / 100,
      count: data.count,
      percentage_of_flow: Math.round(percentage * 10) / 10,
      type: meta.type,
      color: meta.color,
    });
  }

  return result.sort((a, b) => b.total_amount - a.total_amount);
}

/**
 * Detects specific credit and operational risk flags in the cash flow
 */
export function detectRiskIndicators(transactions: Transaction[], monthlyFlows: MonthlyCashFlow[]): RiskIndicator[] {
  const indicators: RiskIndicator[] = [];

  // 1. High Risk Outflows (Bounce fees, gambling, crypto)
  const highRiskTxs = transactions.filter((t) => t.category === TransactionCategory.HIGH_RISK_OUTFLOW || Boolean(t.risk_flag));
  if (highRiskTxs.length > 0) {
    const totalHighRisk = highRiskTxs.reduce((s, t) => s + t.amount, 0);
    const bounceTxs = highRiskTxs.filter((t) => (t.description + (t.risk_flag || '')).toLowerCase().includes('bounce'));

    if (bounceTxs.length > 0) {
      indicators.push({
        code: 'RISK_BOUNCE_CHARGES',
        title: 'Cheque / NACH Bounce Charges Detected',
        severity: RiskLevel.CRITICAL,
        description: `Found ${bounceTxs.length} inward clearing or ECS bounce charges totaling ₹${bounceTxs.reduce((s, t) => s + t.amount, 0).toLocaleString('en-IN')}. Indicates acute working capital distress.`,
        impact: 'Heavy deduction from credit score and grounds for automatic loan capping.',
        detected_count: bounceTxs.length,
        total_amount: totalHighRisk,
      });
    } else {
      indicators.push({
        code: 'RISK_HIGH_FLAGGED_OUTFLOW',
        title: 'Speculative or Irregular Outflows',
        severity: RiskLevel.HIGH,
        description: `Detected ${highRiskTxs.length} flagged transactions totaling ₹${totalHighRisk.toLocaleString('en-IN')} matching high-risk signatures (e.g. large cash withdrawals, speculative platforms).`,
        impact: 'Increased operational cash leakage requiring scrutiny.',
        detected_count: highRiskTxs.length,
        total_amount: totalHighRisk,
      });
    }
  }

  // 2. Negative Cash Flow Months
  const negativeMonths = monthlyFlows.filter((m) => m.net_cash_flow < 0);
  if (negativeMonths.length > 0) {
    const severity = negativeMonths.length >= 3 ? RiskLevel.CRITICAL : negativeMonths.length === 2 ? RiskLevel.HIGH : RiskLevel.MODERATE;
    indicators.push({
      code: 'RISK_NEGATIVE_CASH_MONTHS',
      title: 'Deficit Cash Flow Cycles',
      severity,
      description: `${negativeMonths.length} out of ${monthlyFlows.length} observed statement months generated negative net cash flows.`,
      impact: 'Borrower frequently burns cash reserves to cover operational overhead.',
      detected_count: negativeMonths.length,
    });
  }

  // 3. Low Recurring Revenue Dependency
  const totalInflow = monthlyFlows.reduce((s, m) => s + m.total_inflow, 0);
  const totalRecurring = monthlyFlows.reduce((s, m) => s + m.recurring_inflow, 0);
  const recurringRatio = totalInflow > 0 ? totalRecurring / totalInflow : 0;

  if (recurringRatio < 0.25) {
    indicators.push({
      code: 'RISK_LOW_RECURRING_INCOME',
      title: 'High Revenue Volatility & Lump-Sum Exposure',
      severity: RiskLevel.MODERATE,
      description: `Only ${(recurringRatio * 100).toFixed(1)}% of total revenues originate from predictable recurring channels.`,
      impact: 'Vulnerability to seasonal demand lulls or delayed client receivables.',
    });
  }

  // 4. Overleveraged Existing Debt (Existing EMI > 35% of Inflows)
  const totalEmi = monthlyFlows.reduce((s, m) => s + m.loan_emi_outflow, 0);
  const emiRatio = totalInflow > 0 ? totalEmi / totalInflow : 0;

  if (emiRatio > 0.35) {
    indicators.push({
      code: 'RISK_HIGH_DEBT_BURDEN',
      title: 'Elevated Pre-Existing Debt Obligations',
      severity: RiskLevel.HIGH,
      description: `Existing loan EMIs consume ${(emiRatio * 100).toFixed(1)}% of total operational revenues (₹${totalEmi.toLocaleString('en-IN')} total).`,
      impact: 'Constrained room for additional principal servicing.',
      total_amount: totalEmi,
    });
  }

  // 5. Zero / Low Statutory Tax Filings
  const totalTax = monthlyFlows.reduce((s, m) => s + m.tax_outflow, 0);
  if (totalTax === 0 && totalInflow > 50000) {
    indicators.push({
      code: 'RISK_NO_TAX_EVIDENCE',
      title: 'No Direct Tax/GST Outflows in Statement',
      severity: RiskLevel.LOW,
      description: 'Zero GST or Advance Tax payments identified directly through this bank account.',
      impact: 'Recommend requesting secondary tax filings (GST Returns, ITR) for verification.',
    });
  }

  return indicators;
}

/**
 * Main Underwriting Calculation Engine
 */
export async function performUnderwriting(
  borrower: BorrowerProfile,
  application: LoanApplication,
  transactions: Transaction[]
): Promise<UnderwritingReport> {
  const monthlyFlows = calculateMonthlyCashFlows(transactions);
  const categoryBreakdowns = calculateCategoryBreakdown(transactions);
  const riskIndicators = detectRiskIndicators(transactions, monthlyFlows);

  const monthsCount = Math.max(1, monthlyFlows.length);
  const totalInflow = monthlyFlows.reduce((s, m) => s + m.total_inflow, 0);
  const totalOutflow = monthlyFlows.reduce((s, m) => s + m.total_outflow, 0);
  const netCashFlow = totalInflow - totalOutflow;

  const avgMonthlyInflow = totalInflow / monthsCount;
  const avgMonthlyOutflow = totalOutflow / monthsCount;
  const avgMonthlyNetCash = netCashFlow / monthsCount;

  // Compute Average Monthly Balance (AMB) & Minimum Monthly Balance (MMB)
  const balances = monthlyFlows.map((m) => m.closing_balance);
  const avgMonthlyBalance = balances.length > 0 ? balances.reduce((s, b) => s + b, 0) / balances.length : 25000;
  const minMonthlyBalance = balances.length > 0 ? Math.min(...balances) : 5000;

  // Recurring Revenue Ratio
  const totalRecurringInflow = monthlyFlows.reduce((s, m) => s + m.recurring_inflow, 0);
  const recurringRatio = totalInflow > 0 ? totalRecurringInflow / totalInflow : 0;

  // Debt & EMI Metrics
  const totalExistingEmi = monthlyFlows.reduce((s, m) => s + m.loan_emi_outflow, 0);
  const existingMonthlyEmi = totalExistingEmi / monthsCount;
  const proposedMonthlyEmi = calculateMonthlyEMI(
    application.requested_amount,
    application.annual_interest_rate || 14.0,
    application.tenor_months || 24
  );

  // DSCR Calculation: (Net Operating Cash Flow before existing EMI) / Total Debt Service
  const operatingCashFlowBeforeDebt = avgMonthlyInflow - (avgMonthlyOutflow - existingMonthlyEmi);
  const historicalDSCR = existingMonthlyEmi > 0 ? operatingCashFlowBeforeDebt / existingMonthlyEmi : operatingCashFlowBeforeDebt > 0 ? 3.5 : 0.8;
  const totalDebtServiceWithProposed = existingMonthlyEmi + proposedMonthlyEmi;
  const projectedDSCR = totalDebtServiceWithProposed > 0 ? operatingCashFlowBeforeDebt / totalDebtServiceWithProposed : 2.0;

  // Fixed Obligation to Income Ratio (FOIR)
  const foir = avgMonthlyInflow > 0 ? (totalDebtServiceWithProposed / avgMonthlyInflow) * 100 : 80;

  // Max Safe Loan Capacity
  const freeMonthlyCash = Math.max(0, avgMonthlyInflow - avgMonthlyOutflow);
  const maxSafeLoan = calculateMaxSafeLoan(
    freeMonthlyCash + (existingMonthlyEmi > 0 ? existingMonthlyEmi * 0.2 : 0),
    application.annual_interest_rate || 14.0,
    application.tenor_months || 24
  );

  // Cash Flow Volatility (Coefficient of variation of monthly inflows)
  let volatility = 0.15;
  if (monthlyFlows.length > 1) {
    const variance =
      monthlyFlows.reduce((acc, m) => acc + Math.pow(m.total_inflow - avgMonthlyInflow, 2), 0) / monthlyFlows.length;
    const stdDev = Math.sqrt(variance);
    volatility = avgMonthlyInflow > 0 ? stdDev / avgMonthlyInflow : 0.5;
  }

  // Credit Score Calculation (300 to 900 scale)
  let score = 720;

  // Score adjustments based on financial fundamentals
  if (projectedDSCR >= 1.5) score += 60;
  else if (projectedDSCR >= 1.25) score += 30;
  else if (projectedDSCR < 1.0) score -= 80;
  else score -= 30;

  if (recurringRatio >= 0.6) score += 50;
  else if (recurringRatio >= 0.35) score += 25;
  else score -= 20;

  if (avgMonthlyNetCash > 0) score += 40;
  else score -= 70;

  if (foir <= 40) score += 30;
  else if (foir > 65) score -= 60;

  // Deduct heavily for risk indicators
  for (const risk of riskIndicators) {
    if (risk.severity === RiskLevel.CRITICAL) score -= 90;
    else if (risk.severity === RiskLevel.HIGH) score -= 45;
    else if (risk.severity === RiskLevel.MODERATE) score -= 20;
  }

  score = Math.round(Math.min(900, Math.max(300, score)));

  // Determine Risk Grade
  let riskGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
  if (score >= 820) riskGrade = 'A+';
  else if (score >= 750) riskGrade = 'A';
  else if (score >= 670) riskGrade = 'B';
  else if (score >= 580) riskGrade = 'C';
  else if (score >= 480) riskGrade = 'D';
  else riskGrade = 'F';

  // Determine Underwriting Decision
  let decision: UnderwritingDecision = UnderwritingDecision.MANUAL_REVIEW_REQUIRED;
  if (score >= 750 && projectedDSCR >= 1.25 && !riskIndicators.some((r) => r.severity === RiskLevel.CRITICAL)) {
    decision = UnderwritingDecision.RECOMMENDED_APPROVAL;
  } else if (score >= 630 && projectedDSCR >= 1.1) {
    decision = UnderwritingDecision.CONDITIONAL_APPROVAL;
  } else if (score < 500 || projectedDSCR < 0.95 || riskIndicators.some((r) => r.severity === RiskLevel.CRITICAL && (r.detected_count || 0) >= 2)) {
    decision = UnderwritingDecision.HIGH_RISK_DECLINE;
  } else {
    decision = UnderwritingDecision.MANUAL_REVIEW_REQUIRED;
  }

  const metrics: UnderwritingMetrics = {
    total_inflow: Math.round(totalInflow * 100) / 100,
    total_outflow: Math.round(totalOutflow * 100) / 100,
    net_cash_flow: Math.round(netCashFlow * 100) / 100,
    average_monthly_inflow: Math.round(avgMonthlyInflow * 100) / 100,
    average_monthly_outflow: Math.round(avgMonthlyOutflow * 100) / 100,
    average_monthly_balance: Math.round(avgMonthlyBalance * 100) / 100,
    minimum_monthly_balance: Math.round(minMonthlyBalance * 100) / 100,
    recurring_revenue_ratio: Math.round(recurringRatio * 1000) / 1000,
    dscr: Math.round(historicalDSCR * 100) / 100,
    foir: Math.round(foir * 10) / 10,
    existing_monthly_emi: Math.round(existingMonthlyEmi * 100) / 100,
    proposed_monthly_emi: Math.round(proposedMonthlyEmi * 100) / 100,
    projected_dscr_with_loan: Math.round(projectedDSCR * 100) / 100,
    max_safe_loan_amount: Math.round(maxSafeLoan),
    cash_flow_volatility: Math.round(volatility * 1000) / 1000,
    months_analyzed: monthsCount,
    risk_score: score,
    risk_grade: riskGrade,
    decision,
  };

  // Generate AI Underwriter Credit Memo
  const memo = await generateUnderwritingMemoWithAI(borrower, application, metrics);

  return {
    application,
    borrower,
    metrics,
    monthly_cash_flows: monthlyFlows,
    category_breakdowns: categoryBreakdowns,
    risk_indicators: riskIndicators,
    executive_summary: memo.executive_summary,
    strengths: memo.strengths,
    risk_factors: memo.risk_factors,
    recommended_covenants: memo.recommended_covenants,
    transactions,
    generated_at: new Date().toISOString(),
  };
}
