'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import {
  ShieldCheck,
  Building2,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  IndianRupee,
  PieChart as PieIcon,
  BarChart3,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Printer,
  ChevronRight,
  Info,
  Lock,
  Layers,
  Activity,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  Transaction,
  TransactionCategory,
  TransactionType,
  BorrowerProfile,
  LoanApplication,
  UnderwritingReport,
  UnderwritingDecision,
  RiskLevel,
} from '@/lib/types';
import { SAMPLE_DATASETS, SampleProfile } from '@/lib/samples';

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  [TransactionCategory.RECURRING_REVENUE]: 'Recurring Revenue',
  [TransactionCategory.NON_RECURRING_REVENUE]: 'Non-Recurring Sales',
  [TransactionCategory.SALARY_PAYOUT]: 'Payroll & Salaries',
  [TransactionCategory.LOAN_EMI]: 'Loan EMIs',
  [TransactionCategory.UTILITY_OVERHEAD]: 'Utilities & Overhead',
  [TransactionCategory.TAX_PAYMENT]: 'Tax / GST',
  [TransactionCategory.HIGH_RISK_OUTFLOW]: 'High Risk Outflows',
  [TransactionCategory.DISCRETIONARY]: 'Discretionary / Misc',
  [TransactionCategory.UNKNOWN]: 'Uncategorized',
};

