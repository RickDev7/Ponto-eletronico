import { loadFeatureFlags } from "@/lib/platform/load-platform-data";
import { FeatureFlagsView } from "@/components/features/platform/feature-flags-view";

export default async function SuperAdminFeatureFlagsPage() {
  const flags = await loadFeatureFlags();
  return <FeatureFlagsView flags={flags} />;
}
