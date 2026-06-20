import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Building2, Clock, ShieldCheck, UserRound } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getInviteDetails } from "@/actions/invites/actions";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.invite");
  return { title: t("title") };
}

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  const t = await getTranslations("auth.invite");
  const tRoles = await getTranslations("roles");

  if (!id) redirect("/");

  const invite = await getInviteDetails(id);

  if (!invite) {
    return (
      <div className="min-h-svh flex items-center justify-center p-6 bg-background">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="size-14 rounded-2xl bg-destructive/10 mx-auto flex items-center justify-center">
            <Clock className="size-7 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold">{t("invalidTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("invalidDescription")}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t("goHome")}
          </Link>
        </div>
      </div>
    );
  }

  const user = await getSession();
  const expiresIn = Math.ceil(
    (new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="min-h-svh flex items-center justify-center p-6 bg-background">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <div className="size-10 rounded-xl bg-primary mx-auto flex items-center justify-center text-primary-foreground font-bold">
            F
          </div>
          <p className="text-xs text-muted-foreground mt-2">FeldOps</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
              {invite.company.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("invitedBy")}</p>
              <p className="font-semibold">{invite.company.name}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0" />
              <span>
                {t("role")}:{" "}
                <span className="font-medium text-foreground">
                  {tRoles(invite.role as "admin" | "supervisor" | "employee")}
                </span>
              </span>
            </div>
            {invite.invitedBy && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserRound className="size-4 shrink-0" />
                <span>
                  {t("invitedByPerson")}:{" "}
                  <span className="font-medium text-foreground">{invite.invitedBy}</span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="size-4 shrink-0" />
              <span>
                {t("validFor")}:{" "}
                <span className="font-medium text-foreground">
                  {t("days", { count: expiresIn })}
                </span>
              </span>
            </div>
          </div>

          {user ? (
            <AcceptInviteForm inviteId={id} />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-center text-muted-foreground">
                {t("signInPrompt")}
              </p>
              <Link
                href={`/login?redirect=/invite/accept?id=${id}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t("signInAccept")}
              </Link>
              <Link
                href={`/register?redirect=/invite/accept?id=${id}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                {t("registerNew")}
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t("expiresOn", {
            date: new Date(invite.expiresAt).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
          })}
        </p>
      </div>
    </div>
  );
}
