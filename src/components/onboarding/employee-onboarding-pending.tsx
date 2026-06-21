import { getTranslations } from "next-intl/server";
import { Smartphone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { Button } from "@/components/ui/button";

interface EmployeeOnboardingPendingProps {
  email: string;
}

export async function EmployeeOnboardingPending({ email }: EmployeeOnboardingPendingProps) {
  const t = await getTranslations("auth.onboarding.employeePending");

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Smartphone className="size-7 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
        <p className="text-sm leading-relaxed text-zinc-500">{t("description")}</p>
        <p className="text-xs text-zinc-600">{t("emailHint", { email })}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full">
          <Link href={ROUTES.login}>{t("tryAgain")}</Link>
        </Button>
      </div>
      <p className="text-xs text-zinc-600">{t("contactAdmin")}</p>
    </div>
  );
}
