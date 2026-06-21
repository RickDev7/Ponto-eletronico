import type { ChannelAdapter } from "@/lib/automations/channels/types";
import { providerNotConfigured } from "@/lib/automations/channels/types";
import type { DeliveryRequest, DeliveryResult } from "@/lib/automations/types";

/** Resend transactional email — configure RESEND_API_KEY + RESEND_FROM_EMAIL */
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

    if (!request.recipient?.includes("@")) {
      return {
        status: "failed",
        provider: this.providerName,
        errorMessage: "invalid_recipient",
      };
    }

    const from =
      process.env.RESEND_FROM_EMAIL ??
      process.env.EMAIL_FROM ??
      "FeldOps <onboarding@resend.dev>";

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [request.recipient],
          subject: request.subject ?? "Notificação",
          html: request.body.includes("<")
            ? request.body
            : `<p>${request.body.replace(/\n/g, "<br/>")}</p>`,
        }),
      });

      const data = (await response.json()) as { id?: string; message?: string };

      if (!response.ok) {
        return {
          status: "failed",
          provider: this.providerName,
          errorMessage: data.message ?? `resend_${response.status}`,
        };
      }

      return {
        status: "sent",
        provider: this.providerName,
        providerMessageId: data.id,
      };
    } catch (err) {
      return {
        status: "failed",
        provider: this.providerName,
        errorMessage: err instanceof Error ? err.message : "email_send_failed",
      };
    }
  },
};
