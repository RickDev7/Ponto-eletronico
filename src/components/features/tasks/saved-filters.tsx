"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Bookmark, BookmarkCheck, Star, X } from "lucide-react";
import { toast } from "sonner";

interface SavedFilter {
  id: string;
  name: string;
  params: string;
  savedAt: string;
}

const STORAGE_KEY = "feldops_saved_filters";

function getFilters(slug: string): SavedFilter[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${slug}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFilters(slug: string, filters: SavedFilter[]) {
  localStorage.setItem(`${STORAGE_KEY}_${slug}`, JSON.stringify(filters));
}

interface SavedFiltersProps {
  slug: string;
}

export function SavedFilters({ slug }: SavedFiltersProps) {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const tToasts = useTranslations("toasts");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [mounted, setMounted] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFilters(getFilters(slug));
    setMounted(true);
  }, [slug]);

  const currentParams = searchParams.toString();
  const hasActiveFilters = !!(
    searchParams.get("q") ||
    searchParams.get("status") ||
    searchParams.get("employee") ||
    searchParams.get("from") ||
    searchParams.get("to") ||
    searchParams.get("service") ||
    searchParams.get("tag")
  );

  const isAlreadySaved = filters.some((f) => f.params === currentParams);

  const handleSave = useCallback(() => {
    if (!nameInput.trim()) {
      toast.error(tToasts("filterNameRequired"));
      return;
    }
    const newFilter: SavedFilter = {
      id: Math.random().toString(36).slice(2),
      name: nameInput.trim(),
      params: currentParams,
      savedAt: new Date().toISOString(),
    };
    const updated = [newFilter, ...filters].slice(0, 10);
    saveFilters(slug, updated);
    setFilters(updated);
    setNameInput("");
    setSaving(false);
    toast.success(tToasts("filterSaved"));
  }, [nameInput, currentParams, filters, slug, tToasts]);

  function handleLoad(f: SavedFilter) {
    router.push(`/${slug}/tasks?${f.params}`);
  }

  function handleDelete(id: string) {
    const updated = filters.filter((f) => f.id !== id);
    saveFilters(slug, updated);
    setFilters(updated);
  }

  if (!mounted) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((f) => (
        <div
          key={f.id}
          className="group inline-flex h-6 items-center gap-1 rounded-md border border-border/70 bg-background/50 px-2 text-[11px] font-medium transition-colors hover:border-primary/40"
        >
          <button
            type="button"
            onClick={() => handleLoad(f)}
            className="flex items-center gap-1 transition-colors hover:text-primary"
            title={t("savedFilters.filterTooltip", { params: f.params })}
          >
            <Star className="size-2.5 fill-amber-400 text-amber-400" />
            {f.name}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(f.id)}
            className="text-muted-foreground/50 opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
            aria-label={t("savedFilters.delete")}
          >
            <X className="size-2.5" />
          </button>
        </div>
      ))}

      {hasActiveFilters && !isAlreadySaved && (
        saving ? (
          <div className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") { setSaving(false); setNameInput(""); }
              }}
              placeholder={t("savedFilters.namePlaceholder")}
              maxLength={30}
              className="h-6 w-28 rounded-md border border-border/70 bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!nameInput.trim()}
              className="inline-flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              aria-label={tCommon("save")}
            >
              <BookmarkCheck className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => { setSaving(false); setNameInput(""); }}
              className="inline-flex size-6 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:bg-muted/30"
              aria-label={tCommon("cancel")}
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSaving(true)}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-border/70 px-2 text-[11px] text-muted-foreground transition-colors hover:border-amber-400/60 hover:text-amber-600"
          >
            <Bookmark className="size-3" />
            {t("savedFilters.save")}
          </button>
        )
      )}
    </div>
  );
}
