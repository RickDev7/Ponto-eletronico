"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";
import type { ActionResult } from "@/actions/auth/actions";
import type { PhotoType } from "@/types";
import { logTaskEvent } from "@/lib/operations/task-events";

export async function uploadTaskPhoto(
  slug: string,
  taskId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string; url: string }>> {
  const ctx = await requireCompanyContext({ slug });

  const file = formData.get("file") as File | null;
  const photoType = formData.get("photoType") as PhotoType | null;
  const checkInId = formData.get("checkInId") as string | null;

  if (!file || !photoType) {
    return { success: false, error: "Datei und Fotoart erforderlich" };
  }

  if (!["before", "after", "signature", "evidence"].includes(photoType)) {
    return { success: false, error: "Ungültige Fotoart" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${ctx.company.id}/${taskId}/${fileName}`;

  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.taskPhotos)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: signedData } = await supabase.storage
    .from(STORAGE_BUCKETS.taskPhotos)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  const { data: photo, error: dbError } = await supabase
    .from("task_photos")
    .insert({
      company_id: ctx.company.id,
      task_id: taskId,
      check_in_id: checkInId || null,
      photo_type: photoType,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (dbError) {
    await supabase.storage.from(STORAGE_BUCKETS.taskPhotos).remove([storagePath]);
    return { success: false, error: dbError.message };
  }

  await logTaskEvent(supabase, {
    companyId: ctx.company.id,
    taskId,
    eventType: "photo_uploaded",
    createdBy: ctx.profile.id,
    metadata: { photoType, photoId: photo.id },
  });

  revalidatePath(`/${slug}/tasks/${taskId}`);
  revalidatePath(`/${slug}/field/tasks/${taskId}`);
  return {
    success: true,
    data: { id: photo.id, url: signedData?.signedUrl ?? "" },
  };
}

export async function deleteTaskPhoto(
  slug: string,
  photoId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("task_photos")
    .select("storage_path, task_id")
    .eq("id", photoId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!photo) return { success: false, error: "Foto nicht gefunden" };

  await supabase.storage
    .from(STORAGE_BUCKETS.taskPhotos)
    .remove([photo.storage_path]);

  const { error } = await supabase
    .from("task_photos")
    .delete()
    .eq("id", photoId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${slug}/tasks/${photo.task_id}`);
  return { success: true, data: undefined };
}

export async function getSignedPhotoUrls(
  storagePaths: string[],
): Promise<Record<string, string>> {
  if (!storagePaths.length) return {};
  const supabase = await createClient();

  const results = await Promise.all(
    storagePaths.map(async (path) => {
      const { data } = await supabase.storage
        .from(STORAGE_BUCKETS.taskPhotos)
        .createSignedUrl(path, 60 * 60);
      return [path, data?.signedUrl ?? ""] as const;
    }),
  );

  return Object.fromEntries(results);
}
