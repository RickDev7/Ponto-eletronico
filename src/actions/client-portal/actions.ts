"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforcePlanLimit } from "@/lib/billing/enforcement";
import type { ActionResult } from "@/actions/auth/actions";
import { actionError } from "@/lib/i18n/action-error";
import { ROUTES, STORAGE_BUCKETS } from "@/config/constants";

const grantPortalAccessSchema = z.object({
  clientId: z.string().uuid(),
  email: z.string().email(),
});

export async function grantClientPortalAccess(
  slug: string,
  raw: unknown,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = grantPortalAccessSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: await actionError("invalidInput") };
  }

  const supabase = await createClient();
  const { clientId, email } = parsed.data;

  const { data: client } = await supabase
    .from("clients")
    .select("id, email")
    .eq("id", clientId)
    .eq("company_id", ctx.company.id)
    .maybeSingle();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const limitCheck = await enforcePlanLimit(ctx.company.id, "employees", 1);
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.error };
  }

  const admin = createAdminClient();
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  let userId = existingUser?.id;

  if (!userId) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      email,
      { data: { invited_to_company: ctx.company.id } },
    );
    if (inviteError || !invited.user) {
      return { success: false, error: inviteError?.message ?? "Invite failed" };
    }
    userId = invited.user.id;
  }

  const { data: existingMember } = await supabase
    .from("company_members")
    .select("id, role")
    .eq("company_id", ctx.company.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMember) {
    const { error } = await supabase
      .from("company_members")
      .update({
        role: "client",
        client_id: clientId,
        status: "active",
      })
      .eq("id", existingMember.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("company_members").insert({
      company_id: ctx.company.id,
      user_id: userId,
      role: "client",
      client_id: clientId,
      status: "active",
      joined_at: new Date().toISOString(),
    });

    if (error) return { success: false, error: error.message };
  }

  if (!client.email) {
    await supabase.from("clients").update({ email }).eq("id", clientId);
  }

  revalidatePath(`/${slug}/clients/${clientId}`);
  revalidatePath(ROUTES.clientPortalDocuments(slug));
  return { success: true, data: undefined };
}

const uploadDocumentSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default("general"),
  visibleToClient: z.boolean().default(true),
});

export async function uploadClientDocument(
  slug: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = uploadDocumentSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || "general",
    visibleToClient: formData.get("visibleToClient") !== "false",
  });

  if (!parsed.success) {
    return { success: false, error: await actionError("invalidInput") };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: await actionError("invalidInput") };
  }

  const { clientId, title, description, category, visibleToClient } = parsed.data;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("company_id", ctx.company.id)
    .maybeSingle();

  if (!client) {
    return { success: false, error: "Client not found" };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${ctx.company.id}/${clientId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.clientDocuments)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: doc, error } = await supabase
    .from("client_documents")
    .insert({
      company_id: ctx.company.id,
      client_id: clientId,
      title,
      description: description ?? null,
      category,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      visible_to_client: visibleToClient,
      uploaded_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (error || !doc) {
    return { success: false, error: error?.message ?? "Insert failed" };
  }

  revalidatePath(ROUTES.clientPortalDocuments(slug));
  revalidatePath(`/${slug}/clients/${clientId}`);
  return { success: true, data: { id: doc.id } };
}
