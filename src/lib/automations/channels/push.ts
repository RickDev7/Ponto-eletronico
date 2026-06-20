import type { ChannelAdapter } from "@/lib/automations/channels/types";
import { providerNotConfigured } from "@/lib/automations/channels/types";
import type { DeliveryRequest, DeliveryResult } from "@/lib/automations/types";

/** Web Push (VAPID) — VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY */
export const pushChannelAdapter: ChannelAdapter = {
  channel: "push",
  providerName: "web_push",

  isConfigured() {
    return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  },

  async deliver(request: DeliveryRequest): Promise<DeliveryResult> {
    if (!this.isConfigured()) return providerNotConfigured(this.providerName);
    void request;
    return { status: "queued", provider: this.providerName, errorMessage: "push_adapter_pending" };
  },
};
