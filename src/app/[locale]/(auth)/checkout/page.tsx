import { getTranslations } from "next-intl/server";
import { CheckoutView } from "@/components/billing/checkout-view";

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("billing.checkout");
  return { title: t("title") };
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { plan = "professional" } = await searchParams;
  const t = await getTranslations("billing.checkout");

  return (
    <div className="flex min-h-svh items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="relative w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">{t("title")}</h1>
          <p className="text-sm text-zinc-500">{t("description")}</p>
        </div>
        <CheckoutView planKey={plan} />
      </div>
    </div>
  );
}
