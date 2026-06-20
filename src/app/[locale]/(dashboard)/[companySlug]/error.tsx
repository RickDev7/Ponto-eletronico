"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <h2 className="text-base font-semibold mb-2">Etwas ist schiefgelaufen</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="size-3.5" />
        Erneut versuchen
      </button>
    </div>
  );
}
