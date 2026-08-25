// lib/parser.ts
import Papa from 'papaparse';
import { Transaction, TransactionCategory, TransactionType } from './types';

// Financial Keyword Rules for Heuristic Classification
const CATEGORY_RULES: {
  category: TransactionCategory;
  type: TransactionType;
  keywords: string[];
  recurring: boolean;
}[] = [
  {
    category: TransactionCategory.LOAN_EMI,
    type: TransactionType.DEBIT,
    keywords: [
      'emi', 'loan', 'bajaj finance', 'hdb financial', 'chola', 'muthoot', 'tata capital',
      'hdfc bank loan', 'sbi loan', 'icici home', 'auto debit loan', 'ach debit loan',
      'nach/loan', 'repayment', 'mortgage', 'nbfc', 'credit card payment', 'axis bank loan'
    ],
    recurring: true,
  },
  {
    category: TransactionCategory.SALARY_PAYOUT,
    type: TransactionType.DEBIT,
    keywords: [
      'salary', 'payroll', 'wages', 'staff payout', 'emp transfer', 'stipend',
      'bonus', 'provident fund', 'epfo', 'pf contribution', 'gratuity', 'hr payout'
    ],
    recurring: true,
  },
  {
    category: TransactionCategory.TAX_PAYMENT,
    type: TransactionType.DEBIT,
    keywords: [
      'gst', 'income tax', 'tds', 'advance tax', 'challan', 'tin-nsdl', 'cbic',
      'goods and services', 'municipal tax', 'property tax', 'custom duty', 'incometax'
    ],
    recurring: false,
  },
  {
    category: TransactionCategory.UTILITY_OVERHEAD,
    type: TransactionType.DEBIT,
    keywords: [
      'electricity', 'power corp', 'bescom', 'msedcl', 'tata power', 'airtel',
      'jio broadband', 'bsnl', 'vodafone', 'water board', 'office rent', 'lease rent',
      'aws', 'cloud server', 'google workspace', 'microsoft azure', 'zoho', 'software sub',
      'internet bill', 'maintenance charges'
    ],
    recurring: true,
  },
  {
    category: TransactionCategory.HIGH_RISK_OUTFLOW,
    type: TransactionType.DEBIT,
    keywords: [
      'bounce fee', 'ecs bounce', 'cheque return', 'inward return', 'penalty charge',
      'overdraft charge', 'minimum balance penalty', 'dream11', 'rummy', 'mpl',
      'poker', 'casino', 'betting', 'binance', 'wazirx', 'coindcx', 'crypto',
      'cash withdrawal atm high', 'atm wdl 50000', 'suspicious transfer', 'self transfer cash'
    ],
    recurring: false,
  },
  {
    category: TransactionCategory.RECURRING_REVENUE,
    type: TransactionType.CREDIT,
    keywords: [
      'monthly retainer', 'subscription', 'client amc', 'pos settlement', 'merchant payout',
      'razorpay settlement', 'stripe payout', 'paytm merchant', 'swiggy settlement',
      'zomato settlement', 'amazon seller', 'flipkart seller', 'contract revenue',
      'inward ach', 'standing instruction cr', 'auto credit sales'
    ],
    recurring: true,
  },
  {
    category: TransactionCategory.NON_RECURRING_REVENUE,
    type: TransactionType.CREDIT,
    keywords: [
      'invoice', 'client payment', 'sales collection', 'upi collection', 'neft cr',
      'rtgs cr', 'imps cr', 'cash deposit counter', 'cheque deposit', 'consulting fee',
      'trade receipt', 'advance from customer'
    ],
    recurring: false,
  },
  {
    category: TransactionCategory.DISCRETIONARY,
    type: TransactionType.DEBIT,
    keywords: [
      'starbucks', 'cafe', 'restaurant', 'uber', 'ola', 'swiggy order', 'zomato order',
      'movie', 'bookmyshow', 'hotel booking', 'air tickets', 'entertainment',
      'amazon retail', 'flipkart purchase', 'shopping', 'supermarket', 'blinkit', 'zepto'
    ],
    recurring: false,
  },
];

/**
 * Classifies a single transaction based on heuristic rules
 */
