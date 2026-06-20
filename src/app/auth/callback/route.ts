import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password recovery redirect — go directly to update-password page
      if (type === "recovery" || next === "/update-password") {
        return NextResponse.redirect(`${origin}/update-password`);
      }

      // Check if there's a pending invite for this user's email
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
          // Redirect to invite acceptance page
          return NextResponse.redirect(
            `${origin}/invite/accept?id=${invite.id}`,
          );
        }
      }

      // Normal login flow
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Check if user has a company
      if (user) {
        const { data: memberships } = await supabase
          .from("company_members")
          .select("company:companies(slug)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const slug = (memberships?.company as any)?.slug;
        if (slug) {
          return NextResponse.redirect(`${origin}/${slug}`);
        }
      }

      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
