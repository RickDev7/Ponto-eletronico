import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { loadEmployeeNotifications } from "@/lib/employee/load-employee-notifications";
import { EmployeeNotificationsView } from "@/components/employee/notifications/employee-notifications-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee.mobile.notifications");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function MobileNotificationsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireEmployeeContext(companySlug);
  const { notifications, unreadCount } = await loadEmployeeNotifications(
    ctx.company.id,
    ctx.employee.id,
  );

  return (
    <EmployeeNotificationsView
      slug={companySlug}
      companyId={ctx.company.id}
      employeeId={ctx.employee.id}
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  );
}
