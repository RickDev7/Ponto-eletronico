import type { SupabaseClient } from "@supabase/supabase-js";
import { generateTasksFromContractAction } from "@/actions/operations/actions";
import { deliverAndPersist } from "@/lib/automations/channels";
import type { AutomationEventPayload } from "@/lib/automations/types";
import type { AutomationActionStep } from "@/lib/validations/automations";
import { createAdminClient } from "@/lib/supabase/admin";

interface ExecuteContext {
  supabase: SupabaseClient;
  companyId: string;
  runId: string;
  payload: AutomationEventPayload;
  slug?: string;
}

async function notifySupervisors(
  companyId: string,
  type: string,
  title: string,
  body: string,
  entityType?: string,
  entityId?: string,
) {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyId)
    .in("role", ["admin", "supervisor"])
    .eq("status", "active");

  if (!members?.length) return;

  await admin.from("notifications").insert(
    members.map((m) => ({
      company_id: companyId,
      recipient_id: m.user_id,
      type,
      title,
      body,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
    })),
  );
}

function resolveRecipient(
  channel: NonNullable<AutomationActionStep["channel"]>,
  payload: AutomationEventPayload,
): string | null {
  switch (channel) {
    case "email":
      return (payload.clientEmail as string) ?? (payload.email as string) ?? null;
    case "whatsapp":
    case "sms":
      return (payload.clientPhone as string) ?? (payload.phone as string) ?? null;
    case "push":
      return (payload.userId as string) ?? null;
    case "in_app":
      return "supervisors";
    default:
      return null;
  }
}

export async function executeAutomationAction(
  step: AutomationActionStep,
  ctx: ExecuteContext,
): Promise<void> {
  const { payload, companyId, runId, slug } = ctx;

  switch (step.type) {
    case "generate_service": {
      const contractId = payload.contractId as string | undefined;
      if (contractId && slug) {
        await generateTasksFromContractAction(slug, contractId);
      }
      break;
    }

    case "generate_report": {
      const taskId = payload.taskId as string | undefined;
      const title = payload.taskTitle as string | undefined;
      await notifySupervisors(
        companyId,
        "automation_report",
        "Relatório de serviço solicitado",
        title ? `Serviço: ${title}` : "Automação solicitou geração de relatório",
        "task",
        taskId,
      );
      break;
    }

    case "create_task": {
      const addressId = payload.addressId as string | undefined;
      const contractId = payload.contractId as string | undefined;
      if (!addressId) break;

      await ctx.supabase.from("tasks").insert({
        company_id: companyId,
        address_id: addressId,
        contract_id: contractId ?? null,
        title: (step.config?.title as string) ?? (payload.title as string) ?? "Tarefa automática",
        service_type: (payload.serviceType as string) ?? "treppenhausreinigung",
        scheduled_date: new Date().toISOString().slice(0, 10),
        status: "scheduled",
        priority: "normal",
      });
      break;
    }

    case "send_notification": {
      const channel = step.channel ?? "in_app";
      if (channel === "in_app") {
        await notifySupervisors(
          companyId,
          "automation",
          (step.config?.title as string) ?? "Notificação automática",
          (step.config?.body as string) ?? String(payload.message ?? ""),
          payload.entityType as string | undefined,
          payload.entityId as string | undefined,
        );
        break;
      }
      await deliverAndPersist(ctx.supabase, {
        companyId,
        runId,
        channel,
        recipient: resolveRecipient(channel, payload) ?? "",
        subject: (step.config?.subject as string) ?? "Notificação",
        body: (step.config?.body as string) ?? String(payload.message ?? ""),
        payload: payload as Record<string, unknown>,
      });
      break;
    }

    case "send_reminder": {
      const channel = step.channel ?? "email";
      const recipient = resolveRecipient(channel, payload);
      const subject =
        (step.config?.subject as string) ??
        `Lembrete: fatura ${payload.invoiceNumber ?? ""}`.trim();
      const body =
        (step.config?.body as string) ??
        `Existe um saldo pendente. Vencimento: ${payload.dueDate ?? "—"}.`;

      await deliverAndPersist(ctx.supabase, {
        companyId,
        runId,
        channel,
        recipient: recipient ?? "",
        subject,
        body,
        payload: payload as Record<string, unknown>,
      });
      break;
    }
  }
}
