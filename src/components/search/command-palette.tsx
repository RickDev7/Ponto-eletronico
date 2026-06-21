"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Search,
  ClipboardList,
  Building2,
  Users,
  MapPin,
  Loader2,
  ArrowRight,
  FileText,
  Activity,
  Settings,
  Calendar,
  Target,
  Truck,
  BarChart3,
  Wallet,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import { createClient } from "@/lib/supabase/client";
import type { ServiceType } from "@/types";

interface SearchResult {
  id: string;
  type: "task" | "client" | "employee" | "address";
  title: string;
  subtitle: string;
  href: string;
}

interface CommandPaletteProps {
  slug: string;
  companyId: string;
  open: boolean;
  onClose: () => void;
}

const TYPE_ICONS = {
  task: ClipboardList,
  client: Building2,
  employee: Users,
  address: MapPin,
} as const;

export function CommandPalette({ slug, companyId, open, onClose }: CommandPaletteProps) {
  const t = useTranslations("commandPalette");
  const tService = useTranslations("serviceTypes");
  const tNav = useTranslations("navigation");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }

      const supabase = createClient();
      const term = `%${q}%`;

      const [tasks, clients, employees, addresses] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, service_type, status")
          .eq("company_id", companyId)
          .ilike("title", term)
          .neq("status", "cancelled")
          .limit(4),
        supabase
          .from("clients")
          .select("id, name, email")
          .eq("company_id", companyId)
          .ilike("name", term)
          .limit(3),
        supabase
          .from("employees")
          .select("id, full_name, email")
          .eq("company_id", companyId)
          .ilike("full_name", term)
          .limit(3),
        supabase
          .from("addresses")
          .select("id, street, house_number, city")
          .eq("company_id", companyId)
          .or(`street.ilike.${term},city.ilike.${term}`)
          .limit(3),
      ]);

      const out: SearchResult[] = [
        ...(tasks.data ?? []).map((task) => ({
          id: task.id,
          type: "task" as const,
          title: task.title,
          subtitle: tService(task.service_type as ServiceType),
          href: `/${slug}/tasks/${task.id}`,
        })),
        ...(clients.data ?? []).map((c) => ({
          id: c.id,
          type: "client" as const,
          title: c.name,
          subtitle: c.email ?? t("types.client"),
          href: `/${slug}/clients/${c.id}`,
        })),
        ...(employees.data ?? []).map((e) => ({
          id: e.id,
          type: "employee" as const,
          title: e.full_name,
          subtitle: e.email ?? t("types.employee"),
          href: ROUTES.workforceEmployee(slug, e.id),
        })),
        ...(addresses.data ?? []).map((a) => ({
          id: a.id,
          type: "address" as const,
          title: `${a.street} ${a.house_number ?? ""}`,
          subtitle: a.city,
          href: `/${slug}/addresses`,
        })),
      ];

      setResults(out);
      setSelected(0);
    },
    [companyId, slug, t, tService],
  );

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); return; }
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(() => startTransition(() => { search(query); }), 220);
    return () => clearTimeout(timer);
  }, [query, open, search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter" && results[selected]) {
        navigate(results[selected]!.href);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, results, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  const shortcuts = [
    { label: tNav("operationsWorkOrders"), icon: ClipboardList, href: ROUTES.operationsWorkOrders(slug) },
    { label: tNav("operationsScheduling"), icon: Calendar, href: ROUTES.operationsScheduling(slug) },
    { label: tNav("crmLeads"), icon: Target, href: ROUTES.crmLeads(slug) },
    { label: tNav("crmPipeline"), icon: Target, href: ROUTES.commercialPipeline(slug) },
    { label: t("shortcuts.clients"), icon: Building2, href: ROUTES.clients(slug) },
    { label: tNav("financeInvoices"), icon: Wallet, href: ROUTES.financeInvoices(slug) },
    { label: t("shortcuts.employees"), icon: Users, href: ROUTES.workforceEmployees(slug) },
    { label: tNav("workforceVehicles"), icon: Truck, href: ROUTES.workforceVehicles(slug) },
    { label: tNav("analyticsOperational"), icon: BarChart3, href: ROUTES.analyticsOperational(slug) },
    { label: t("shortcuts.reports"), icon: FileText, href: ROUTES.reports(slug) },
    { label: t("shortcuts.activity"), icon: Activity, href: ROUTES.analyticsOperational(slug, { tab: "activity" }) },
    { label: tNav("settings"), icon: Settings, href: ROUTES.settings(slug) },
  ];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg rounded-2xl border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b h-12">
          {isPending ? (
            <Loader2 className="size-4 text-muted-foreground animate-spin shrink-0" />
          ) : (
            <Search className="size-4 text-muted-foreground shrink-0" />
          )}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
            Esc
          </kbd>
        </div>

        {results.length > 0 ? (
          <ul className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
            {results.map((result, i) => {
              const Icon = TYPE_ICONS[result.type];
              const isSelected = i === selected;
              return (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                    onClick={() => navigate(result.href)}
                    onMouseEnter={() => setSelected(i)}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        {t(`types.${result.type}`)}
                      </span>
                      {isSelected && (
                        <ArrowRight className="size-3 text-primary" />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query.length >= 2 && !isPending ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {t("noResults", { query })}
            </p>
          </div>
        ) : query.length === 0 ? (
          <div className="py-8 px-4">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">
              {t("quickAccess")}
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {shortcuts.map((item) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-background px-1 py-0.5 font-mono">↑↓</kbd>
              {t("navigate")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-background px-1 py-0.5 font-mono">↵</kbd>
              {t("open")}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">{t("footer")}</span>
        </div>
      </div>
    </div>
  );
}
