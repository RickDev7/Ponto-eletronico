"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { importEmployees } from "@/actions/employees/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FIELD_KEYS = ["fullName", "email", "phone", "jobTitle", "teamName", "weeklyHours"] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

interface EmployeeImportDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Array<{ id: string; name: string }>;
}

function parseDelimited(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  return lines.map((line) => {
    if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
    if (line.includes(";")) return line.split(";").map((c) => c.trim());
    return line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
  });
}

function guessMapping(headers: string[]): Record<FieldKey, number> {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (...words: string[]) =>
    lower.findIndex((h) => words.some((w) => h.includes(w)));

  return {
    fullName: Math.max(0, find("nome", "name", "full")),
    email: Math.max(0, find("email", "e-mail", "mail")),
    phone: Math.max(0, find("telefone", "phone", "tel")),
    jobTitle: Math.max(0, find("cargo", "role", "job", "função")),
    teamName: Math.max(0, find("equipa", "equipe", "team")),
    weeklyHours: Math.max(0, find("horas", "hours", "weekly")),
  };
}

export function EmployeeImportDialog({ slug, open, onOpenChange, teams }: EmployeeImportDialogProps) {
  const t = useTranslations("workforce.employees.import");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, number>>({
    fullName: 0,
    email: 1,
    phone: 2,
    jobTitle: 3,
    teamName: 4,
    weeklyHours: 5,
  });

  const headers = rows[0] ?? [];
  const dataRows = rows.length > 1 ? rows.slice(1) : [];

  const preview = useMemo(
    () =>
      dataRows.slice(0, 5).map((row) => ({
        fullName: row[mapping.fullName] ?? "",
        email: row[mapping.email] ?? "",
        phone: row[mapping.phone] ?? "",
        jobTitle: row[mapping.jobTitle] ?? "",
        teamName: row[mapping.teamName] ?? "",
        weeklyHours: row[mapping.weeklyHours] ?? "",
      })),
    [dataRows, mapping],
  );

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseDelimited(text);
      setRows(parsed);
      if (parsed[0]) setMapping(guessMapping(parsed[0]));
    };
    reader.readAsText(file);
  }

  function handleImport() {
    const teamNameToId = Object.fromEntries(
      teams.map((team) => [team.name.trim().toLowerCase(), team.id]),
    );

    const payload = dataRows
      .map((row) => ({
        fullName: row[mapping.fullName]?.trim() ?? "",
        email: row[mapping.email]?.trim() ?? "",
        phone: row[mapping.phone]?.trim() ?? "",
        jobTitle: row[mapping.jobTitle]?.trim() ?? "",
        teamName: row[mapping.teamName]?.trim() ?? "",
        weeklyHours: Number(row[mapping.weeklyHours]) || undefined,
      }))
      .filter((row) => row.fullName.length >= 2);

    if (!payload.length) {
      toast.error(t("noRows"));
      return;
    }

    startTransition(async () => {
      const result = await importEmployees(slug, { rows: payload }, teamNameToId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("success", { created: result.data.created, failed: result.data.failed }));
      onOpenChange(false);
      setRows([]);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center transition-colors hover:bg-muted/40">
          <FileSpreadsheet className="mb-3 size-8 text-muted-foreground" />
          <span className="text-sm font-medium">{t("dropLabel")}</span>
          <span className="mt-1 text-xs text-muted-foreground">{t("formats")}</span>
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>

        {headers.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELD_KEYS.map((field) => (
                <div key={field} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{t(`fields.${field}`)}</p>
                  <Select
                    value={String(mapping[field])}
                    onValueChange={(v) =>
                      setMapping((prev) => ({ ...prev, [field]: Number(v) }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header, index) => (
                        <SelectItem key={`${field}-${index}`} value={String(index)}>
                          {header || `Col ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {FIELD_KEYS.map((field) => (
                      <TableHead key={field}>{t(`fields.${field}`)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {FIELD_KEYS.map((field) => (
                        <TableCell key={field} className="text-xs">
                          {row[field] || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleImport} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Upload className="mr-2 size-4" />}
                {t("import", { count: dataRows.length })}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
