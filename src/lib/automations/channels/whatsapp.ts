import type { ChannelAdapter } from "@/lib/automations/channels/types";
import { providerNotConfigured } from "@/lib/automations/channels/types";
import type { DeliveryRequest, DeliveryResult } from "@/lib/automations/types";

/** Twilio WhatsApp Business / Meta Cloud API — TWILIO_ACCOUNT_SID + TWILIO_WHATSAPP_FROM */
export const whatsappChannelAdapter: ChannelAdapter = {
  channel: "whatsapp",
  providerName: "twilio_whatsapp",

  isConfigured() {
    return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_FROM);
  },

  async deliver(request: DeliveryRequest): Promise<DeliveryResult> {
    if (!this.isConfigured()) return providerNotConfigured(this.providerName);
    void request;
    return { status: "queued", provider: this.providerName, errorMessage: "whatsapp_adapter_pending" };
  },
};
