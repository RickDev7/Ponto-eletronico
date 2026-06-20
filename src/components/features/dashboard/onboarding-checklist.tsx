"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, Rocket, X } from "lucide-react";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

interface OnboardingChecklistProps {
  slug: string;
  steps: OnboardingStep[];
}

export function OnboardingChecklist({ slug, steps }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = doneCount === total;
  const progress = Math.round((doneCount / total) * 100);

  if (dismissed || allDone) return null;

  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Rocket className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Erste Schritte</p>
          <p className="text-xs text-muted-foreground">
            {doneCount}/{total} erledigt
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Progress */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
          </div>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted/60 transition-colors text-muted-foreground"
            aria-label={collapsed ? "Ausklappen" : "Einklappen"}
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted/60 transition-colors text-muted-foreground"
            aria-label="Schließen"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="border-t divide-y">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                step.done ? "opacity-50" : "hover:bg-muted/20"
              } transition-colors`}
            >
              {/* Status icon */}
              <div
                className={`size-5 rounded-full flex items-center justify-center shrink-0 border-2 ${
                  step.done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-muted-foreground/30"
                }`}
              >
                {step.done && <Check className="size-3" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? "line-through" : ""}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>

              {!step.done && (
                <Link
                  href={step.href}
                  className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Starten
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
