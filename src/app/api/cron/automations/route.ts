import { NextResponse } from "next/server";
import { scanOverdueInvoicesAutomations } from "@/lib/automations/engine";
import { scanWorkforcePlanningAutomations } from "@/lib/workforce/planning-automations";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [invoices, workforce] = await Promise.all([
      scanOverdueInvoicesAutomations(),
      scanWorkforcePlanningAutomations(),
    ]);
    return NextResponse.json({ processed: invoices + workforce, invoices, workforce });
  } catch (err) {
    const message = err instanceof Error ? err.message : "cron_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
