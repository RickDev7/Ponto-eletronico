import { loadPlatformSupportTickets } from "@/lib/platform/load-platform-data";
import { SupportView } from "@/components/features/platform/support-view";

export default async function SuperAdminSupportPage() {
  const tickets = await loadPlatformSupportTickets();
  return <SupportView tickets={tickets} />;
}
