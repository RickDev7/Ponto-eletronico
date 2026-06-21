import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/auth/session";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import type { AppLocale } from "@/i18n/routing";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (type === "recovery" || next === "/update-password") {
        return NextResponse.redirect(`${origin}/update-password`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const { data: invite } = await supabase
          .from("company_invites")
          .select("id, company_id, role")
          .eq("email", user.email)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (invite) {
          return NextResponse.redirect(
            `${origin}/invite/accept?id=${invite.id}`,
          );
        }
      }

      if (user) {
        const profile = await getUserProfile(user.id);
        const locale: AppLocale = profile?.locale === "en" ? "en" : "pt";

        const { data: memberships } = await supabase
          .from("company_members")
          .select("role, company:companies(slug)")
          .eq("user_id", user.id)
          .eq("status", "active");

        const redirectPath = await resolvePostAuthRedirect(
          user.id,
          memberships ?? [],
          { explicitRedirect: next },
        );

        return NextResponse.redirect(`${origin}/${locale}${redirectPath}`);
      }

      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
