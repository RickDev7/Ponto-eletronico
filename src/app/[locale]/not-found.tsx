"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-8 bg-background">
      <div className="text-center space-y-6 max-w-sm">
        <div className="mx-auto size-16 rounded-2xl bg-muted flex items-center justify-center">
          <FileQuestion className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">404</h1>
          <h2 className="text-base font-semibold">Seite nicht gefunden</h2>
          <p className="text-sm text-muted-foreground">
            Die angeforderte Seite existiert nicht oder wurde verschoben.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Zur Startseite
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Zurück
          </button>
        </div>
      </div>
    </div>
  );
}
