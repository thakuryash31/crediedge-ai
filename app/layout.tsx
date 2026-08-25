import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrediEdge AI | MSME Cash Flow Underwriting & Risk Engine",
  description: "AI-powered cash flow parsing, transaction categorization, DSCR analysis, and zero-data-leakage MSME credit underwriting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-orange-500/20 selection:text-orange-900">
        {children}
      </body>
    </html>
  );
}
