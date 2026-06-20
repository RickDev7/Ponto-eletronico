import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { CheckCircle2 } from "lucide-react";

interface CheckoutSuccessPageProps {
  searchParams: Promise<{ session_id?: string; plan?: string; demo?: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("billing.success");
  return { title: t("title") };
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const { plan, demo } = await searchParams;
  const t = await getTranslations("billing.success");

  return (
    <div className="flex min-h-svh items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 text-center duration-500">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-7 text-emerald-400" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-white">{t("title")}</h1>
        <p className="mb-8 text-sm text-zinc-500">
          {demo ? t("demoDescription") : t("description")}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={ROUTES.onboarding}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-white text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-100"
          >
            {t("continueSetup")}
          </Link>
          {plan && (
            <p className="text-xs text-zinc-600">
              {t("planLabel")}: {plan}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
