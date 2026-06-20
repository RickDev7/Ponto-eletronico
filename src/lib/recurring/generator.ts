export type RecurrenceRule = {
  type: "daily" | "weekly" | "monthly";
  interval: number;       // every N days/weeks/months
  days?: number[];        // for weekly: 0=Sun,1=Mon,...6=Sat
  until: string | null;   // YYYY-MM-DD
  occurrences?: number;   // max instances to generate
};

/** Generate a list of ISO date strings for a recurrence rule starting from baseDate */
export function generateOccurrenceDates(
  baseDate: string,
  rule: RecurrenceRule,
  maxInstances = 12,
): string[] {
  const dates: string[] = [];
  const until = rule.until ? new Date(rule.until + "T12:00:00") : null;
  const limit = Math.min(rule.occurrences ?? maxInstances, maxInstances);

  const current = new Date(baseDate + "T12:00:00");

  for (let i = 0; dates.length < limit; i++) {
    // Advance by interval
    const next = new Date(current);
    if (rule.type === "daily") {
      next.setDate(next.getDate() + rule.interval * (i + 1));
    } else if (rule.type === "weekly") {
      next.setDate(next.getDate() + rule.interval * 7 * (i + 1));
    } else {
      // monthly
      next.setMonth(next.getMonth() + rule.interval * (i + 1));
    }

    if (until && next > until) break;

    const iso = next.toISOString().slice(0, 10);

    // For weekly recurrence, only include if day-of-week matches
    if (rule.type === "weekly" && rule.days && rule.days.length > 0) {
      // Generate all matching days within the week interval window
      const windowStart = new Date(current);
      windowStart.setDate(windowStart.getDate() + rule.interval * 7 * i + 1);
      const windowEnd = new Date(current);
      windowEnd.setDate(windowEnd.getDate() + rule.interval * 7 * (i + 1));

      const d = new Date(windowStart);
      while (d <= windowEnd) {
        if (rule.days.includes(d.getDay())) {
          if (!until || d <= until) {
            dates.push(d.toISOString().slice(0, 10));
          }
          if (dates.length >= limit) break;
        }
        d.setDate(d.getDate() + 1);
      }
      continue;
    }

    dates.push(iso);
  }

  return dates;
}
