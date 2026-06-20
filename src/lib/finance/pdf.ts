import { formatDate, formatMoney } from "@/lib/finance/utils";

export interface PdfCompany {
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
}

export interface PdfLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface PdfDocumentData {
  type: "quote" | "invoice" | "contract";
  number: string;
  company: PdfCompany;
  clientName: string;
  clientCompany?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  issueDate: string;
  dueDate?: string | null;
  validUntil?: string | null;
  items: PdfLineItem[];
  subtotalCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
  notes?: string | null;
  signatureText?: string | null;
  bankDetails?: string | null;
  discountCents?: number;
  locale?: string;
  currency?: string;
  labels: Record<string, string> & { contractTitle?: string };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(data: PdfDocumentData): string {
  const locale = data.locale ?? "de-DE";
  const currency = data.currency ?? "EUR";
  const L = data.labels;
  const title =
    data.type === "quote"
      ? L.quoteTitle
      : data.type === "contract"
        ? (L.contractTitle ?? "Contract")
        : L.invoiceTitle;
  const discountCents = data.discountCents ?? 0;

  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.description)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatMoney(item.unitPriceCents, currency, locale)}</td>
        <td class="num">${formatMoney(item.lineTotalCents, currency, locale)}</td>
      </tr>`,
    )
    .join("");

  const qrPayload = encodeURIComponent(
    `${data.number}|${data.totalCents}|${data.company.name}`,
  );

  return `<!DOCTYPE html>
<html lang="${locale.slice(0, 2)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} ${escapeHtml(data.number)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #111; padding: 40px; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #111; }
    .logo { max-height: 48px; max-width: 160px; object-fit: contain; }
    .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .meta { text-align: right; color: #555; font-size: 12px; }
    .meta strong { display: block; font-size: 18px; color: #111; margin-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .block h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 8px; }
    .block p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; padding: 8px 12px; border-bottom: 1px solid #ddd; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .totals-row.total { font-size: 16px; font-weight: 700; border-top: 2px solid #111; margin-top: 8px; padding-top: 12px; }
    .notes { margin-top: 32px; padding: 16px; background: #f8f8f8; border-radius: 8px; font-size: 12px; color: #444; }
    .footer { margin-top: 48px; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature { border-top: 1px solid #ccc; padding-top: 8px; min-width: 200px; font-size: 12px; color: #666; }
    .bank { font-size: 12px; color: #444; max-width: 320px; }
    .qr { width: 80px; height: 80px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999; text-align: center; padding: 4px; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${data.company.logoUrl ? `<img src="${escapeHtml(data.company.logoUrl)}" class="logo" alt="" />` : `<div class="brand">${escapeHtml(data.company.name)}</div>`}
      <p style="margin-top:8px;color:#666;font-size:12px;">
        ${data.company.legalName ? `${escapeHtml(data.company.legalName)}<br/>` : ""}
        ${data.company.taxId ? `USt-IdNr.: ${escapeHtml(data.company.taxId)}<br/>` : ""}
        ${data.company.email ? escapeHtml(data.company.email) : ""}
        ${data.company.phone ? ` · ${escapeHtml(data.company.phone)}` : ""}
      </p>
    </div>
    <div class="meta">
      <strong>${escapeHtml(title)}</strong>
      ${escapeHtml(data.number)}<br/>
      ${L.date}: ${formatDate(data.issueDate, locale)}<br/>
      ${data.dueDate ? `${L.dueDate}: ${formatDate(data.dueDate, locale)}<br/>` : ""}
      ${data.validUntil ? `${L.validUntil}: ${formatDate(data.validUntil, locale)}` : ""}
    </div>
  </div>

  <div class="grid">
    <div class="block">
      <h3>${L.from}</h3>
      <p><strong>${escapeHtml(data.company.name)}</strong></p>
    </div>
    <div class="block">
      <h3>${L.to}</h3>
      <p><strong>${escapeHtml(data.clientName)}</strong></p>
      ${data.clientCompany ? `<p>${escapeHtml(data.clientCompany)}</p>` : ""}
      ${data.clientEmail ? `<p>${escapeHtml(data.clientEmail)}</p>` : ""}
      ${data.clientPhone ? `<p>${escapeHtml(data.clientPhone)}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${L.description}</th>
        <th class="num">${L.quantity}</th>
        <th class="num">${L.unitPrice}</th>
        <th class="num">${L.total}</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>${L.subtotal}</span><span>${formatMoney(data.subtotalCents, currency, locale)}</span></div>
    ${discountCents > 0 ? `<div class="totals-row"><span>${L.discount ?? "Discount"}</span><span>−${formatMoney(discountCents, currency, locale)}</span></div>` : ""}
    <div class="totals-row"><span>${L.tax} (${data.taxRate}%)</span><span>${formatMoney(data.taxCents, currency, locale)}</span></div>
    <div class="totals-row total"><span>${L.grandTotal}</span><span>${formatMoney(data.totalCents, currency, locale)}</span></div>
  </div>

  ${data.notes ? `<div class="notes"><strong>${L.notes}</strong><br/>${escapeHtml(data.notes)}</div>` : ""}

  <div class="footer">
    <div>
      ${data.bankDetails ? `<div class="bank"><strong>${L.bankDetails}</strong><br/>${escapeHtml(data.bankDetails)}</div>` : ""}
      ${data.signatureText ? `<div class="signature" style="margin-top:24px;">${escapeHtml(data.signatureText)}</div>` : ""}
    </div>
    ${data.type === "invoice" || data.type === "quote" || data.type === "contract" ? `<div class="qr">QR<br/>${qrPayload.slice(0, 24)}…</div>` : ""}
  </div>
</body>
</html>`;
}

export function openFinancePdf(data: PdfDocumentData) {
  const html = buildHtml(data);
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
  return true;
}
