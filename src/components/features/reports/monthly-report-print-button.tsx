"use client";

import { Printer } from "lucide-react";

interface MonthlyReportPrintButtonProps {
  companyName: string;
  monthName: string;
}

export function MonthlyReportPrintButton({
  companyName,
  monthName,
}: MonthlyReportPrintButtonProps) {
  function handlePrint() {
    const title = `${companyName} — ${monthName}`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = document.getElementById("monthly-report")?.innerHTML ?? "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #111; padding: 32px; }
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          h2 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; }
          p { color: #555; margin-bottom: 2px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
          .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
          .card .value { font-size: 22px; font-weight: 700; }
          .card .label { font-size: 10px; color: #888; margin-bottom: 4px; }
          .row { display: flex; align-items: center; justify-content: space-between; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; margin-bottom: 6px; }
          .row-title { font-weight: 500; }
          .row-sub { font-size: 10px; color: #888; }
          .badge { display: inline-block; border: 1px solid #d1d5db; border-radius: 4px; padding: 1px 6px; font-size: 10px; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
          a { text-decoration: none; color: inherit; }
          button, [role="button"], nav, .no-print { display: none !important; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        ${content}
        <script>setTimeout(() => { window.print(); window.close(); }, 300);<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium hover:bg-muted transition-colors"
    >
      <Printer className="size-4" />
      PDF drucken
    </button>
  );
}
