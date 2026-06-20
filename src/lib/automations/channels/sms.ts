import type { ChannelAdapter } from "@/lib/automations/channels/types";
import { providerNotConfigured } from "@/lib/automations/channels/types";
import type { DeliveryRequest, DeliveryResult } from "@/lib/automations/types";

/** Twilio SMS — TWILIO_ACCOUNT_SID + TWILIO_SMS_FROM */
export const smsChannelAdapter: ChannelAdapter = {
  channel: "sms",
  providerName: "twilio_sms",

  isConfigured() {
    return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_SMS_FROM);
  },

  async deliver(request: DeliveryRequest): Promise<DeliveryResult> {
    if (!this.isConfigured()) return providerNotConfigured(this.providerName);
    void request;
    return { status: "queued", provider: this.providerName, errorMessage: "sms_adapter_pending" };
  },
};
