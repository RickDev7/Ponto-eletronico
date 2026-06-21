"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center p-8 bg-background">
      <div className="text-center space-y-6 max-w-sm">
        <div className="mx-auto size-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Unerwarteter Fehler</h1>
          <p className="text-sm text-muted-foreground">
            Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es
            erneut oder kontaktieren Sie den Support.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-muted-foreground/60">
              ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            Erneut versuchen
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Startseite
          </a>
        </div>
      </div>
    </div>
  );
}
