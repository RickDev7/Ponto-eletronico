import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <FileQuestion className="size-7 text-muted-foreground" />
      </div>
      <h2 className="text-base font-semibold mb-2">Nicht gefunden</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Die angeforderte Ressource wurde nicht gefunden oder Sie haben keinen
        Zugriff darauf.
      </p>
      <Link
        href=".."
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        Zurück
      </Link>
    </div>
  );
}
