import "server-only";

interface ServiceReportPayload {
  taskTitle: string;
  serviceType: string;
  scheduledDate: string;
  clientName: string;
  addressLine: string;
  employeeName: string;
  companyName: string;
  checkInAt: string;
  checkOutAt: string;
  durationMinutes: number;
  checklist: Array<{ text: string; checked: boolean }>;
  photos: Array<{ type: string; url: string }>;
  clientSignatureUrl?: string | null;
  signedClientName?: string | null;
  notes?: string | null;
  locale?: string;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDt(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildServiceReportHtml(data: ServiceReportPayload): string {
  const locale = data.locale ?? "pt";
  const labels =
    locale === "en"
      ? {
          title: "Service Report",
          client: "Client",
          address: "Address",
          employee: "Technician",
          checkIn: "Check-in",
          checkOut: "Check-out",
          duration: "Duration",
          checklist: "Checklist",
          photos: "Photos",
          signature: "Client signature",
          notes: "Notes",
          minutes: "min",
        }
      : {
          title: "Relatório de Serviço",
          client: "Cliente",
          address: "Morada",
          employee: "Técnico",
          checkIn: "Entrada",
          checkOut: "Saída",
          duration: "Duração",
          checklist: "Checklist",
          photos: "Fotos",
          signature: "Assinatura do cliente",
          notes: "Notas",
          minutes: "min",
        };

  const checklistHtml =
    data.checklist.length === 0
      ? `<p class="muted">—</p>`
      : `<ul>${data.checklist
          .map(
            (item) =>
              `<li><span class="${item.checked ? "done" : ""}">${item.checked ? "✓" : "○"} ${esc(item.text)}</span></li>`,
          )
          .join("")}</ul>`;

  const photosHtml =
    data.photos.length === 0
      ? `<p class="muted">—</p>`
      : `<div class="photos">${data.photos
          .map(
            (p) =>
              `<figure><img src="${esc(p.url)}" alt="${esc(p.type)}" /><figcaption>${esc(p.type)}</figcaption></figure>`,
          )
          .join("")}</div>`;

  const signatureHtml = data.clientSignatureUrl
    ? `<div class="signature"><p><strong>${labels.signature}</strong> — ${esc(data.signedClientName ?? "")}</p><img src="${esc(data.clientSignatureUrl)}" alt="signature" /></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${esc(labels.title)} — ${esc(data.taskTitle)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; font-size: 13px; color: #111; margin: 24px; line-height: 1.5; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #666; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; }
    .card dt { font-size: 11px; color: #666; text-transform: uppercase; }
    .card dd { margin: 2px 0 0; font-weight: 600; }
    h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    ul { padding-left: 18px; margin: 0; }
    .done { text-decoration: line-through; color: #666; }
    .photos { display: flex; flex-wrap: wrap; gap: 12px; }
    .photos figure { margin: 0; max-width: 180px; }
    .photos img { width: 100%; border-radius: 6px; border: 1px solid #ddd; }
    .photos figcaption { font-size: 11px; color: #666; margin-top: 4px; }
    .signature img { max-width: 240px; border-bottom: 1px solid #111; }
    .muted { color: #999; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h1>${esc(labels.title)}</h1>
  <p class="meta">${esc(data.taskTitle)} · ${esc(data.serviceType)} · ${esc(data.scheduledDate)}</p>
  <div class="grid">
    <div class="card"><dl><dt>${labels.client}</dt><dd>${esc(data.clientName)}</dd></dl></div>
    <div class="card"><dl><dt>${labels.employee}</dt><dd>${esc(data.employeeName)}</dd></dl></div>
    <div class="card" style="grid-column: span 2"><dl><dt>${labels.address}</dt><dd>${esc(data.addressLine)}</dd></dl></div>
    <div class="card"><dl><dt>${labels.checkIn}</dt><dd>${formatDt(data.checkInAt, locale)}</dd></dl></div>
    <div class="card"><dl><dt>${labels.checkOut}</dt><dd>${formatDt(data.checkOutAt, locale)}</dd></dl></div>
    <div class="card"><dl><dt>${labels.duration}</dt><dd>${data.durationMinutes} ${labels.minutes}</dd></dl></div>
  </div>
  <h2>${labels.checklist}</h2>
  ${checklistHtml}
  <h2>${labels.photos}</h2>
  ${photosHtml}
  ${signatureHtml}
  ${data.notes ? `<h2>${labels.notes}</h2><p>${esc(data.notes)}</p>` : ""}
  <p class="meta" style="margin-top:32px">${esc(data.companyName)} · ${new Date().toISOString().slice(0, 10)}</p>
</body>
</html>`;
}
