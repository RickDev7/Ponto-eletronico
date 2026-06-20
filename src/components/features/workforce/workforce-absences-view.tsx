"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Plus, UserX } from "lucide-react";
import { createAbsenceAction } from "@/actions/workforce/actions";
import { employeeName, type AbsenceRow } from "@/lib/workforce/workforce-data";
import { EmptyState, OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkforceAbsencesViewProps {
  slug: string;
  absences: AbsenceRow[];
  employees: Array<{ id: string; full_name: string }>;
  canWrite: boolean;
}

export function WorkforceAbsencesView({ slug, absences, employees, canWrite }: WorkforceAbsencesViewProps) {
  const t = useTranslations("workforce.absences");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [absenceType, setAbsenceType] = useState("sick");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleCreate() {
    startTransition(async () => {
      const result = await createAbsenceAction(slug, {
        employeeId,
        absenceType: absenceType as "sick",
        startDate,
        endDate,
      });
      if (result.success) {
        toast.success(t("created"));
        setOpen(false);
      } else toast.error(result.error);
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={canWrite ? <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 size-3.5" />{t("new")}</Button> : undefined}
      />
      <OperationsWorkspace>
        {absences.length === 0 ? (
          <EmptyState icon={UserX} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <div className="divide-y">
            {absences.map((a) => (
              <div key={a.id} className="flex justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{employeeName(a.employee)}</p>
                  <p className="text-muted-foreground">{t(`types.${a.absence_type}`)} · {a.start_date} → {a.end_date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </OperationsWorkspace>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("new")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("form.employee")}</Label>
              <select className="flex h-9 w-full rounded-md border px-3 text-sm" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <Label>{t("form.type")}</Label>
              <select className="flex h-9 w-full rounded-md border px-3 text-sm" value={absenceType} onChange={(e) => setAbsenceType(e.target.value)}>
                {(["sick", "leave", "absence", "training", "other"] as const).map((type) => (
                  <option key={type} value={type}>{t(`types.${type}`)}</option>
                ))}
              </select>
            </div>
            <div><Label>{t("form.start")}</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>{t("form.end")}</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            <Button className="w-full" disabled={pending} onClick={handleCreate}>{t("form.submit")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
