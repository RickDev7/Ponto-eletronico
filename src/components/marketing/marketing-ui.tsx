import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export const marketingColors = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  primary: "#2563EB",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
} as const;

export function MarketingSection({
  children,
  className,
  id,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  variant?: "default" | "muted" | "card";
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-20 sm:py-28",
        variant === "muted" && "bg-[#F1F5F9]",
        variant === "card" && "border-y border-[#E2E8F0] bg-white",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-14 max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-[#2563EB]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-lg leading-relaxed text-[#64748B]">{description}</p>
      ) : null}
    </div>
  );
}

export function MarketingCard({
  children,
  className,
  highlight,
}: {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8",
        highlight && "border-[#2563EB] ring-1 ring-[#2563EB]/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function IconBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex size-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PrimaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}

export function SecondaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-6 py-3.5 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-[#64748B]">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#2563EB]" />
          {item}
        </li>
      ))}
    </ul>
  );
}
