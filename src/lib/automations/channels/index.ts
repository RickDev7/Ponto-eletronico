import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelAdapter } from "@/lib/automations/channels/types";
import { emailChannelAdapter } from "@/lib/automations/channels/email";
import { whatsappChannelAdapter } from "@/lib/automations/channels/whatsapp";
import { smsChannelAdapter } from "@/lib/automations/channels/sms";
import { pushChannelAdapter } from "@/lib/automations/channels/push";
import type { DeliveryRequest, DeliveryResult } from "@/lib/automations/types";

const ADAPTERS: Record<string, ChannelAdapter> = {
  email: emailChannelAdapter,
  whatsapp: whatsappChannelAdapter,
  sms: smsChannelAdapter,
  push: pushChannelAdapter,
};

export function getChannelAdapter(channel: DeliveryRequest["channel"]): ChannelAdapter | null {
  return ADAPTERS[channel] ?? null;
}

export function listChannelAdapters(): ChannelAdapter[] {
  return Object.values(ADAPTERS);
}

export async function deliverAndPersist(
  supabase: SupabaseClient,
  request: DeliveryRequest,
): Promise<DeliveryResult> {
  let result: DeliveryResult;

  if (request.channel === "in_app") {
    result = { status: "sent", provider: "in_app" };
  } else {
    const adapter = getChannelAdapter(request.channel);
    if (!adapter) {
      result = { status: "failed", errorMessage: `unknown_channel:${request.channel}` };
    } else {
      result = await adapter.deliver(request);
    }
  }

  await supabase.from("automation_deliveries").insert({
    company_id: request.companyId,
    run_id: request.runId,
    channel: request.channel,
    recipient: request.recipient,
    subject: request.subject ?? null,
    body: request.body,
    payload: request.payload ?? {},
    status: result.status,
    provider: result.provider ?? null,
    provider_message_id: result.providerMessageId ?? null,
    error_message: result.errorMessage ?? null,
    sent_at: result.status === "sent" ? new Date().toISOString() : null,
  });

  return result;
}
