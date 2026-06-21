"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight, Download, Pencil, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/config/constants";
import { uploadEmployeeDocumentAction } from "@/actions/workforce/actions";
import { formatMinutes } from "@/lib/workforce/workforce-data";
import type { EmployeeHistoryEntry, EmployeeSkillRow } from "@/lib/workforce/employee-domain";
import { EmployeeHrForm } from "@/components/features/workforce/employee-hr-form";
import { OperationsPage, OperationsWorkspace, PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ProfileTab =
  | "overview"
  | "planning"
  | "hours"
  | "documents"
  | "skills"
  | "vacations"
  | "absences"
  | "history";

interface EmployeeProfileViewProps {
  slug: string;
  employeeId: string;
  activeTab: ProfileTab;
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
  timeEntries: Array<{ entry_date: string; ist_minutes: number; balance_delta_minutes: number; source?: string }>;
  documents: Array<{ id: string; title: string; doc_type: string; file_name?: string | null; signedUrl?: string | null }>;
  upcomingShifts: Array<{
    id: string;
    task?: { id: string; title: string; scheduled_date: string } | Array<{ id: string; title: string; scheduled_date: string }> | null;
  }>;
  skills: EmployeeSkillRow[];
  history: EmployeeHistoryEntry[];
  locale: string;
  canWrite: boolean;
}

const TAB_KEYS: ProfileTab[] = [
  "overview",
  "planning",
  "hours",
  "documents",
  "skills",
  "vacations",
  "absences",
  "history",
];

export function EmployeeProfileView({
  slug,
  employeeId,
  activeTab,
  employee,
  supervisors,
  vacations,
  absences,
  timeEntries,
  documents,
  upcomingShifts,
  skills,
  history,
  locale,
  canWrite,
}: EmployeeProfileViewProps) {
  const t = useTranslations("workforce.profile");
  const tDocs = useTranslations("workforce.documents");
  const tStatus = useTranslations("workforce.status");
  const tContract = useTranslations("workforce.profile.contractTypes");
  const tHistory = useTranslations("workforce.profile.historyKinds");
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

  function tabHref(tab: ProfileTab) {
    return tab === "overview"
      ? ROUTES.workforceEmployee(slug, employeeId)
      : `${ROUTES.workforceEmployee(slug, employeeId)}?tab=${tab}`;
  }

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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status="success" label={tStatus(employee.status as "active")} showDot />
        <span className="text-xs text-muted-foreground">
          {t("timeAccount")}: {formatMinutes(ist)} · {t("balance")} {formatMinutes(balance)}
        </span>
      </div>

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

      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-border/60">
        {TAB_KEYS.map((tab) => (
          <Link
            key={tab}
            href={tabHref(tab)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`tabs.${tab}`)}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" && (
          <OperationsWorkspace className="space-y-4 p-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-muted-foreground">{t("email")}</dt><dd>{employee.email ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("phone")}</dt><dd>{employee.phone ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("employeeNumber")}</dt><dd>{employee.employee_number ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("team")}</dt><dd>{teamName ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("contract")}</dt><dd>{employee.contract_type ? tContract(employee.contract_type as "full_time") : "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("weeklyHours")}</dt><dd>{employee.weekly_hours ?? 40}h</dd></div>
              <div><dt className="text-muted-foreground">{t("supervisor")}</dt><dd>{supervisor ?? "—"}</dd></div>
              {employee.hire_date && (
                <div><dt className="text-muted-foreground">{t("hireDate")}</dt><dd>{new Date(employee.hire_date + "T12:00:00").toLocaleDateString(locale)}</dd></div>
              )}
            </dl>
            {employee.notes && (
              <div>
                <p className="text-sm text-muted-foreground">{t("notes")}</p>
                <p className="mt-1 text-sm">{employee.notes}</p>
              </div>
            )}
          </OperationsWorkspace>
      )}

      {activeTab === "documents" && (
          <OperationsWorkspace className="space-y-4 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("documents")}</h3>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={() => setDocOpen(true)}>
                  <Plus className="mr-1.5 size-3.5" />
                  {tDocs("new")}
                </Button>
              )}
            </div>
            <DocumentList documents={documents} tDocs={tDocs} t={t} />
          </OperationsWorkspace>
      )}

      {activeTab === "skills" && (
          <OperationsWorkspace className="p-4">
            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("skills")} —</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((row) => {
                  const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill;
                  return (
                    <span key={row.skill_id} className="rounded-full border px-2.5 py-0.5 text-xs">
                      {skill?.name ?? "—"} · {row.level}/5
                    </span>
                  );
                })}
              </div>
            )}
          </OperationsWorkspace>
      )}

      {activeTab === "vacations" && (
          <OperationsWorkspace className="p-4">
            <ul className="divide-y rounded-lg border">
              {vacations.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">{t("noVacations")}</li>
              ) : (
                vacations.map((v) => (
                  <li key={v.id} className="flex justify-between px-3 py-2 text-sm">
                    <span>{v.start_date} → {v.end_date}</span>
                    <span className="text-muted-foreground">{v.status}</span>
                  </li>
                ))
              )}
            </ul>
          </OperationsWorkspace>
      )}

      {activeTab === "absences" && (
          <OperationsWorkspace className="p-4">
            <ul className="divide-y rounded-lg border">
              {absences.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">{t("absences")} —</li>
              ) : (
                absences.map((a) => (
                  <li key={a.id} className="flex justify-between px-3 py-2 text-sm">
                    <span>{a.start_date} → {a.end_date}</span>
                    <span className="text-muted-foreground">{a.absence_type}</span>
                  </li>
                ))
              )}
            </ul>
          </OperationsWorkspace>
      )}

      {activeTab === "planning" && (
          <OperationsWorkspace className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{t("upcomingShifts")}</h3>
              <Button asChild size="sm" variant="outline">
                <Link href={ROUTES.workforcePlanning(slug, { employee: employeeId })}>
                  {t("openPlanning")} <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            </div>
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
          </OperationsWorkspace>
      )}

      {activeTab === "hours" && (
          <OperationsWorkspace className="space-y-3 p-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">{t("timeAccount")}</p>
              <p className="text-lg font-semibold">{formatMinutes(ist)} · {t("balance")} {formatMinutes(balance)}</p>
            </div>
            <Link href={ROUTES.workforceTimeAccount(slug)} className="text-xs text-primary hover:underline">
              {t("viewTimeAccount")}
            </Link>
            <ul className="divide-y rounded-lg border">
              {timeEntries.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">{t("noHours")}</li>
              ) : (
                timeEntries.map((e, i) => (
                  <li key={`${e.entry_date}-${i}`} className="flex justify-between px-3 py-2 text-sm">
                    <span>{e.entry_date}</span>
                    <span className="text-muted-foreground">
                      {formatMinutes(e.ist_minutes)} · {formatMinutes(e.balance_delta_minutes)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </OperationsWorkspace>
      )}

      {activeTab === "history" && (
          <OperationsWorkspace className="p-4">
            <ul className="divide-y rounded-lg border">
              {history.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">{t("noHistory")}</li>
              ) : (
                history.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="font-medium">{tHistory(entry.kind)}</span>
                      <span className="text-muted-foreground"> · {entry.label}</span>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString(locale)}
                    </time>
                  </li>
                ))
              )}
            </ul>
          </OperationsWorkspace>
      )}

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

function DocumentList({
  documents,
  tDocs,
  t,
}: {
  documents: EmployeeProfileViewProps["documents"];
  tDocs: ReturnType<typeof useTranslations>;
  t: ReturnType<typeof useTranslations>;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
          <span>{d.title} · {tDocs(`types.${d.doc_type}`)}</span>
          {d.signedUrl && (
            <a href={d.signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Download className="size-3.5" />
              {d.file_name ?? tDocs("download")}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
