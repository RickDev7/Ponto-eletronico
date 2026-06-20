import { MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-zinc-950 text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,#09090b,#0a0a0a)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:48px_48px]"
        aria-hidden
      />
      <div className="relative flex min-h-svh flex-col">
        <MarketingHeader />
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
