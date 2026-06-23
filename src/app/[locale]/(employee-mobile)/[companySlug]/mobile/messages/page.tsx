import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { loadEmployeeMessages } from "@/lib/employee/load-employee-messages";
import { loadEmployeeNotifications } from "@/lib/employee/load-employee-notifications";
import { EmployeeMessagesView } from "@/components/mobile/employee-messages-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee.mobile.messages");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function MobileMessagesPage({ params, searchParams }: PageProps) {
  const { companySlug } = await params;
  const { tab } = await searchParams;
  const ctx = await requireEmployeeContext(companySlug);

  const [messagesData, notificationsData] = await Promise.all([
    loadEmployeeMessages(ctx.company.id, ctx.employee.id),
    loadEmployeeNotifications(ctx.company.id, ctx.employee.id),
  ]);

  return (
    <EmployeeMessagesView
      slug={companySlug}
      employeeId={ctx.employee.id}
      messages={messagesData.messages}
      notifications={notificationsData.notifications}
      messagesUnread={messagesData.unreadCount}
      notificationsUnread={notificationsData.unreadCount}
      initialTab={tab === "alerts" ? "alerts" : "messages"}
    />
  );
}