export function classifyTransactionHeuristically(
  description: string,
  amount: number,
  type: TransactionType
): { category: TransactionCategory; is_recurring: boolean; confidence: number; risk_flag: string | null } {
  const descLower = description.toLowerCase();

  // 1. Check for specific high risk triggers first
  if (
    descLower.includes('bounce') ||
    descLower.includes('return') ||
    descLower.includes('penalty') ||
    descLower.includes('insufficient funds') ||
    descLower.includes('chq ret')
  ) {
    return {
      category: TransactionCategory.HIGH_RISK_OUTFLOW,
      is_recurring: false,
      confidence: 0.95,
      risk_flag: 'Cheque/ECS Return or Financial Penalty Detected',
    };
  }

  if (
    descLower.includes('casino') ||
    descLower.includes('betting') ||
    descLower.includes('rummy') ||
    descLower.includes('dream11') ||
    descLower.includes('crypto') ||
    descLower.includes('wazirx')
  ) {
    return {
      category: TransactionCategory.HIGH_RISK_OUTFLOW,
      is_recurring: false,
      confidence: 0.92,
      risk_flag: 'Speculative / Gambling / Crypto Outflow',
    };
  }

  // 2. Check rule bank matching the transaction type
  for (const rule of CATEGORY_RULES) {
    if (rule.type === type) {
      for (const kw of rule.keywords) {
        if (descLower.includes(kw)) {
          return {
            category: rule.category,
            is_recurring: rule.recurring,
            confidence: 0.88,
            risk_flag: rule.category === TransactionCategory.HIGH_RISK_OUTFLOW ? 'Flagged Outflow' : null,
          };
        }
      }
    }
  }

  // 3. Fallback matching
  if (type === TransactionType.CREDIT) {
    if (descLower.includes('payout') || descLower.includes('settlement') || descLower.includes('pos')) {
      return {
        category: TransactionCategory.RECURRING_REVENUE,
        is_recurring: true,
        confidence: 0.75,
        risk_flag: null,
      };
    }
    return {
      category: TransactionCategory.NON_RECURRING_REVENUE,
      is_recurring: false,
      confidence: 0.65,
      risk_flag: null,
    };
  } else {
    if (descLower.includes('rent') || descLower.includes('lease') || descLower.includes('bill')) {
      return {
        category: TransactionCategory.UTILITY_OVERHEAD,
        is_recurring: true,
        confidence: 0.78,
        risk_flag: null,
      };
    }
    if (amount > 100000 && (descLower.includes('cash') || descLower.includes('self'))) {
      return {
        category: TransactionCategory.HIGH_RISK_OUTFLOW,
        is_recurring: false,
        confidence: 0.85,
        risk_flag: 'High-Value Cash Outflow (> 100k)',
      };
    }
    return {
      category: TransactionCategory.DISCRETIONARY,
      is_recurring: false,
      confidence: 0.55,
      risk_flag: null,
    };
  }
}

/**
 * Sanitizes transaction descriptions and neutralizes CSV Formula Injection (DDE attacks)
 */
export function sanitizeDescription(desc?: string): string {
  if (!desc) return 'Bank Transaction';
  // Strip control and binary non-printable characters
  let clean = desc.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').trim();
  // Neutralize CSV Formula Injection (=, +, -, @, tab, return)
  if (/^[=+\-@\t\r]/.test(clean)) {
    clean = `'${clean}`;
  }
  return clean.substring(0, 250);
}

/**
 * Parses raw CSV string into normalized Transaction objects
 */
export function parseCSVStatement(csvContent: string): Transaction[] {
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const transactions: Transaction[] = [];
  const maxRows = 5000; // Limit processing to prevent CPU/memory exhaustion

  for (const row of result.data.slice(0, maxRows)) {
    const keys = Object.keys(row);
    if (keys.length === 0) continue;

    // Find date field
    const dateKey = keys.find((k) => k.includes('date') || k.includes('txn_date') || k.includes('valuedate') || k.includes('time'));
    const rawDate = dateKey ? row[dateKey]?.trim() : '';

    // Find description / narration field
    const descKey = keys.find(
      (k) =>
        k.includes('desc') ||
        k.includes('narrat') ||
        k.includes('particular') ||
        k.includes('detail') ||
        k.includes('remark') ||
        k.includes('payee') ||
        k.includes('beneficiary')
    );
    const description = sanitizeDescription(descKey ? row[descKey] : 'Bank Transaction');

    // Find debit / credit / amount fields
    const debitKey = keys.find((k) => k.includes('debit') || k.includes('dr') || k.includes('withdrawal') || k.includes('outflow'));
    const creditKey = keys.find((k) => k.includes('credit') || k.includes('cr') || k.includes('deposit') || k.includes('inflow'));
    const amountKey = keys.find((k) => k.includes('amount') || k.includes('txn_amt') || k.includes('value'));
    const typeKey = keys.find((k) => k.includes('type') || k.includes('cr_dr') || k.includes('d_c'));
    const balanceKey = keys.find((k) => k.includes('balance') || k.includes('bal') || k.includes('running_bal'));

    let type: TransactionType = TransactionType.DEBIT;
    let amount = 0;

    const parseNum = (val?: string) => {
      if (!val) return 0;
      const clean = val.replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : Math.abs(n);
    };

    const debitVal = debitKey ? parseNum(row[debitKey]) : 0;
    const creditVal = creditKey ? parseNum(row[creditKey]) : 0;
    const amountVal = amountKey ? parseNum(row[amountKey]) : 0;
    const runningBalance = balanceKey ? parseNum(row[balanceKey]) : undefined;

    if (creditVal > 0) {
      type = TransactionType.CREDIT;
      amount = creditVal;
    } else if (debitVal > 0) {
      type = TransactionType.DEBIT;
      amount = debitVal;
    } else if (amountVal > 0) {
      amount = amountVal;
      if (typeKey) {
        const tStr = (row[typeKey] || '').toLowerCase();
        if (tStr.includes('cr') || tStr.includes('credit') || tStr.includes('in')) {
          type = TransactionType.CREDIT;
        } else {
          type = TransactionType.DEBIT;
        }
      } else {
        // Fallback guess based on description
        if (description.toLowerCase().includes('deposit') || description.toLowerCase().includes('cr') || description.toLowerCase().includes('refund')) {
          type = TransactionType.CREDIT;
        } else {
          type = TransactionType.DEBIT;
        }
      }
    }

    if (amount <= 0 && !description) continue;

    const normalizedDate = normalizeDateString(rawDate);
    const classification = classifyTransactionHeuristically(description, amount, type);

    transactions.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: normalizedDate,
      description,
      amount: Math.round(amount * 100) / 100,
      type,
      category: classification.category,
      is_recurring: classification.is_recurring,
      confidence: classification.confidence,
      risk_flag: classification.risk_flag,
      running_balance: runningBalance,
    });
  }

  // Sort chronologically
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return transactions;
}

