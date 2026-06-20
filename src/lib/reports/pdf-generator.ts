import type { ReportData } from "@/actions/reports/actions";
import { SERVICE_TYPE_LABELS } from "@/config/constants";
import type { ServiceType } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  scheduled: "Geplant",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duration(start: string, end: string | null) {
  if (!end) return "—";
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function generatePdfReport(data: ReportData, title: string) {
  const html = buildHtml(data, title);
  const win = window.open("", "_blank");
  if (!win) { alert("Bitte Popup-Blockierung deaktivieren"); return; }

  win.document.write(html);
  win.document.close();

  win.onload = () => {
    win.focus();
    win.print();
  };
}

function buildHtml(data: ReportData, title: string): string {
  const taskRows = data.tasks
    .map((t) => {
      const addr = t.address
        ? `${t.address.street ?? ""} ${t.address.house_number ?? ""}, ${t.address.city ?? ""}`
        : "—";
      const checkInRows = t.check_ins.length
        ? t.check_ins
            .map(
              (ci) =>
                `<tr class="ci-row">
                  <td>${ci.employee_name}</td>
                  <td>${formatDateTime(ci.check_in_at)}</td>
                  <td>${ci.check_out_at ? formatDateTime(ci.check_out_at) : "—"}</td>
                  <td>${duration(ci.check_in_at, ci.check_out_at)}</td>
                </tr>`,
            )
            .join("")
        : `<tr class="ci-row"><td colspan="4" class="no-data">Kein Check-in</td></tr>`;

      return `
        <div class="task-card">
          <div class="task-header">
            <div>
              <strong>${t.title}</strong>
              <span class="badge">${SERVICE_TYPE_LABELS[t.service_type as ServiceType]?.de ?? t.service_type}</span>
              <span class="badge badge-status">${STATUS_LABELS[t.status] ?? t.status}</span>
            </div>
            <span class="task-date">${formatDate(t.scheduled_date)}</span>
          </div>
          <p class="task-addr">📍 ${addr}</p>
          <table class="ci-table">
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Dauer</th>
              </tr>
            </thead>
            <tbody>${checkInRows}</tbody>
          </table>
        </div>`;
    })
    .join("");

  const generated = new Date().toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      color: #111;
      padding: 40px;
      line-height: 1.5;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 2px solid #3b3bff;
    }
    .report-title { font-size: 20px; font-weight: 700; color: #1a1a2e; }
    .company-name { font-size: 13px; color: #555; margin-top: 2px; }
    .period { font-size: 11px; color: #777; margin-top: 4px; }
    .meta-right { text-align: right; font-size: 11px; color: #777; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .stat-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 14px;
      background: #f9fafb;
    }
    .stat-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
    .stat-value { font-size: 22px; font-weight: 700; color: #1a1a2e; margin-top: 2px; }

    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
      margin-bottom: 12px;
    }

    .task-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 10px;
      break-inside: avoid;
    }
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .task-header strong { font-size: 13px; }
    .task-date { font-size: 11px; color: #777; white-space: nowrap; }
    .task-addr { font-size: 11px; color: #666; margin-bottom: 8px; }

    .badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      background: #e0e7ff;
      color: #3730a3;
      margin-left: 6px;
    }
    .badge-status {
      background: #f0fdf4;
      color: #166534;
    }

    .ci-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .ci-table th {
      text-align: left;
      padding: 4px 6px;
      background: #f3f4f6;
      color: #555;
      font-weight: 600;
      border-bottom: 1px solid #e5e7eb;
    }
    .ci-row td {
      padding: 4px 6px;
      border-bottom: 1px solid #f3f4f6;
    }
    .no-data { color: #aaa; font-style: italic; }

    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #aaa;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      body { padding: 20px; }
      .task-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="report-title">${title}</div>
      <div class="company-name">${data.company.name}${data.company.legal_name ? ` · ${data.company.legal_name}` : ""}</div>
      <div class="period">Zeitraum: ${formatDate(data.period.start)} – ${formatDate(data.period.end)}</div>
    </div>
    <div class="meta-right">
      <div>Erstellt am</div>
      <div style="font-weight:600;color:#111">${generated}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="stat-card">
      <div class="stat-label">Gesamt</div>
      <div class="stat-value">${data.summary.total}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Abgeschlossen</div>
      <div class="stat-value">${data.summary.completed}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">In Bearbeitung</div>
      <div class="stat-value">${data.summary.in_progress}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Check-ins</div>
      <div class="stat-value">${data.summary.total_checkins}</div>
    </div>
  </div>

  <div class="section-title">Aufgaben (${data.summary.total})</div>
  ${taskRows || '<p style="color:#aaa;font-style:italic">Keine Aufgaben im gewählten Zeitraum</p>'}

  <div class="footer">
    <span>FeldOps · Servicemanagement</span>
    <span>Vertraulich · Nur zur internen Verwendung</span>
  </div>
</body>
</html>`;
}
