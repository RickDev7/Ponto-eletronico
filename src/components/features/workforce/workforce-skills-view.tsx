"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  assignEmployeeSkillAction,
  createCompanySkillAction,
  deleteCompanySkillAction,
  removeEmployeeSkillAction,
} from "@/actions/workforce/actions";
import { ROUTES } from "@/config/constants";
import type { CompanySkillRow, EmployeeSkillRow } from "@/lib/workforce/employee-domain";
import type { WorkforceEmployeeRow } from "@/lib/workforce/workforce-data";
import { SERVICE_TYPES } from "@/types/enums";
import { EmptyState, OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface WorkforceSkillsViewProps {
  slug: string;
  skills: CompanySkillRow[];
  employeeSkills: EmployeeSkillRow[];
  employees: WorkforceEmployeeRow[];
  canWrite: boolean;
}

export function WorkforceSkillsView({
  slug,
  skills,
  employeeSkills,
  employees,
  canWrite,
}: WorkforceSkillsViewProps) {
  const t = useTranslations("workforce.skills");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState<string>("");
  const [assignSkillId, setAssignSkillId] = useState("");
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignLevel, setAssignLevel] = useState("3");

  function countForSkill(skillId: string) {
    return employeeSkills.filter((r) => r.skill_id === skillId).length;
  }

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createCompanySkillAction(slug, {
        name: name.trim(),
        serviceType: serviceType || null,
      });
      if (result.success) {
        toast.success(t("created"));
        setCreateOpen(false);
        setName("");
        setServiceType("");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleDelete(skillId: string) {
    startTransition(async () => {
      const result = await deleteCompanySkillAction(slug, skillId);
      if (result.success) {
        toast.success(t("deleted"));
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleAssign() {
    if (!assignSkillId || !assignEmployeeId) return;
    startTransition(async () => {
      const result = await assignEmployeeSkillAction(slug, {
        employeeId: assignEmployeeId,
        skillId: assignSkillId,
        level: Number(assignLevel),
      });
      if (result.success) {
        toast.success(t("assigned"));
        setAssignOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function handleUnassign(employeeId: string, skillId: string) {
    startTransition(async () => {
      const result = await removeEmployeeSkillAction(slug, employeeId, skillId);
      if (result.success) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description", { count: skills.length })}
        actions={
          canWrite ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                {t("assign")}
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 size-3.5" />
                {t("new")}
              </Button>
            </div>
          ) : undefined
        }
      />

      <OperationsWorkspace className="overflow-hidden">
        {skills.length === 0 ? (
          <EmptyState icon={Sparkles} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("columns.serviceType")}</TableHead>
                <TableHead>{t("columns.employees")}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((skill) => (
                <TableRow key={skill.id}>
                  <TableCell>
                    <span
                      className="mr-2 inline-block size-2 rounded-full"
                      style={{ backgroundColor: skill.color ?? "#6366f1" }}
                    />
                    {skill.name}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {skill.service_type ?? "—"}
                  </TableCell>
                  <TableCell>{countForSkill(skill.id)}</TableCell>
                  <TableCell>
                    {canWrite && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => handleDelete(skill.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </OperationsWorkspace>

      {employeeSkills.length > 0 && (
        <OperationsWorkspace className="mt-4 overflow-hidden">
          <div className="border-b px-3 py-2 text-sm font-semibold">{t("assignments")}</div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columns.employee")}</TableHead>
                <TableHead>{t("columns.skill")}</TableHead>
                <TableHead>{t("columns.level")}</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeSkills.map((row) => {
                const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill;
                const emp = employees.find((e) => e.id === row.employee_id);
                return (
                  <TableRow key={`${row.employee_id}-${row.skill_id}`}>
                    <TableCell>
                      <Link href={ROUTES.workforceEmployee(slug, row.employee_id)} className="hover:text-primary">
                        {emp?.full_name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>{skill?.name ?? "—"}</TableCell>
                    <TableCell>{row.level}/5</TableCell>
                    <TableCell>
                      {canWrite && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => handleUnassign(row.employee_id, row.skill_id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </OperationsWorkspace>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("new")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t("form.name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label>{t("form.serviceType")}</Label>
              <Select value={serviceType} onValueChange={(v) => setServiceType(v ?? "")}>
                <SelectTrigger><SelectValue placeholder={t("form.noServiceType")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("form.noServiceType")}</SelectItem>
                  {SERVICE_TYPES.map((st) => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={pending || !name.trim()} onClick={handleCreate}>
              {t("form.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("assign")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("columns.employee")}</Label>
              <Select value={assignEmployeeId} onValueChange={(v) => setAssignEmployeeId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder={t("form.selectEmployee")} /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("columns.skill")}</Label>
              <Select value={assignSkillId} onValueChange={(v) => setAssignSkillId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder={t("form.selectSkill")} /></SelectTrigger>
                <SelectContent>
                  {skills.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("columns.level")}</Label>
              <Select value={assignLevel} onValueChange={(v) => setAssignLevel(v ?? "3")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}/5</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={pending || !assignEmployeeId || !assignSkillId} onClick={handleAssign}>
              {t("form.assignSubmit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