/**
 * Parses pipe-separated or unstructured text lines
 */
export function parseTextStatement(rawText: string): Transaction[] {
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const transactions: Transaction[] = [];
  const maxLines = 5000;

  for (const line of lines.slice(0, maxLines)) {
    if (line.toLowerCase().includes('date') && (line.toLowerCase().includes('amount') || line.toLowerCase().includes('balance'))) {
      continue; // Skip header line
    }

    if (line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 3) {
        const dateStr = parts[0];
        const rawDesc = parts[1];
        const amtStr = parts[2];
        const typeStr = parts[3] || '';

        const desc = sanitizeDescription(rawDesc);
        const amount = parseFloat(amtStr.replace(/,/g, '').replace(/[^\d.-]/g, '')) || 0;
        let type = TransactionType.DEBIT;
        if (
          typeStr.toLowerCase().includes('cr') ||
          typeStr.toLowerCase().includes('credit') ||
          desc.toLowerCase().includes('credit') ||
          desc.toLowerCase().includes('neft cr') ||
          desc.toLowerCase().includes('rtgs cr')
        ) {
          type = TransactionType.CREDIT;
        }

        if (amount > 0) {
          const classification = classifyTransactionHeuristically(desc, amount, type);
          transactions.push({
            id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            date: normalizeDateString(dateStr),
            description: desc,
            amount: Math.round(amount * 100) / 100,
            type,
            category: classification.category,
            is_recurring: classification.is_recurring,
            confidence: classification.confidence,
            risk_flag: classification.risk_flag,
          });
        }
      }
    } else {
      // Regex pattern matching: YYYY-MM-DD or DD/MM/YYYY + text + amount + optional Cr/Dr
      const dateMatch = line.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
      const amountMatch = line.match(/(?:Rs\.?|INR|\$)?\s*([0-9,]+\.[0-9]{2}|[0-9,]+)/);

      if (dateMatch && amountMatch) {
        const rawDate = dateMatch[0];
        const amt = parseFloat(amountMatch[1].replace(/,/g, '')) || 0;
        let rawDesc = line.replace(rawDate, '').replace(amountMatch[0], '').trim();
        rawDesc = rawDesc.replace(/^[-:|, ]+|[-:|, ]+$/g, '');
        const desc = sanitizeDescription(rawDesc || 'Statement Transaction');

        let type = TransactionType.DEBIT;
        if (line.toLowerCase().includes('cr') || line.toLowerCase().includes('credit') || line.toLowerCase().includes('deposit')) {
          type = TransactionType.CREDIT;
        }

        if (amt > 0) {
          const classification = classifyTransactionHeuristically(desc, amt, type);
          transactions.push({
            id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            date: normalizeDateString(rawDate),
            description: desc,
            amount: Math.round(amt * 100) / 100,
            type,
            category: classification.category,
            is_recurring: classification.is_recurring,
            confidence: classification.confidence,
            risk_flag: classification.risk_flag,
          });
        }
      }
    }
  }

  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return transactions;
}


/**
 * Normalizes date representations into standard YYYY-MM-DD
 */
export function normalizeDateString(rawDate: string): string {
  if (!rawDate) {
    return new Date().toISOString().split('T')[0];
  }

  const clean = rawDate.trim();

  // Check standard ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // Fallback to JS Date parsing
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}
