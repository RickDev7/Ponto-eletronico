"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { signOut } from "@/actions/auth";
import { ROUTES } from "@/config/constants";

export function LoginSignOutButton() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const id = toast.loading(t("signingOut"));
          const result = await signOut();
          toast.dismiss(id);
          if (!result.success) {
            toast.error(tErrors("signOutFailed"));
            return;
          }
          router.push(ROUTES.login);
          router.refresh();
        })
      }
      className="font-medium text-zinc-400 hover:text-white disabled:opacity-50"
    >
      {t("signOut")}
    </button>
  );
}
