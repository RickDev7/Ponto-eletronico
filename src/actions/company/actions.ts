"use server";

import { cookies } from "next/headers";
import { COOKIE_ACTIVE_COMPANY } from "@/config/constants";
import { requireAuth } from "@/lib/auth/guards";
import { getMembership } from "@/lib/auth/session";
import type { ActionResult } from "@/actions/auth/actions";

export async function setActiveCompany(companyId: string): Promise<ActionResult> {
  const user = await requireAuth();
  const membership = await getMembership(user.id, companyId);

  if (!membership || membership.status !== "active") {
    return { success: false, error: "No access to this company" };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ACTIVE_COMPANY, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return { success: true, data: undefined };
}
