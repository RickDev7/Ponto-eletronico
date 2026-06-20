"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div className="mx-auto size-14 rounded-2xl bg-muted flex items-center justify-center">
          <WifiOff className="size-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold">Keine Verbindung</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          FeldOps ist offline. Bitte überprüfen Sie Ihre Internetverbindung und
          versuchen Sie es erneut.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
