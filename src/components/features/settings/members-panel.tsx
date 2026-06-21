"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Users, UserPlus, Loader2, MoreHorizontal, Shield, UserX } from "lucide-react";
import {
  updateMemberRole,
  removeMember,
  inviteMember,
} from "@/actions/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MemberRole } from "@/types";
import { ASSIGNABLE_ROLES } from "@/types/enums";
import { cn } from "@/lib/utils";

const ROLE_COLORS: Record<MemberRole, string> = {
  owner: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  admin: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  manager: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400",
  supervisor: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  employee: "bg-muted text-muted-foreground",
  client: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMember = any;

interface MembersPanelProps {
  slug: string;
  members: AnyMember[];
  currentMemberId: string;
  embedded?: boolean;
}

export function MembersPanel({
  slug,
  members,
  currentMemberId,
  embedded = false,
}: MembersPanelProps) {
  const t = useTranslations("settings.team");
  const tRoles = useTranslations("roles");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");
  const tToasts = useTranslations("toasts");
  const tDialogs = useTranslations("dialogs.removeMember");
  const tStatus = useTranslations("status");

  const inviteSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(tValidation("email")),
        role: z.enum(["owner", "manager", "supervisor", "employee"]),
      }),
    [tValidation],
  );
  type InviteData = z.infer<typeof inviteSchema>;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<InviteData>({
      resolver: zodResolver(inviteSchema),
      defaultValues: { role: "employee" },
    });

  const selectedRole = watch("role");

  async function onInvite(data: InviteData) {
    setInviting(true);
    const result = await inviteMember(slug, data);
    setInviting(false);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(tToasts("inviteSent", { email: result.data?.email ?? data.email }));
    reset();
    setInviteOpen(false);
  }

  async function handleRoleChange(memberId: string, role: MemberRole) {
    setChangingRole(memberId);
    const result = await updateMemberRole(slug, memberId, role);
    setChangingRole(null);
    if (!result.success) toast.error(result.error);
    else toast.success(tToasts("roleUpdated"));
  }

  async function handleRemove() {
    if (!removeId) return;
    const result = await removeMember(slug, removeId);
    if (!result.success) toast.error(result.error);
    else toast.success(tToasts("memberRemoved"));
    setRemoveId(null);
  }

  return (
    <div className={embedded ? "space-y-3" : "space-y-4"}>
      <div className="flex items-center justify-between">
        {!embedded && (
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {t("title")} ({members.length})
            </h3>
          </div>
        )}
        {embedded && (
          <p className="text-[11px] text-muted-foreground">
            {t("memberCount", { count: members.length })}
          </p>
        )}
        <Button
          size="sm"
          variant={embedded ? "default" : "outline"}
          onClick={() => setInviteOpen(true)}
          className={embedded ? "h-7 text-[11px]" : undefined}
        >
          <UserPlus className="size-3.5" />
          {t("invite")}
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Users className="mx-auto size-8 mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {members.map((m: AnyMember) => {
            const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
            const isCurrentUser = m.id === currentMemberId;
            const isChanging = changingRole === m.id;
            const role = m.role as MemberRole;

            return (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3",
                  embedded && "border-border/50 bg-muted/10 py-2.5",
                )}
              >
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                  {(profile?.full_name ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.full_name ?? tCommon("notAvailable")}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-muted-foreground">{t("you")}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.status === "invited" ? t("pendingInvite") : tStatus("active")}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={`text-xs ${ROLE_COLORS[role] ?? ""}`}
                >
                  {tRoles(role)}
                </Badge>

                {!isCurrentUser && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={isChanging}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none disabled:opacity-50"
                    >
                      {isChanging ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <MoreHorizontal className="size-3.5" />
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                        {t("changeRole")}
                      </div>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onSelect={() => handleRoleChange(m.id, r)}
                          className={m.role === r ? "font-medium text-primary" : ""}
                        >
                          <Shield className="size-3.5" />
                          {tRoles(r)}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setRemoveId(m.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <UserX className="size-3.5" />
                        {t("remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("inviteDialogTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("inviteEmail")}</Label>
              <Input
                {...register("email")}
                type="email"
                placeholder={t("inviteEmailPlaceholder")}
                autoFocus
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("role")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {ASSIGNABLE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setValue("role", role as InviteData["role"])}
                    className={`rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                      selectedRole === role
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {tRoles(role)}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setInviteOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting && <Loader2 className="animate-spin" />}
                {t("invite")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDialogs("title")}</AlertDialogTitle>
            <AlertDialogDescription>{tDialogs("description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tDialogs("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>{tDialogs("confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
