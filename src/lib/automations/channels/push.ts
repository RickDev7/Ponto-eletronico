import type { ChannelAdapter } from "@/lib/automations/channels/types";
import { providerNotConfigured } from "@/lib/automations/channels/types";
import type { DeliveryRequest, DeliveryResult } from "@/lib/automations/types";
import {
  isWebPushConfigured,
  loadPushSubscriptionsForEmployee,
  sendWebPush,
} from "@/lib/notifications/web-push";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveEmployeeId(companyId: string, userId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: member } = await supabase
    .from("company_members")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) return null;

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("company_id", companyId)
    .eq("member_id", member.id)
    .maybeSingle();

  return employee?.id ?? null;
}

/** Web Push (VAPID) — VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY */
export const pushChannelAdapter: ChannelAdapter = {
  channel: "push",
  providerName: "web_push",

  isConfigured() {
    return isWebPushConfigured();
  },

  async deliver(request: DeliveryRequest): Promise<DeliveryResult> {
    if (!this.isConfigured()) return providerNotConfigured(this.providerName);

    const userId = request.recipient;
    if (!userId) {
      return { status: "failed", provider: this.providerName, errorMessage: "missing_recipient" };
    }

    const employeeId = await resolveEmployeeId(request.companyId, userId);
    if (!employeeId) {
      return { status: "failed", provider: this.providerName, errorMessage: "employee_not_found" };
    }

    const subscriptions = await loadPushSubscriptionsForEmployee(request.companyId, employeeId);
    if (!subscriptions.length) {
      return { status: "skipped", provider: this.providerName, errorMessage: "no_subscriptions" };
    }

    const supabase = createAdminClient();
    const { data: company } = await supabase
      .from("companies")
      .select("slug")
      .eq("id", request.companyId)
      .maybeSingle();

    const slug = company?.slug ?? "";
    const payload = {
      title: request.subject ?? "FeldOps",
      body: request.body ?? "",
      url: slug ? `/${slug}/mobile/notifications` : "/",
      tag: request.runId,
    };

    let sent = 0;
    for (const sub of subscriptions) {
      const result = await sendWebPush(sub, payload);
      if (result.ok) sent += 1;
      else if (result.expired) {
        await supabase.from("employee_push_subscriptions").delete().eq("id", sub.id);
      }
    }

    if (sent === 0) {
      return { status: "failed", provider: this.providerName, errorMessage: "push_send_failed" };
    }

    return { status: "sent", provider: this.providerName };
  },
};
