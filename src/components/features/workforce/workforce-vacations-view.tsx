"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Plus, Palmtree } from "lucide-react";
import {
  createVacationRequestAction,
  updateVacationStatusAction,
} from "@/actions/workforce/actions";
import { employeeName, type VacationRequestRow } from "@/lib/workforce/workforce-data";
import { EmptyState, OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkforceVacationsViewProps {
  slug: string;
  requests: VacationRequestRow[];
  employees: Array<{ id: string; full_name: string }>;
  canWrite: boolean;
}

export function WorkforceVacationsView({ slug, requests, employees, canWrite }: WorkforceVacationsViewProps) {
  const t = useTranslations("workforce.vacations");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleCreate() {
    startTransition(async () => {
      const result = await createVacationRequestAction(slug, { employeeId, startDate, endDate });
      if (result.success) {
        toast.success(t("created"));
        setOpen(false);
      } else toast.error(result.error);
    });
  }

  function handleStatus(id: string, status: "approved" | "rejected") {
    startTransition(async () => {
      const result = await updateVacationStatusAction(slug, id, status);
      if (result.success) toast.success(t("updated"));
      else toast.error(result.error);
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canWrite ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 size-3.5" />
              {t("new")}
            </Button>
          ) : undefined
        }
      />
      <OperationsWorkspace>
        {requests.length === 0 ? (
          <EmptyState icon={Palmtree} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <div className="divide-y">
            {requests.map((req) => (
              <div key={req.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{employeeName(req.employee)}</p>
                  <p className="text-sm text-muted-foreground">{req.start_date} → {req.end_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase text-muted-foreground">{req.status}</span>
                  {canWrite && req.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleStatus(req.id, "approved")}>{t("approve")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleStatus(req.id, "rejected")}>{t("reject")}</Button>
                    </>
                  )}
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
            <div><Label>{t("form.start")}</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>{t("form.end")}</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            <Button className="w-full" disabled={pending || !startDate || !endDate} onClick={handleCreate}>{t("form.submit")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
