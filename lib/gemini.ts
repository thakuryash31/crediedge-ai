// lib/gemini.ts
import { GoogleGenAI, Type } from '@google/genai';
import { Transaction, TransactionCategory, UnderwritingMetrics, BorrowerProfile, LoanApplication } from './types';

let genAIClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

/**
 * Uses Gemini AI to categorize bank statement transactions with high financial accuracy
 */
export async function categorizeTransactionsWithGemini(
  rawSnippet: string,
  transactions: Transaction[]
): Promise<Transaction[]> {
  const client = getGeminiClient();
  if (!client || transactions.length === 0) {
    return transactions;
  }

  try {
    const prompt = `You are a strict financial underwriting AI for MSME cash flow analysis.
Classify each transaction from the list into ONE of these exact categories:
- "recurring_revenue" (standing client contracts, POS payouts, subscription income)
- "non_recurring_revenue" (one-time sales, irregular customer receipts)
- "salary_payout" (payroll, staff wages, employee bonuses)
- "loan_emi" (loan repayments, NBFC installments, mortgages, credit card debt)
- "utility_overhead" (rent, electricity, broadband, cloud software, office bills)
- "tax_payment" (GST, advance income tax, TDS, challans)
- "high_risk_outflow" (bounce penalties, crypto, gambling, sudden round cash withdrawals, speculative transfers)
- "discretionary" (dining, entertainment, personal retail shopping)
- "unknown" (unidentifiable)

Input transactions:
${JSON.stringify(
  transactions.slice(0, 100).map((t, idx) => ({
    index: idx,
    date: t.date,
    description: t.description,
    amount: t.amount,
    type: t.type,
  }))
)}

Return a JSON array where each object has:
- "index": number
- "category": string (one of the 9 categories above)
- "is_recurring": boolean
- "confidence": number (0.0 to 1.0)
- "risk_flag": string or null`;

    const response = await client.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              index: { type: Type.INTEGER },
              category: { type: Type.STRING },
              is_recurring: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              risk_flag: { type: Type.STRING },
            },
            required: ['index', 'category', 'is_recurring'],
          },
        },
      },
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const idx = item.index;
          if (transactions[idx]) {
            const cat = Object.values(TransactionCategory).includes(item.category as TransactionCategory)
              ? (item.category as TransactionCategory)
              : transactions[idx].category;
            transactions[idx].category = cat;
            transactions[idx].is_recurring = Boolean(item.is_recurring);
            if (typeof item.confidence === 'number') {
              transactions[idx].confidence = Math.min(Math.max(item.confidence, 0.1), 1.0);
            }
            if (item.risk_flag) {
              transactions[idx].risk_flag = item.risk_flag;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[CrediEdge AI] Gemini categorization fallback active:', err);
  }

  return transactions;
}

function cleanOutputString(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.replace(/<[^>]*>/g, '').trim();
}

/**
 * Generates an executive AI Underwriting Credit Memo using Gemini
 */
