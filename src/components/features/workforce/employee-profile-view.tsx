"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowLeft, Download, Pencil, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/config/constants";
import { uploadEmployeeDocumentAction } from "@/actions/workforce/actions";
import { formatMinutes } from "@/lib/workforce/workforce-data";
import { EmployeeHrForm } from "@/components/features/workforce/employee-hr-form";
import { OperationsPage, OperationsWorkspace, PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmployeeProfileViewProps {
  slug: string;
  employeeId: string;
  employee: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    employee_number: string | null;
    status: string;
    hire_date: string | null;
    job_title: string | null;
    supervisor_id: string | null;
    contract_type: string | null;
    weekly_hours: number | null;
    notes: string | null;
    team?: { team?: { name: string } | Array<{ name: string }> | null } | null;
    supervisor?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  };
  supervisors: Array<{ id: string; full_name: string }>;
  vacations: Array<{ id: string; start_date: string; end_date: string; status: string }>;
  absences: Array<{ id: string; absence_type: string; start_date: string; end_date: string }>;
  timeEntries: Array<{ entry_date: string; ist_minutes: number; balance_delta_minutes: number }>;
  documents: Array<{ id: string; title: string; doc_type: string; file_name?: string | null; signedUrl?: string | null }>;
  upcomingShifts: Array<{
    id: string;
    task?: { id: string; title: string; scheduled_date: string } | Array<{ id: string; title: string; scheduled_date: string }> | null;
  }>;
  locale: string;
  canWrite: boolean;
}

export function EmployeeProfileView({
  slug,
  employeeId,
  employee,
  supervisors,
  vacations,
  absences,
  timeEntries,
  documents,
  upcomingShifts,
  locale,
  canWrite,
}: EmployeeProfileViewProps) {
  const t = useTranslations("workforce.profile");
  const tDocs = useTranslations("workforce.documents");
  const tStatus = useTranslations("workforce.status");
  const tContract = useTranslations("workforce.profile.contractTypes");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("contract");
  const [pending, startTransition] = useTransition();

  const team = employee.team?.team;
  const teamName = Array.isArray(team) ? team[0]?.name : team?.name;
  const supervisor = Array.isArray(employee.supervisor)
    ? employee.supervisor[0]?.full_name
    : employee.supervisor?.full_name;

  const balance = timeEntries.reduce((a, e) => a + (e.balance_delta_minutes ?? 0), 0);
  const ist = timeEntries.reduce((a, e) => a + (e.ist_minutes ?? 0), 0);

  function handleUploadDocument() {
    const file = fileRef.current?.files?.[0];
    if (!file || !docTitle.trim()) {
      toast.error(tDocs("form.fileRequired"));
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("employeeId", employeeId);
    fd.set("docType", docType);
    fd.set("title", docTitle.trim());

    startTransition(async () => {
      const result = await uploadEmployeeDocumentAction(slug, fd);
      if (result.success) {
        toast.success(tDocs("created"));
        setDocOpen(false);
        setDocTitle("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={employee.full_name}
        description={employee.job_title ?? t("noRole")}
        actions={
          <div className="flex items-center gap-2">
            {canWrite && (
              <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
                <Pencil className="mr-1.5 size-3.5" />
                {editing ? t("hrForm.cancel") : t("hrForm.edit")}
              </Button>
            )}
            <Link href={ROUTES.workforceEmployees(slug)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs">
              <ArrowLeft className="size-3.5" />
              {t("back")}
            </Link>
          </div>
        }
      />

      {editing && canWrite ? (
        <OperationsWorkspace className="mb-4 p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("hrForm.title")}</h3>
          <EmployeeHrForm
            slug={slug}
            employeeId={employeeId}
            employee={employee}
            supervisors={supervisors}
            onSuccess={() => {
              setEditing(false);
              router.refresh();
            }}
          />
        </OperationsWorkspace>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <OperationsWorkspace className="space-y-3 p-4 lg:col-span-1">
          <StatusBadge status="success" label={tStatus(employee.status as "active")} showDot />
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted-foreground">{t("email")}</dt><dd>{employee.email ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">{t("phone")}</dt><dd>{employee.phone ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">{t("supervisor")}</dt><dd>{supervisor ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">{t("team")}</dt><dd>{teamName ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">{t("contract")}</dt><dd>{employee.contract_type ? tContract(employee.contract_type as "full_time") : "—"}</dd></div>
            <div><dt className="text-muted-foreground">{t("weeklyHours")}</dt><dd>{employee.weekly_hours ?? 40}h</dd></div>
            {employee.hire_date && (
              <div><dt className="text-muted-foreground">{t("hireDate")}</dt><dd>{new Date(employee.hire_date + "T12:00:00").toLocaleDateString(locale)}</dd></div>
            )}
          </dl>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">{t("timeAccount")}</p>
            <p className="text-lg font-semibold">{formatMinutes(ist)} · {t("balance")} {formatMinutes(balance)}</p>
          </div>
        </OperationsWorkspace>

        <OperationsWorkspace className="space-y-4 p-4 lg:col-span-2">
          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("upcomingShifts")}</h3>
            <ul className="divide-y rounded-lg border">
              {upcomingShifts.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">{t("noShifts")}</li>
              ) : (
                upcomingShifts.map((s) => {
                  const task = Array.isArray(s.task) ? s.task[0] : s.task;
                  if (!task) return null;
                  return (
                    <li key={s.id} className="flex justify-between px-3 py-2 text-sm">
                      <Link href={ROUTES.task(slug, task.id)} className="hover:text-primary">{task.title}</Link>
                      <span className="text-muted-foreground">{task.scheduled_date}</span>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">{t("vacations")}</h3>
            <ul className="divide-y rounded-lg border">
              {vacations.slice(0, 5).map((v) => (
                <li key={v.id} className="flex justify-between px-3 py-2 text-sm">
                  <span>{v.start_date} → {v.end_date}</span>
                  <span className="text-muted-foreground">{v.status}</span>
                </li>
              ))}
            </ul>
          </section>
          {absences.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">{t("absences")}</h3>
              <ul className="divide-y rounded-lg border">
                {absences.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex justify-between px-3 py-2 text-sm">
                    <span>{a.start_date} → {a.end_date}</span>
                    <span className="text-muted-foreground">{a.absence_type}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("documents")}</h3>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={() => setDocOpen(true)}>
                  <Plus className="mr-1.5 size-3.5" />
                  {tDocs("new")}
                </Button>
              )}
            </div>
            <ul className="divide-y rounded-lg border">
              {documents.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">{t("noDocuments")}</li>
              ) : (
                documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{d.title} · {tDocs(`types.${d.doc_type}`)}</span>
                    {d.signedUrl && (
                      <a href={d.signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Download className="size-3.5" />
                        {d.file_name ?? tDocs("download")}
                      </a>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>
        </OperationsWorkspace>
      </div>

      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tDocs("new")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{tDocs("form.type")}</Label>
              <select className="flex h-9 w-full rounded-md border px-3 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {(["contract", "certificate", "training", "other"] as const).map((type) => (
                  <option key={type} value={type}>{tDocs(`types.${type}`)}</option>
                ))}
              </select>
            </div>
            <div><Label>{tDocs("form.title")}</Label><Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} /></div>
            <div>
              <Label>{tDocs("form.file")}</Label>
              <Input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xlsx" />
            </div>
            <Button className="w-full" disabled={pending || !docTitle.trim()} onClick={handleUploadDocument}>
              <Upload className="mr-1.5 size-3.5" />
              {tDocs("form.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
