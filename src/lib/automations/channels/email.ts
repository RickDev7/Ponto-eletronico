import type { ChannelAdapter } from "@/lib/automations/channels/types";
import { providerNotConfigured } from "@/lib/automations/channels/types";
import type { DeliveryRequest, DeliveryResult } from "@/lib/automations/types";

/** Resend / Postmark / SendGrid — configure via RESEND_API_KEY */
export const emailChannelAdapter: ChannelAdapter = {
  channel: "email",
  providerName: "resend",

  isConfigured() {
    return Boolean(process.env.RESEND_API_KEY);
  },

  async deliver(request: DeliveryRequest): Promise<DeliveryResult> {
    if (!this.isConfigured()) {
      return providerNotConfigured(this.providerName);
    }

    // Provider integration point — queue until transactional email service is wired
    void request;
    return {
      status: "queued",
      provider: this.providerName,
      errorMessage: "email_adapter_pending_implementation",
    };
  },
};
