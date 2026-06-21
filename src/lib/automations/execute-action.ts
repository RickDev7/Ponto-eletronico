import type { SupabaseClient } from "@supabase/supabase-js";
import { generateTasksFromContractInternal } from "@/lib/automations/generate-contract-tasks";
import { generateReportForTask } from "@/lib/automations/generate-task-report";
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

function formatReminderBody(payload: AutomationEventPayload, template?: string): string {
  if (template) {
    return template
      .replace("{invoiceNumber}", String(payload.invoiceNumber ?? ""))
      .replace("{clientName}", String(payload.clientName ?? ""))
      .replace("{dueDate}", String(payload.dueDate ?? "—"))
      .replace("{balance}", String(payload.balanceCents ?? ""));
  }
  return `Olá${payload.clientName ? ` ${payload.clientName}` : ""}, existe um saldo pendente na fatura ${payload.invoiceNumber ?? ""}. Vencimento: ${payload.dueDate ?? "—"}.`;
}

export async function executeAutomationAction(
  step: AutomationActionStep,
  ctx: ExecuteContext,
): Promise<void> {
  const { payload, companyId, runId, slug } = ctx;

  switch (step.type) {
    case "generate_service": {
      const contractId = payload.contractId as string | undefined;
      if (!contractId) break;
      await generateTasksFromContractInternal(ctx.supabase, {
        companyId,
        contractId,
        createdBy: (payload.triggeredBy as string) ?? null,
      });
      break;
    }

    case "generate_report": {
      const taskId = payload.taskId as string | undefined;
      if (!taskId) break;
      await generateReportForTask(
        ctx.supabase,
        companyId,
        taskId,
        payload.taskTitle as string | undefined,
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
      if (!recipient) {
        throw new Error("reminder_no_recipient");
      }

      const subject =
        (step.config?.subject as string) ??
        `Lembrete: fatura ${payload.invoiceNumber ?? ""}`.trim();
      const body = formatReminderBody(
        payload,
        step.config?.body as string | undefined,
      );

      await deliverAndPersist(ctx.supabase, {
        companyId,
        runId,
        channel,
        recipient,
        subject,
        body,
        payload: payload as Record<string, unknown>,
      });

      if (payload.invoiceId) {
        await ctx.supabase
          .from("invoices")
          .update({ status: "overdue" })
          .eq("id", payload.invoiceId as string)
          .eq("company_id", companyId)
          .in("status", ["sent", "partial"]);
      }
      break;
    }
  }
}
