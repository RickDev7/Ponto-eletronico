export function formatMinutes(total: number, locale: string) {
  const abs = Math.abs(total);
  const sign = total < 0 ? "−" : total > 0 ? "+" : "";
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;

  if (hours === 0) {
    return `${sign}${minutes}${locale === "en" ? "m" : "min"}`;
  }

  const hLabel = locale === "en" ? "h" : "h";
  const mLabel = locale === "en" ? "m" : "min";
  return minutes > 0
    ? `${sign}${hours}${hLabel} ${minutes}${mLabel}`
    : `${sign}${hours}${hLabel}`;
}

export function formatEntryDate(isoDate: string, locale: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(
    locale === "en" ? "en-US" : "pt-PT",
    { weekday: "short", day: "numeric", month: "short" },
  );
}

export function getWeekStartDate(reference = new Date()) {
  const d = new Date(reference);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