export async function generateUnderwritingMemoWithAI(
  borrower: BorrowerProfile,
  application: LoanApplication,
  metrics: UnderwritingMetrics
): Promise<{
  executive_summary: string;
  strengths: string[];
  risk_factors: string[];
  recommended_covenants: string[];
}> {
  const client = getGeminiClient();
  if (!client) {
    return generateFallbackMemo(borrower, application, metrics);
  }

  try {
    const safeBorrowerName = (borrower.business_name || 'Borrower').replace(/[\r\n"'{}]/g, ' ').substring(0, 100);
    const safeTaxId = (borrower.tax_identifier || 'TAX-001').replace(/[\r\n"'{}]/g, ' ').substring(0, 50);
    const safePurpose = (application.purpose || 'Working Capital').replace(/[\r\n"'{}]/g, ' ').substring(0, 150);

    const prompt = `You are a senior Chief Credit Officer (CCO) at a premier MSME commercial lending institution in India.
Review the following financial underwriting assessment and produce an institutional-grade Credit Memo:

Borrower: ${safeBorrowerName} (${borrower.borrower_type}, Tax ID: ${safeTaxId})
Loan Request: ₹${application.requested_amount.toLocaleString('en-IN')} over ${application.tenor_months} months at ${application.annual_interest_rate}% annual interest (Purpose: ${safePurpose})

Underwriting Financial Metrics:
- Total Inflow: ₹${metrics.total_inflow.toLocaleString('en-IN')}
- Total Outflow: ₹${metrics.total_outflow.toLocaleString('en-IN')}
- Net Cash Flow: ₹${metrics.net_cash_flow.toLocaleString('en-IN')}
- Average Monthly Inflow: ₹${metrics.average_monthly_inflow.toLocaleString('en-IN')}
- Average Monthly Balance (AMB): ₹${metrics.average_monthly_balance.toLocaleString('en-IN')}
- Minimum Monthly Balance: ₹${metrics.minimum_monthly_balance.toLocaleString('en-IN')}
- Recurring Revenue Share: ${(metrics.recurring_revenue_ratio * 100).toFixed(1)}%
- Existing Monthly EMI Obligation: ₹${metrics.existing_monthly_emi.toLocaleString('en-IN')}
- Proposed Monthly Loan EMI: ₹${metrics.proposed_monthly_emi.toLocaleString('en-IN')}
- Historical DSCR: ${metrics.dscr.toFixed(2)}x
- Projected DSCR with new loan: ${metrics.projected_dscr_with_loan.toFixed(2)}x
- Max Safe Loan Capacity: ₹${metrics.max_safe_loan_amount.toLocaleString('en-IN')}
- Risk Score: ${metrics.risk_score}/1000 (Grade ${metrics.risk_grade})
- Decision: ${metrics.decision}

Generate a structured JSON output with:
1. "executive_summary": A 2-3 paragraph sharp credit synthesis in Indian Rupees (₹).
2. "strengths": 3 to 5 clear quantitative credit positives using ₹ currency.
3. "risk_factors": 2 to 4 key cash flow vulnerabilities or risks.
4. "recommended_covenants": 3 actionable loan sanction covenants/stipulations.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executive_summary: { type: Type.STRING },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            risk_factors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommended_covenants: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['executive_summary', 'strengths', 'risk_factors', 'recommended_covenants'],
        },
      },
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      return {
        executive_summary: cleanOutputString(parsed.executive_summary),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(cleanOutputString).filter(Boolean) : [],
        risk_factors: Array.isArray(parsed.risk_factors) ? parsed.risk_factors.map(cleanOutputString).filter(Boolean) : [],
        recommended_covenants: Array.isArray(parsed.recommended_covenants) ? parsed.recommended_covenants.map(cleanOutputString).filter(Boolean) : [],
      };
    }
  } catch (err) {
    console.warn('[CrediEdge AI] Gemini memo generation fallback active:', err);
  }

  return generateFallbackMemo(borrower, application, metrics);
}


function generateFallbackMemo(
  borrower: BorrowerProfile,
  application: LoanApplication,
  metrics: UnderwritingMetrics
): {
  executive_summary: string;
  strengths: string[];
  risk_factors: string[];
  recommended_covenants: string[];
} {
  const isHealthy = metrics.risk_score >= 700;
  const isModerate = metrics.risk_score >= 550 && metrics.risk_score < 700;

  const executive_summary = `CrediEdge AI underwriting assessment for ${borrower.business_name} indicates an institutional risk score of ${metrics.risk_score}/1000 (Grade ${metrics.risk_grade}). With an average monthly revenue inflow of ₹${metrics.average_monthly_inflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })} and a net cash surplus of ₹${metrics.net_cash_flow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}, the business demonstrates ${isHealthy ? 'robust operating resilience and consistent debt servicing ability' : isModerate ? 'adequate operational cash flows with moderate leverage constraints' : 'strained cash flow volatility and tight liquidity margins'}. 

The proposed loan amount of ₹${application.requested_amount.toLocaleString('en-IN')} over ${application.tenor_months} months results in an estimated monthly installment of ₹${metrics.proposed_monthly_emi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}, yielding a projected post-issuance DSCR of ${metrics.projected_dscr_with_loan.toFixed(2)}x against our baseline threshold of 1.25x.`;

  const strengths: string[] = [
    `Recurring revenue represents ${(metrics.recurring_revenue_ratio * 100).toFixed(1)}% of total cash inflows, supporting predictability.`,
    `Average Monthly Balance (AMB) stands at ₹${metrics.average_monthly_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}, providing comfortable liquidity buffer.`,
    metrics.dscr >= 1.5
      ? `Strong historical DSCR of ${metrics.dscr.toFixed(2)}x well above the benchmark 1.20x threshold.`
      : `Consistent salary and supplier clearing history observed across parsed statement cycles.`,
  ];

  const risk_factors: string[] = [];
  if (metrics.recurring_revenue_ratio < 0.35) {
    risk_factors.push('Substantial reliance on non-recurring, lumpy customer receipts creating periodic collection gaps.');
  }
  if (metrics.projected_dscr_with_loan < 1.2) {
    risk_factors.push(`Projected DSCR (${metrics.projected_dscr_with_loan.toFixed(2)}x) tightens post-loan debt service headroom below optimal comfort band.`);
  }
  if (metrics.minimum_monthly_balance < metrics.proposed_monthly_emi) {
    risk_factors.push(`Minimum monthly balance dipping to ₹${metrics.minimum_monthly_balance.toLocaleString('en-IN')} may trigger payment stress during lean cycles.`);
  }
  if (risk_factors.length === 0) {
    risk_factors.push('Market-driven working capital cycles require continued monitoring of receivables aging.');
  }

  const recommended_covenants: string[] = [
    'Establish primary operating account routing requirement with minimum 70% business collection mandate.',
    `Mandate quarterly submission of GST/Tax filing receipts and updated bank statements.`,
    `Cap maximum incremental debt obligations to preserve DSCR at or above 1.25x.`,
  ];

  return {
    executive_summary,
    strengths,
    risk_factors,
    recommended_covenants,
  };
}
