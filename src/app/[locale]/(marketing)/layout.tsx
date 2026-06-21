import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-[#F8FAFC] text-[#0F172A]">
      <div className="flex min-h-svh flex-col">
        <MarketingHeader />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
