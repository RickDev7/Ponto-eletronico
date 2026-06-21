import { loadPlatformTenants } from "@/lib/platform/load-platform-data";
import { TenantsView } from "@/components/features/platform/tenants-view";

export default async function SuperAdminTenantsPage() {
  const tenants = await loadPlatformTenants();
  return <TenantsView tenants={tenants} />;
}