export default function UnderwritingApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'memo' | 'ingest'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [selectedSample, setSelectedSample] = useState<string>(SAMPLE_DATASETS[0].id);

  // Core State
  const [borrower, setBorrower] = useState<BorrowerProfile>(SAMPLE_DATASETS[0].borrower);
  const [application, setApplication] = useState<LoanApplication>(SAMPLE_DATASETS[0].application);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [report, setReport] = useState<UnderwritingReport | null>(null);

  // File Upload / Paste state
  const [uploadMode, setUploadMode] = useState<'sample' | 'file' | 'paste'>('sample');
  const [pastedText, setPastedText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Ledger Filter & Search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState<string>('all');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('all');

  const fileInputId = useId();

  // Load initial sample
  useEffect(() => {
    loadSampleDataset(SAMPLE_DATASETS[0]);
  }, []);

  const loadSampleDataset = async (sample: SampleProfile) => {
    setIsLoading(true);
    setUploadError(null);
    try {
      setBorrower(sample.borrower);
      setApplication(sample.application);
      setSelectedSample(sample.id);

      const res = await fetch('/api/v1/upload-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: sample.csvContent,
          filename: `${sample.id}.csv`,
          business_name: sample.borrower.business_name,
          tax_identifier: sample.borrower.tax_identifier,
          requested_amount: sample.application.requested_amount,
          tenor_months: sample.application.tenor_months,
          purpose: sample.application.purpose,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setTransactions(data.report.transactions || []);
      } else {
        setUploadError(data.error || 'Failed to process statement');
      }
    } catch (err) {
      console.error('Failed to load sample:', err);
      setUploadError('Failed to load sample dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setUploadError(null);
    try {
      const text = await file.text();
      const res = await fetch('/api/v1/upload-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          filename: file.name,
          business_name: borrower.business_name,
          tax_identifier: borrower.tax_identifier,
          requested_amount: application.requested_amount,
          tenor_months: application.tenor_months,
          purpose: application.purpose,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setTransactions(data.report.transactions || []);
        setActiveTab('dashboard');
      } else {
        setUploadError(data.error || 'Failed to process statement file.');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError('Error reading or uploading statement file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    setIsLoading(true);
    setUploadError(null);
    try {
      const res = await fetch('/api/v1/upload-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: pastedText,
          filename: 'pasted_records.txt',
          business_name: borrower.business_name,
          tax_identifier: borrower.tax_identifier,
          requested_amount: application.requested_amount,
          tenor_months: application.tenor_months,
          purpose: application.purpose,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setTransactions(data.report.transactions || []);
        setActiveTab('dashboard');
      } else {
        setUploadError(data.error || 'Failed to process pasted content.');
      }
    } catch (err) {
      console.error('Paste submit failed:', err);
      setUploadError('Error processing text statement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculateUnderwriting = async (updatedTxs: Transaction[], updatedApp?: LoanApplication) => {
    setIsAiProcessing(true);
    try {
      const targetApp = updatedApp || application;
      const res = await fetch('/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrower,
          application: targetApp,
          transactions: updatedTxs,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setTransactions(data.report.transactions || updatedTxs);
      }
    } catch (err) {
      console.error('Recalculation error:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleCategoryChange = (txId: string | undefined, newCategory: TransactionCategory) => {
    if (!txId) return;
    const updated = transactions.map((t) => {
      if (t.id === txId) {
        return {
          ...t,
          category: newCategory,
          is_recurring: newCategory === TransactionCategory.RECURRING_REVENUE || newCategory === TransactionCategory.LOAN_EMI || newCategory === TransactionCategory.SALARY_PAYOUT,
        };
      }
      return t;
    });
    setTransactions(updated);
    handleRecalculateUnderwriting(updated);
  };

  // Filtered transactions for the ledger
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        t.amount.toString().includes(ledgerSearch) ||
        t.date.includes(ledgerSearch);

      const matchesCat = ledgerCategoryFilter === 'all' || t.category === ledgerCategoryFilter;
      const matchesType = ledgerTypeFilter === 'all' || t.type === ledgerTypeFilter;

      return matchesSearch && matchesCat && matchesType;
    });
  }, [transactions, ledgerSearch, ledgerCategoryFilter, ledgerTypeFilter]);

  // Decision presentation helpers
  const getDecisionBadge = (decision?: UnderwritingDecision) => {
    switch (decision) {
      case UnderwritingDecision.RECOMMENDED_APPROVAL:
        return {
          label: 'Recommended Approval',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        };
      case UnderwritingDecision.CONDITIONAL_APPROVAL:
        return {
          label: 'Conditional Approval',
          color: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        };
      case UnderwritingDecision.HIGH_RISK_DECLINE:
        return {
          label: 'High Risk - Decline',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <XCircle className="w-5 h-5 text-rose-600" />,
        };
      default:
        return {
          label: 'Manual Review Required',
          color: 'bg-orange-50 text-orange-800 border-orange-200',
          icon: <Info className="w-5 h-5 text-orange-600" />,
        };
    }
  };

  const decisionBadge = getDecisionBadge(report?.metrics.decision);

  return (
    <div id="crediedge-root" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header id="main-header" className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20 text-white">
              <ShieldCheck className="w-6 h-6 text-white font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">CrediEdge<span className="text-orange-600 font-extrabold">.AI</span></span>
                <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  MSME Underwriter
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Cash Flow Ingestion, DSCR Scoring & Zero-Leakage Risk Engine</p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50/60 border border-orange-200/60 text-xs text-orange-800 font-medium">
              <Lock className="w-3.5 h-3.5 text-orange-600" />
              <span>Zero-Data-Leakage Mode</span>
            </div>

            <button
              id="btn-switch-sample"
              onClick={() => setActiveTab('ingest')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-300 shadow-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-600' : 'text-slate-500'}`} />
              <span>Ingest / Switch Case</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Borrower & Loan Overview Card */}
        <section id="borrower-summary-banner" className="p-5 rounded-2xl bg-white border border-slate-200/90 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-600">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{borrower.business_name}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono font-medium">
                  {borrower.tax_identifier}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 font-medium">
                  {borrower.industry || 'MSME Enterprise'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 flex-wrap">
                <span>Requested: <strong className="text-slate-900 font-semibold">₹{application.requested_amount.toLocaleString('en-IN')}</strong></span>
                <span>•</span>
                <span>Tenor: <strong className="text-slate-900 font-semibold">{application.tenor_months} Mos</strong></span>
                <span>•</span>
                <span>Purpose: <span className="text-slate-700 font-medium">{application.purpose}</span></span>
                <span>•</span>
                <span>Interest: <strong className="text-slate-900 font-semibold">{application.annual_interest_rate}% APR</strong></span>
              </div>
            </div>
          </div>

          {/* Underwriting Verdict Pill */}
          {report && (
            <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Credit Score</div>
                <div className="text-2xl font-black text-slate-900 flex items-baseline justify-end gap-1 font-mono">
                  <span>{report.metrics.risk_score}</span>
                  <span className="text-xs font-normal text-slate-400">/ 900</span>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-semibold text-sm shadow-xs ${decisionBadge.color}`}>
                {decisionBadge.icon}
                <span>{decisionBadge.label}</span>
              </div>
            </div>
          )}
        </section>

        {/* Navigation Tabs */}
        <nav id="app-tabs" className="flex border-b border-slate-200 space-x-2">
          <button
            id="tab-btn-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'dashboard'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Underwriting Dashboard</span>
          </button>
          <button
            id="tab-btn-ledger"
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'ledger'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categorized Ledger ({transactions.length})</span>
          </button>
          <button
            id="tab-btn-memo"
            onClick={() => setActiveTab('memo')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'memo'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Credit Committee Memo</span>
          </button>
          <button
            id="tab-btn-ingest"
            onClick={() => setActiveTab('ingest')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'ingest'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Statement Ingest & Config</span>
          </button>
        </nav>

        {/* Tab 1: Underwriting Dashboard */}
        {activeTab === 'dashboard' && report && (
          <div className="space-y-6">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div id="kpi-inflow" className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Monthly Inflow Avg</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
                  ₹{report.metrics.average_monthly_inflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Total: ₹{report.metrics.total_inflow.toLocaleString('en-IN')}</span>
                  <span className="text-emerald-600 font-semibold">{(report.metrics.recurring_revenue_ratio * 100).toFixed(0)}% Recurring</span>
                </div>
              </div>

              <div id="kpi-dscr" className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Projected DSCR (Post-Loan)</span>
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className={`mt-2 text-2xl font-bold font-mono ${
                  report.metrics.projected_dscr_with_loan >= 1.25 ? 'text-emerald-600' : report.metrics.projected_dscr_with_loan >= 1.0 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {report.metrics.projected_dscr_with_loan.toFixed(2)}x
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Benchmark: 1.25x</span>
                  <span>Hist DSCR: {report.metrics.dscr.toFixed(2)}x</span>
                </div>
              </div>

              <div id="kpi-netcash" className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Net Cash Surplus</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className={`mt-2 text-2xl font-bold font-mono ${report.metrics.net_cash_flow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{report.metrics.net_cash_flow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>AMB: ₹{report.metrics.average_monthly_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  <span>Min: ₹{report.metrics.minimum_monthly_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              <div id="kpi-safe-capacity" className="p-4 rounded-xl bg-white border border-orange-200 shadow-xs ring-1 ring-orange-500/10">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Max Safe Loan Capacity</span>
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold text-orange-600 font-mono">
                  ₹{report.metrics.max_safe_loan_amount.toLocaleString('en-IN')}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Proposed EMI: ₹{report.metrics.proposed_monthly_emi.toLocaleString('en-IN')}/mo</span>
                  <span>FOIR: {report.metrics.foir}%</span>
                </div>
              </div>
            </div>

            {/* Risk Warnings Banner (if any) */}
            {report.risk_indicators.length > 0 && (
              <div id="risk-indicators-panel" className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Detected Underwriting Risk Triggers ({report.risk_indicators.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {report.risk_indicators.map((risk, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white border border-rose-200 text-xs space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-800">{risk.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          risk.severity === RiskLevel.CRITICAL
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : risk.severity === RiskLevel.HIGH
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-slate-600">{risk.description}</p>
                      <p className="text-slate-500 italic">Impact: {risk.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Inflow vs Outflow */}
              <div id="chart-cashflow-trends" className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Monthly Cash Inflows vs Outflows</h3>
                    <p className="text-xs text-slate-500">Chronological trajectory across parsed bank statement</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Inflow</span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Outflow</span>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.monthly_cash_flows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'k')} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: unknown) => {
                          const num = typeof val === 'number' ? val : Number(val);
                          return !isNaN(num) ? [`₹${num.toLocaleString('en-IN')}`, ''] : ['-', ''];
                        }}
                      />
                      <Bar dataKey="total_inflow" name="Inflows" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total_outflow" name="Outflows" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expense Category Breakdown Donut */}
              <div id="chart-category-breakdown" className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Cash Flow Category Distribution</h3>
                    <p className="text-xs text-slate-500">Categorized financial breakdown</p>
                  </div>
                  <PieIcon className="w-4 h-4 text-orange-500" />
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.category_breakdowns}
                        dataKey="total_amount"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {report.category_breakdowns.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: unknown) => {
                          const num = typeof val === 'number' ? val : Number(val);
                          return !isNaN(num) ? [`₹${num.toLocaleString('en-IN')}`, ''] : ['-', ''];
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="text-[11px] text-slate-600 font-medium">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Balance Trajectory Over Time */}
              <div id="chart-balance-trajectory" className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Closing Bank Balance Trajectory</h3>
                    <p className="text-xs text-slate-500">Account liquidity reserve progression</p>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={report.monthly_cash_flows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'k')} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: unknown) => {
                          const num = typeof val === 'number' ? val : Number(val);
                          return !isNaN(num) ? [`₹${num.toLocaleString('en-IN')}`, 'Closing Balance'] : ['-', ''];
                        }}
                      />
                      <Line type="monotone" dataKey="closing_balance" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, fill: '#ea580c' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recurring vs Non-Recurring Revenue Stability */}
              <div id="chart-revenue-quality" className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Revenue Quality & Predictability</h3>
                    <p className="text-xs text-slate-500">Recurring client contracts vs one-time receipts</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-slate-700 font-medium"><span className="w-2 h-2 rounded bg-emerald-500"></span> Recurring</span>
                    <span className="flex items-center gap-1 text-slate-700 font-medium"><span className="w-2 h-2 rounded bg-orange-500"></span> Non-Recurring</span>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.monthly_cash_flows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => '₹' + (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : (v / 1000).toFixed(0) + 'k')} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: unknown) => {
                          const num = typeof val === 'number' ? val : Number(val);
                          return !isNaN(num) ? [`₹${num.toLocaleString('en-IN')}`, ''] : ['-', ''];
                        }}
                      />
                      <Bar dataKey="recurring_inflow" name="Recurring" fill="#10b981" stackId="a" />
                      <Bar dataKey="non_recurring_inflow" name="Non-Recurring" fill="#f97316" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick Interactive Loan Capacity Slider */}
            <div id="loan-simulator" className="p-5 rounded-2xl bg-white border border-orange-200/80 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-600" />
                    Interactive Loan Tenor & Capacity Stress-Test
                  </h3>
                  <p className="text-xs text-slate-500">Modify principal or tenor to see live projected DSCR and debt impact</p>
                </div>
                {isAiProcessing && (
                  <span className="text-xs text-orange-600 font-medium flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" /> Recalculating AI metrics...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>Requested Amount</span>
                    <strong className="text-orange-600 font-mono text-sm">₹{application.requested_amount.toLocaleString('en-IN')}</strong>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="5000000"
                    step="25000"
                    value={application.requested_amount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const updated = { ...application, requested_amount: val };
                      setApplication(updated);
                      handleRecalculateUnderwriting(transactions, updated);
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-medium">
                    <span>₹50,000</span>
                    <span>₹50,00,000</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>Tenor (Months)</span>
                    <strong className="text-slate-900 font-mono text-sm">{application.tenor_months} Mos</strong>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="60"
                    step="6"
                    value={application.tenor_months}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const updated = { ...application, tenor_months: val };
                      setApplication(updated);
                      handleRecalculateUnderwriting(transactions, updated);
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-medium">
                    <span>6 Mos</span>
                    <span>60 Mos</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>Interest Rate (% APR)</span>
                    <strong className="text-slate-900 font-mono text-sm">{application.annual_interest_rate}%</strong>
                  </div>
                  <input
                    type="range"
                    min="8.0"
                    max="24.0"
                    step="0.5"
                    value={application.annual_interest_rate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const updated = { ...application, annual_interest_rate: val };
                      setApplication(updated);
                      handleRecalculateUnderwriting(transactions, updated);
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-medium">
                    <span>8%</span>
                    <span>24%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Categorized Transaction Ledger */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search narration, amount, date..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Filter className="w-3.5 h-3.5 text-orange-600" />
                  <span>Category:</span>
                </div>
                <select
                  value={ledgerCategoryFilter}
                  onChange={(e) => setLedgerCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:border-orange-500"
                >
                  <option value="all">All Categories ({transactions.length})</option>
                  {Object.values(TransactionCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>

                <select
                  value={ledgerTypeFilter}
                  onChange={(e) => setLedgerTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:border-orange-500"
                >
                  <option value="all">All Types</option>
                  <option value="credit">Credits (Inflows)</option>
                  <option value="debit">Debits (Outflows)</option>
                </select>
              </div>
            </div>

            {/* Transaction Table */}
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-mono">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Narration / Particulars</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Underwriting Category</th>
                      <th className="py-3 px-4 text-center">Recurring</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No transactions found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const isCredit = tx.type === TransactionType.CREDIT;
                        const isHighRisk = tx.category === TransactionCategory.HIGH_RISK_OUTFLOW || Boolean(tx.risk_flag);

                        return (
                          <tr
                            key={tx.id}
                            className={`hover:bg-slate-50 transition ${
                              isHighRisk ? 'bg-rose-50/60' : ''
                            }`}
                          >
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">{tx.date}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">{tx.description}</div>
                              {tx.risk_flag && (
                                <div className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" /> {tx.risk_flag}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isCredit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold">
                              <span className={isCredit ? 'text-emerald-700' : 'text-slate-800'}>
                                {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <select
                                value={tx.category}
                                onChange={(e) => handleCategoryChange(tx.id, e.target.value as TransactionCategory)}
                                className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-orange-500"
                              >
                                {Object.values(TransactionCategory).map((cat) => (
                                  <option key={cat} value={cat}>
                                    {CATEGORY_LABELS[cat]}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {tx.is_recurring ? (
                                <span className="inline-flex items-center text-emerald-700 text-[11px] font-semibold gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Yes
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">No</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Credit Committee Memo */}
        {activeTab === 'memo' && report && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Institutional Underwriter Credit Memo
                </h2>
                <p className="text-xs text-slate-500">Comprehensive credit evaluation and risk audit</p>
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-300 shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print / Save PDF</span>
              </button>
            </div>

            <div id="printable-memo" className="p-8 rounded-2xl bg-white border border-slate-200 space-y-6 shadow-sm text-slate-800 text-sm leading-relaxed">
              {/* Header Box */}
              <div className="border-b border-slate-200 pb-5 flex justify-between items-start flex-wrap gap-4">
                <div>
                  <div className="text-xs uppercase font-mono tracking-widest text-orange-600 font-bold">CrediEdge AI • Credit Assessment</div>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">{borrower.business_name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                    <span>Tax ID: {borrower.tax_identifier}</span>
                    <span>•</span>
                    <span>Date: {new Date(report.generated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border font-bold text-xs uppercase ${decisionBadge.color}`}>
                    {decisionBadge.icon}
                    <span>{decisionBadge.label}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">Score: {report.metrics.risk_score}/900 (Grade {report.metrics.risk_grade})</div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase text-xs tracking-wider text-orange-700">1. Executive Credit Synthesis</h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{report.executive_summary}</p>
              </div>

              {/* Core Underwriting Matrix */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase text-xs tracking-wider text-orange-700">2. Financial Underwriting Baseline</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium">Avg Monthly Inflow</span>
                    <div className="text-base font-bold text-slate-900 font-mono mt-0.5">₹{report.metrics.average_monthly_inflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium">Projected DSCR</span>
                    <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">{report.metrics.projected_dscr_with_loan.toFixed(2)}x</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium">Recurring Ratio</span>
                    <div className="text-base font-bold text-slate-900 font-mono mt-0.5">{(report.metrics.recurring_revenue_ratio * 100).toFixed(1)}%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium">Max Safe Capacity</span>
                    <div className="text-base font-bold text-orange-600 font-mono mt-0.5">₹{report.metrics.max_safe_loan_amount.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>

              {/* Strengths */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase text-xs tracking-wider text-emerald-700">3. Primary Credit Strengths</h4>
                <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                  {report.strengths.map((s, idx) => (
                    <li key={idx} className="pl-1">{s}</li>
                  ))}
                </ul>
              </div>

              {/* Risk Factors */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase text-xs tracking-wider text-rose-700">4. Key Risk Factors & Vulnerabilities</h4>
                <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                  {report.risk_factors.map((r, idx) => (
                    <li key={idx} className="pl-1">{r}</li>
                  ))}
                </ul>
              </div>

              {/* Recommended Covenants */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase text-xs tracking-wider text-orange-700">5. Recommended Sanction Covenants</h4>
                <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                  {report.recommended_covenants.map((c, idx) => (
                    <li key={idx} className="pl-1">{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Statement Ingest & Config */}
        {activeTab === 'ingest' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Bank Statement Ingestion Engine</h2>
                <p className="text-xs text-slate-500">Select a pre-configured MSME loan case or upload raw CSV / bank statement exports</p>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setUploadMode('sample')}
                  className={`py-2 rounded-lg font-medium transition ${
                    uploadMode === 'sample' ? 'bg-white text-orange-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Realistic Sample Cases
                </button>
                <button
                  onClick={() => setUploadMode('file')}
                  className={`py-2 rounded-lg font-medium transition ${
                    uploadMode === 'file' ? 'bg-white text-orange-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Upload File (CSV / TXT)
                </button>
                <button
                  onClick={() => setUploadMode('paste')}
                  className={`py-2 rounded-lg font-medium transition ${
                    uploadMode === 'paste' ? 'bg-white text-orange-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paste Raw Statement
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Sample Case Selector */}
              {uploadMode === 'sample' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Select MSME Profile:</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {SAMPLE_DATASETS.map((sample) => (
                      <div
                        key={sample.id}
                        onClick={() => loadSampleDataset(sample)}
                        className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          selectedSample === sample.id
                            ? 'bg-orange-50/50 border-orange-500 shadow-sm ring-1 ring-orange-500/30'
                            : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                            {sample.badge}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">{sample.name}</h4>
                          <p className="text-xs text-slate-600 leading-normal">{sample.description}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-mono font-semibold">₹{sample.application.requested_amount.toLocaleString('en-IN')}</span>
                          <span className="text-orange-600 font-semibold flex items-center gap-1">
                            Load Case <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File Upload Zone */}
              {uploadMode === 'file' && (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center gap-3 ${
                      dragOver ? 'border-orange-500 bg-orange-50/60' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                    }`}
                  >
                    <UploadCloud className="w-10 h-10 text-orange-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Drag & Drop bank statement (CSV, TXT, PDF export)</p>
                      <p className="text-xs text-slate-500 mt-1">Supports HDFC, ICICI, SBI, Axis, standard POS & UPI exports</p>
                    </div>
                    <label
                      htmlFor={fileInputId}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer transition shadow-xs"
                    >
                      Browse Files
                    </label>
                    <input
                      id={fileInputId}
                      type="file"
                      accept=".csv,.txt,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Paste Raw Statement */}
              {uploadMode === 'paste' && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-700">Paste Bank Statement / Pipe / CSV Records:</label>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Date,Narration,Type,Amount\n2024-01-05,Client Contract Payout,Credit,45000\n2024-01-08,Staff Salary Transfer,Debit,12000\n2024-01-12,Loan EMI Repayment,Debit,3500`}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                  <button
                    onClick={handlePasteSubmit}
                    disabled={!pastedText.trim() || isLoading}
                    className="px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs font-semibold text-white transition flex items-center gap-2 shadow-xs"
                  >
                    {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Parse & Run Underwriting</span>
                  </button>
                </div>
              )}

              {/* Borrower Profile Inputs */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Borrower & Loan Application Parameters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1">Company / Business Name</label>
                    <input
                      type="text"
                      value={borrower.business_name}
                      onChange={(e) => setBorrower({ ...borrower, business_name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1">Tax ID / GSTIN / PAN</label>
                    <input
                      type="text"
                      value={borrower.tax_identifier}
                      onChange={(e) => setBorrower({ ...borrower, tax_identifier: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1">Requested Loan Principal (₹)</label>
                    <input
                      type="number"
                      value={application.requested_amount}
                      onChange={(e) => setApplication({ ...application, requested_amount: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-orange-500 focus:bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1">Loan Purpose</label>
                    <input
                      type="text"
                      value={application.purpose}
                      onChange={(e) => setApplication({ ...application, purpose: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 font-medium">
        CrediEdge AI • Zero-Data-Leakage Underwriting & Cash Flow Intelligence • Standardized for MSME Banking
      </footer>
    </div>
  );
}
