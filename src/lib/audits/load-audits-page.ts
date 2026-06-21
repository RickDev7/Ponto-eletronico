import { createClient } from "@/lib/supabase/server";
import { buildAuditViolations } from "@/lib/audits/violations";

export async function loadAuditsPageData(companyId: string, days: number) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromIso = from.toISOString();

  const supabase = await createClient();
  const { data: checkIns } = await supabase
    .from("check_ins")
    .select(`
      id, check_in_at, check_out_at, check_in_latitude, check_in_longitude,
      employee:employees(full_name),
      task:tasks(
        id, title, scheduled_date,
        address:addresses(street, house_number, city, latitude, longitude)
      )
    `)
    .eq("company_id", companyId)
    .gte("check_in_at", fromIso)
    .order("check_in_at", { ascending: false })
    .limit(300);

  const rows = buildAuditViolations(checkIns ?? []);
  const violationCheckInIds = new Set(rows.map((r) => r.checkInId));
  const totalCheckIns = checkIns?.length ?? 0;
  const gpsMissingCount = rows.filter((r) => r.type === "gps_missing").length;
  const outsideRadiusCount = rows.filter((r) => r.type === "outside_radius").length;
  const passed = totalCheckIns - violationCheckInIds.size;

  return {
    rows,
    metrics: {
      pending: 0,
      passed,
      failed: outsideRadiusCount,
      inReview: gpsMissingCount,
    },
  };
}
