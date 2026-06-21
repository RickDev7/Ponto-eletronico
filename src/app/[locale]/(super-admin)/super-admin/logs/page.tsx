import { loadPlatformLogs } from "@/lib/platform/load-platform-data";
import { LogsView } from "@/components/features/platform/logs-view";

export default async function SuperAdminLogsPage() {
  const logs = await loadPlatformLogs();
  return <LogsView logs={logs} />;
}
