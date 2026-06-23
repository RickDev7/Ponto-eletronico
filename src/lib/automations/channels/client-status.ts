import type { DeliveryRequest } from "@/lib/automations/types";

type ExternalChannel = Exclude<DeliveryRequest["channel"], "in_app">;

export interface ChannelUiAdapter {
  channel: ExternalChannel;
  isConfigured(): boolean;
}

/** Client-safe channel badges (no server-only push/web-push imports). */
const CLIENT_CHANNELS: ChannelUiAdapter[] = [
  {
    channel: "email",
    isConfigured: () => Boolean(process.env.RESEND_API_KEY),
  },
  {
    channel: "whatsapp",
    isConfigured: () =>
      Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_FROM),
  },
  {
    channel: "sms",
    isConfigured: () =>
      Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_SMS_FROM),
  },
  {
    channel: "push",
    isConfigured: () =>
      Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  },
];

export function listClientChannelAdapters(): ChannelUiAdapter[] {
  return CLIENT_CHANNELS;
}
