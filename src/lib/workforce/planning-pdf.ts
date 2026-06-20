import { formatMinutes } from "@/lib/workforce/planning-data";
import type { ShiftRow, TimeAccountSummary } from "@/lib/workforce/workforce-data";
import type { PlanningProfitRow } from "@/lib/workforce/planning-profitability-types";
import { formatEuro } from "@/lib/workforce/planning-profitability-types";

export interface PlanningPdfData {
  title: string;
  companyName: string;
  period: { from: string; to: string };
  summaries: TimeAccountSummary[];
  shifts: ShiftRow[];
  profitability?: {
    byEmployee: PlanningProfitRow[];
    byClient: PlanningProfitRow[];
  };
  labels: {
    employee: string;
    planned: string;
    worked: string;
    utilization: string;
    date: string;
    task: string;
    client: string;
    location: string;
    revenue: string;
    labor: string;
    margin: string;
    shifts: string;
  };
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildHtml(data: PlanningPdfData): string {
  const utilRows = data.summaries
    .map((s) => {
      const cap = s.weeklyHours * 60 * 4.33;
      const pct = cap > 0 ? Math.round((s.istMinutes / cap) * 100) : 0;
      return `<tr>
        <td>${s.employeeName}</td>
        <td>${formatMinutes(s.sollMinutes)}</td>
        <td>${formatMinutes(s.istMinutes)}</td>
        <td>${pct}%</td>
      </tr>`;
    })
    .join("");

  const shiftRows = data.shifts
    .slice(0, 80)
    .map(
      (s) => `<tr>
        <td>${formatDate(s.scheduledDate)}</td>
        <td>${s.employeeName}</td>
        <td>${s.title}</td>
        <td>${s.clientName}</td>
        <td>${s.addressLabel}</td>
      </tr>`,
    )
    .join("");

  const profitEmployeeRows =
    data.profitability?.byEmployee
      .map(
        (r) => `<tr>
        <td>${r.name}</td>
        <td>${r.shiftCount}</td>
        <td>${formatEuro(r.revenueCents)}</td>
        <td>${formatEuro(r.laborCostCents)}</td>
        <td>${formatEuro(r.marginCents)} (${r.marginPct}%)</td>
      </tr>`,
      )
      .join("") ?? "";

  const profitClientRows =
    data.profitability?.byClient
      .map(
        (r) => `<tr>
        <td>${r.name}</td>
        <td>${r.shiftCount}</td>
        <td>${formatEuro(r.revenueCents)}</td>
        <td>${formatEuro(r.laborCostCents)}</td>
        <td>${formatEuro(r.marginCents)} (${r.marginPct}%)</td>
      </tr>`,
      )
      .join("") ?? "";

  const generated = new Date().toLocaleString("de-DE");

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #111; padding: 32px; line-height: 1.45; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 24px; font-size: 10px; }
    h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; margin: 20px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #e5e7eb; padding: 5px 7px; text-align: left; }
    th { background: #f3f4f6; font-size: 10px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${data.title}</h1>
  <div class="meta">${data.companyName} · ${formatDate(data.period.from)} – ${formatDate(data.period.to)} · ${generated}</div>

  <h2>${data.labels.utilization}</h2>
  <table>
    <thead><tr>
      <th>${data.labels.employee}</th><th>${data.labels.planned}</th><th>${data.labels.worked}</th><th>${data.labels.utilization}</th>
    </tr></thead>
    <tbody>${utilRows || `<tr><td colspan="4">—</td></tr>`}</tbody>
  </table>

  <h2>${data.labels.shifts} (${data.shifts.length})</h2>
  <table>
    <thead><tr>
      <th>${data.labels.date}</th><th>${data.labels.employee}</th><th>${data.labels.task}</th><th>${data.labels.client}</th><th>${data.labels.location}</th>
    </tr></thead>
    <tbody>${shiftRows || `<tr><td colspan="5">—</td></tr>`}</tbody>
  </table>

  ${
    data.profitability
      ? `<h2>${data.labels.margin} — ${data.labels.employee}</h2>
  <table>
    <thead><tr><th>${data.labels.employee}</th><th>${data.labels.shifts}</th><th>${data.labels.revenue}</th><th>${data.labels.labor}</th><th>${data.labels.margin}</th></tr></thead>
    <tbody>${profitEmployeeRows}</tbody>
  </table>
  <h2>${data.labels.margin} — ${data.labels.client}</h2>
  <table>
    <thead><tr><th>${data.labels.client}</th><th>${data.labels.shifts}</th><th>${data.labels.revenue}</th><th>${data.labels.labor}</th><th>${data.labels.margin}</th></tr></thead>
    <tbody>${profitClientRows}</tbody>
  </table>`
      : ""
  }
</body>
</html>`;
}

export function openPlanningPdf(data: PlanningPdfData) {
  const html = buildHtml(data);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
