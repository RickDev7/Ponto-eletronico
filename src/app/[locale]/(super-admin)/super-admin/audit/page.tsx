import { loadPlatformAuditLogs } from "@/lib/platform/load-platform-data";
import { AuditView } from "@/components/features/platform/audit-view";

export default async function SuperAdminAuditPage() {
  const logs = await loadPlatformAuditLogs();
  return <AuditView logs={logs} />;
}
