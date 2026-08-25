// lib/samples.ts
import { BorrowerProfile, LoanApplication, Transaction, TransactionCategory, TransactionType } from './types';

export interface SampleProfile {
  id: string;
  name: string;
  badge: string;
  description: string;
  borrower: BorrowerProfile;
  application: LoanApplication;
  csvContent: string;
  transactions: Transaction[];
}

export const SAMPLE_DATASETS: SampleProfile[] = [
  {
    id: 'sample-healthy-msme',
    name: 'Apex Precision Engineering (MSME)',
    badge: 'Grade A • Strong Cash Flow',
    description: 'B2B auto-component manufacturer with steady recurring OEM settlements, low debt obligations, and high liquidity buffer.',
    borrower: {
      business_name: 'Apex Precision Engineering Pvt Ltd',
      tax_identifier: 'GSTIN-27AABCA1234F1Z5',
      contact_email: 'finance@apexengineering.com',
      borrower_type: 'msme',
      industry: 'Precision Manufacturing',
      years_in_operation: 6,
    },
    application: {
      requested_amount: 1200000,
      tenor_months: 36,
      purpose: 'CNC Machinery Expansion & Working Capital',
      annual_interest_rate: 12.5,
      status: 'processing',
    },
    csvContent: `Date,Narration,Type,Amount,Running_Balance
2024-01-05,Monthly Retainer - Tata Motors Tier 1,Credit,48500.00,85000.00
2024-01-08,Staff Salary & Payroll HDFC Bulk,Debit,16200.00,68800.00
2024-01-10,GST Payment Challan CBIC Portal,Debit,4200.00,64600.00
2024-01-12,Bajaj Finance Machinery Loan EMI,Debit,3500.00,61100.00
2024-01-15,Mahindra OEM Component Settlement,Credit,36400.00,97500.00
2024-01-18,Tata Power Industrial Electricity,Debit,2100.00,95400.00
2024-01-22,AWS Cloud ERP Subscription,Debit,450.00,94950.00
2024-01-28,Raw Material Supplier Steel Neft,Debit,14500.00,80450.00
2024-02-05,Monthly Retainer - Tata Motors Tier 1,Credit,49200.00,129650.00
2024-02-08,Staff Salary & Payroll HDFC Bulk,Debit,16200.00,113450.00
2024-02-10,GST Tax Settlement TIN-NSDL,Debit,3800.00,109650.00
2024-02-12,Bajaj Finance Machinery Loan EMI,Debit,3500.00,106150.00
2024-02-16,Bosch Auto Inward NEFT Settlement,Credit,41000.00,147150.00
2024-02-20,Office Factory Lease Rent,Debit,6000.00,141150.00
2024-02-24,Tata Power Industrial Electricity,Debit,2300.00,138850.00
2024-03-05,Monthly Retainer - Tata Motors Tier 1,Credit,52000.00,190850.00
2024-03-08,Staff Salary & Payroll HDFC Bulk,Debit,16800.00,174050.00
2024-03-12,Bajaj Finance Machinery Loan EMI,Debit,3500.00,170550.00
2024-03-15,Advance Tax Quarter 4 Challan,Debit,6500.00,164050.00
2024-03-18,Ashok Leyland Fleet Component Cr,Credit,39500.00,203550.00
2024-03-24,Tata Power Industrial Electricity,Debit,2400.00,201150.00
2024-04-05,Monthly Retainer - Tata Motors Tier 1,Credit,50500.00,251650.00
2024-04-08,Staff Salary & Payroll HDFC Bulk,Debit,17200.00,234450.00
2024-04-12,Bajaj Finance Machinery Loan EMI,Debit,3500.00,230950.00
2024-04-18,Bosch Auto Inward NEFT Settlement,Credit,44000.00,274950.00
2024-04-22,Industrial Machine Spares Debit,Debit,9500.00,265450.00
2024-04-28,Tata Power Industrial Electricity,Debit,2250.00,263200.00`,
    transactions: [
      { id: 't1', date: '2024-01-05', description: 'Monthly Retainer - Tata Motors Tier 1', amount: 48500, type: TransactionType.CREDIT, category: TransactionCategory.RECURRING_REVENUE, is_recurring: true, running_balance: 85000 },
      { id: 't2', date: '2024-01-08', description: 'Staff Salary & Payroll HDFC Bulk', amount: 16200, type: TransactionType.DEBIT, category: TransactionCategory.SALARY_PAYOUT, is_recurring: true, running_balance: 68800 },
      { id: 't3', date: '2024-01-10', description: 'GST Payment Challan CBIC Portal', amount: 4200, type: TransactionType.DEBIT, category: TransactionCategory.TAX_PAYMENT, is_recurring: false, running_balance: 64600 },
      { id: 't4', date: '2024-01-12', description: 'Bajaj Finance Machinery Loan EMI', amount: 3500, type: TransactionType.DEBIT, category: TransactionCategory.LOAN_EMI, is_recurring: true, running_balance: 61100 },
      { id: 't5', date: '2024-01-15', description: 'Mahindra OEM Component Settlement', amount: 36400, type: TransactionType.CREDIT, category: TransactionCategory.RECURRING_REVENUE, is_recurring: true, running_balance: 97500 },
      { id: 't6', date: '2024-01-18', description: 'Tata Power Industrial Electricity', amount: 2100, type: TransactionType.DEBIT, category: TransactionCategory.UTILITY_OVERHEAD, is_recurring: true, running_balance: 95400 },
      { id: 't7', date: '2024-01-22', description: 'AWS Cloud ERP Subscription', amount: 450, type: TransactionType.DEBIT, category: TransactionCategory.UTILITY_OVERHEAD, is_recurring: true, running_balance: 94950 },
      { id: 't8', date: '2024-01-28', description: 'Raw Material Supplier Steel Neft', amount: 14500, type: TransactionType.DEBIT, category: TransactionCategory.DISCRETIONARY, is_recurring: false, running_balance: 80450 },
      { id: 't9', date: '2024-02-05', description: 'Monthly Retainer - Tata Motors Tier 1', amount: 49200, type: TransactionType.CREDIT, category: TransactionCategory.RECURRING_REVENUE, is_recurring: true, running_balance: 129650 },
      { id: 't10', date: '2024-02-08', description: 'Staff Salary & Payroll HDFC Bulk', amount: 16200, type: TransactionType.DEBIT, category: TransactionCategory.SALARY_PAYOUT, is_recurring: true, running_balance: 113450 },
      { id: 't11', date: '2024-02-10', description: 'GST Tax Settlement TIN-NSDL', amount: 3800, type: TransactionType.DEBIT, category: TransactionCategory.TAX_PAYMENT, is_recurring: false, running_balance: 109650 },
      { id: 't12', date: '2024-02-12', description: 'Bajaj Finance Machinery Loan EMI', amount: 3500, type: TransactionType.DEBIT, category: TransactionCategory.LOAN_EMI, is_recurring: true, running_balance: 106150 },
      { id: 't13', date: '2024-02-16', description: 'Bosch Auto Inward NEFT Settlement', amount: 41000, type: TransactionType.CREDIT, category: TransactionCategory.RECURRING_REVENUE, is_recurring: true, running_balance: 147150 },
      { id: 't14', date: '2024-02-20', description: 'Office Factory Lease Rent', amount: 6000, type: TransactionType.DEBIT, category: TransactionCategory.UTILITY_OVERHEAD, is_recurring: true, running_balance: 141150 },
      { id: 't15', date: '2024-02-24', description: 'Tata Power Industrial Electricity', amount: 2300, type: TransactionType.DEBIT, category: TransactionCategory.UTILITY_OVERHEAD, is_recurring: true, running_balance: 138850 },
      { id: 't16', date: '2024-03-05', description: 'Monthly Retainer - Tata Motors Tier 1', amount: 52000, type: TransactionType.CREDIT, category: TransactionCategory.RECURRING_REVENUE, is_recurring: true, running_balance: 190850 },
      { id: 't17', date: '2024-03-08', description: 'Staff Salary & Payroll HDFC Bulk', amount: 16800, type: TransactionType.DEBIT, category: TransactionCategory.SALARY_PAYOUT, is_recurring: true, running_balance: 174050 },
      { id: 't18', date: '2024-03-12', description: 'Bajaj Finance Machinery Loan EMI', amount: 3500, type: TransactionType.DEBIT, category: TransactionCategory.LOAN_EMI, is_recurring: true, running_balance: 170550 },
      { id: 't19', date: '2024-03-15', description: 'Advance Tax Quarter 4 Challan', amount: 6500, type: TransactionType.DEBIT, category: TransactionCategory.TAX_PAYMENT, is_recurring: false, running_balance: 164050 },
      { id: 't20', date: '2024-03-18', description: 'Ashok Leyland Fleet Component Cr', amount: 39500, type: TransactionType.CREDIT, category: TransactionCategory.NON_RECURRING_REVENUE, is_recurring: false, running_balance: 203550 },
      { id: 't21', date: '2024-03-24', description: 'Tata Power Industrial Electricity', amount: 2400, type: TransactionType.DEBIT, category: TransactionCategory.UTILITY_OVERHEAD, is_recurring: true, running_balance: 201150 },
      { id: 't22', date: '2024-04-05', description: 'Monthly Retainer - Tata Motors Tier 1', amount: 50500, type: TransactionType.CREDIT, category: TransactionCategory.RECURRING_REVENUE, is_recurring: true, running_balance: 251650 },
      { id: 't23', date: '2024-04-08', description: 'Staff Salary & Payroll HDFC Bulk', amount: 17200, type: TransactionType.DEBIT, category: TransactionCategory.SALARY_PAYOUT, is_recurring: true, running_balance: 234450 },
      { id: 't24', date: '2024-04-12', description: 'Bajaj Finance Machinery Loan EMI', amount: 3500, type: TransactionType.DEBIT, category: TransactionCategory.LOAN_EMI, is_recurring: true, running_balance: 230950 },
      { id: 't25', date: '2024-04-18', description: 'Bosch Auto Inward NEFT Settlement', amount: 44000, type: TransactionType.CREDIT, category: TransactionCategory.RECURRING_REVENUE, is_recurring: true, running_balance: 274950 },
      { id: 't26', date: '2024-04-22', description: 'Industrial Machine Spares Debit', amount: 9500, type: TransactionType.DEBIT, category: TransactionCategory.DISCRETIONARY, is_recurring: false, running_balance: 265450 },
      { id: 't27', date: '2024-04-28', description: 'Tata Power Industrial Electricity', amount: 2250, type: TransactionType.DEBIT, category: TransactionCategory.UTILITY_OVERHEAD, is_recurring: true, running_balance: 263200 },
    ],
  },
  {
    id: 'sample-moderate-retail',
    name: 'Urban Brews Hospitality Chain',
    badge: 'Grade B • Moderate Leverage',
    description: 'Multi-outlet specialty cafe chain with high volume digital POS aggregators (Razorpay, Swiggy, Zomato) and moderate rental obligations.',
    borrower: {
      business_name: 'Urban Brews Hospitality LLP',
      tax_identifier: 'GSTIN-07AAECU8890K1ZW',
      contact_email: 'accounts@urbanbrews.cafe',
      borrower_type: 'msme',
      industry: 'Food & Beverage / Retail',
      years_in_operation: 3,
    },
    application: {
      requested_amount: 650000,
      tenor_months: 24,
      purpose: 'New Outlet Renovation & Commercial Espresso Gear',
      annual_interest_rate: 14.0,
      status: 'processing',
    },
    csvContent: `Date,Narration,Type,Amount,Running_Balance
2024-01-03,Razorpay POS Weekly Payout,Credit,18200.00,32000.00
2024-01-07,Swiggy Merchant Settlement Inward,Credit,14500.00,46500.00
2024-01-10,Store Barista & Kitchen Staff Wages,Debit,12800.00,33700.00
2024-01-12,HDFC Commercial Equipment Loan EMI,Debit,4200.00,29500.00
2024-01-15,Zomato Online Orders Payout,Credit,12600.00,42100.00
2024-01-18,Commercial Mall Space Lease Rent,Debit,9500.00,32600.00
2024-01-25,Coffee Bean Roaster Batch Supply,Debit,6800.00,25800.00
2024-02-03,Razorpay POS Weekly Payout,Credit,19400.00,45200.00
2024-02-07,Swiggy Merchant Settlement Inward,Credit,15100.00,60300.00
2024-02-10,Store Barista & Kitchen Staff Wages,Debit,13200.00,47100.00
2024-02-12,HDFC Commercial Equipment Loan EMI,Debit,4200.00,42900.00
2024-02-16,GST Tax Payment Portal,Debit,3100.00,39800.00
2024-02-20,Commercial Mall Space Lease Rent,Debit,9500.00,30300.00
2024-02-28,Dairy Milk & Bakery Supplies Neft,Debit,7400.00,22900.00
2024-03-03,Razorpay POS Weekly Payout,Credit,17900.00,40800.00
2024-03-07,Swiggy Merchant Settlement Inward,Credit,13800.00,54600.00
2024-03-10,Store Barista & Kitchen Staff Wages,Debit,13200.00,41400.00
2024-03-12,HDFC Commercial Equipment Loan EMI,Debit,4200.00,37200.00
2024-03-18,Commercial Mall Space Lease Rent,Debit,9500.00,27700.00
2024-03-26,Zomato Online Orders Payout,Credit,14100.00,41800.00
2024-04-03,Razorpay POS Weekly Payout,Credit,21300.00,63100.00
2024-04-07,Swiggy Merchant Settlement Inward,Credit,16400.00,79500.00
2024-04-10,Store Barista & Kitchen Staff Wages,Debit,13500.00,66000.00
2024-04-12,HDFC Commercial Equipment Loan EMI,Debit,4200.00,61800.00
2024-04-18,Commercial Mall Space Lease Rent,Debit,9500.00,52300.00
2024-04-24,Dairy & Coffee Supplies,Debit,8200.00,44100.00`,
    transactions: [],
  },
  {
    id: 'sample-highrisk-trader',
    name: 'Kuber Commodity Traders',
    badge: 'Grade D • High Risk / Alert',
    description: 'Overleveraged trading firm exhibiting multiple ECS cheque bounce penalties, high irregular cash withdrawals, and heavy debt service burden.',
    borrower: {
      business_name: 'Kuber Commodity Traders Ltd',
      tax_identifier: 'GSTIN-24AAFCK9911P1ZB',
      contact_email: 'kuber.traders@outlook.com',
      borrower_type: 'msme',
      industry: 'Wholesale Commodity Brokerage',
      years_in_operation: 2,
    },
    application: {
      requested_amount: 1500000,
      tenor_months: 18,
      purpose: 'Urgent Debt Restructuring & Margin Call Settlement',
      annual_interest_rate: 18.0,
      status: 'processing',
    },
    csvContent: `Date,Narration,Type,Amount,Running_Balance
2024-01-04,Unregistered Cash Deposit Counter,Credit,35000.00,38000.00
2024-01-06,Tata Capital NBFC Business Loan EMI,Debit,18500.00,19500.00
2024-01-08,Staff Salary Partial,Debit,5000.00,14500.00
2024-01-11,ECS Return Penalty Charge HDFC Bank,Debit,650.00,13850.00
2024-01-14,ATM Cash Withdrawal Self 50000,Debit,12000.00,1850.00
2024-01-16,Chola Finance Overdue Loan Debit,Debit,9500.00,-7650.00
2024-01-17,Overdraft Interest & Penalty Charge,Debit,450.00,-8100.00
2024-01-20,Client Trade Advance Neft Inward,Credit,28000.00,19900.00
2024-01-25,Crypto Exchange Wazirx Outflow,Debit,8000.00,11900.00
2024-02-04,Unregistered Cash Deposit Counter,Credit,32000.00,43900.00
2024-02-06,Tata Capital NBFC Business Loan EMI,Debit,18500.00,25400.00
2024-02-09,Staff Salary Partial,Debit,5000.00,20400.00
2024-02-12,Cheque Bounce Charge Inward Return,Debit,650.00,19750.00
2024-02-15,ATM Cash Withdrawal Self 50000,Debit,14000.00,5750.00
2024-02-22,Chola Finance Overdue Loan Debit,Debit,9500.00,-3750.00
2024-02-28,Casino & Dream11 Card Outflow,Debit,2500.00,-6250.00
2024-03-05,Client Trade Advance Neft Inward,Credit,30000.00,23750.00
2024-03-08,Tata Capital NBFC Business Loan EMI,Debit,18500.00,5250.00
2024-03-12,Cheque Bounce Charge Inward Return,Debit,650.00,4600.00
2024-03-18,Chola Finance Overdue Loan Debit,Debit,9500.00,-4900.00
2024-03-24,ATM Cash Withdrawal Self 50000,Debit,11000.00,-15900.00
2024-03-30,Emergency Cash Deposit Counter,Credit,20000.00,4100.00`,
    transactions: [],
  },
];
