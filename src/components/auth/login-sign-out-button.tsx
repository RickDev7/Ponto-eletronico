"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { signOut } from "@/actions/auth";

export function LoginSignOutButton() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const id = toast.loading(t("signingOut"));
          try {
            await signOut();
          } catch {
            toast.dismiss(id);
            toast.error(tErrors("signOutFailed"));
          }
        })
      }
      className="font-medium text-zinc-400 hover:text-white disabled:opacity-50"
    >
      {t("signOut")}
    </button>
  );
}
