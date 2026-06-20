import type { DeliveryRequest, DeliveryResult } from "@/lib/automations/types";

export interface ChannelAdapter {
  readonly channel: DeliveryRequest["channel"];
  readonly providerName: string;
  isConfigured(): boolean;
  deliver(request: DeliveryRequest): Promise<DeliveryResult>;
}

export function providerNotConfigured(provider: string): DeliveryResult {
  return {
    status: "queued",
    provider,
    errorMessage: "provider_not_configured",
  };
}
