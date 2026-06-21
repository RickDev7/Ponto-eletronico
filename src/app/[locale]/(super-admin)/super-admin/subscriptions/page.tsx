import { loadPlatformSubscriptions } from "@/lib/platform/load-platform-data";
import { SubscriptionsView } from "@/components/features/platform/subscriptions-view";

export default async function SuperAdminSubscriptionsPage() {
  const subscriptions = await loadPlatformSubscriptions();
  return <SubscriptionsView subscriptions={subscriptions} />;
}
