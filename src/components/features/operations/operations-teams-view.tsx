"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Plus, Users } from "lucide-react";
import { createTeamAction } from "@/actions/operations/actions";
import type { TeamRow } from "@/lib/operations/operations-data";
import {
  EmptyState,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface EmployeeOption {
  id: string;
  full_name: string;
}

interface OperationsTeamsViewProps {
  slug: string;
  teams: TeamRow[];
  employees: EmployeeOption[];
  canWrite: boolean;
}

function employeeName(
  row: { full_name: string | null } | Array<{ full_name: string | null }> | null | undefined,
): string {
  if (!row) return "—";
  return Array.isArray(row) ? row[0]?.full_name ?? "—" : row.full_name ?? "—";
}

export function OperationsTeamsView({ slug, teams, employees, canWrite }: OperationsTeamsViewProps) {
  const t = useTranslations("operations.teams");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [supervisorId, setSupervisorId] = useState<string>("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createTeamAction(slug, {
        name,
        supervisorId: supervisorId || null,
        vehicleInfo,
        memberIds,
        isActive: true,
      });
      if (result.success) {
        toast.success(t("created"));
        setOpen(false);
        setName("");
        setMemberIds([]);
      } else {
        toast.error(result.error);
      }
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
        {teams.length === 0 ? (
          <EmptyState icon={Users} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            {teams.map((team) => (
              <article key={team.id} className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold">{team.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("supervisor")}: {employeeName(team.supervisor)}
                </p>
                {team.vehicle_info && (
                  <p className="text-xs text-muted-foreground">{team.vehicle_info}</p>
                )}
                <ul className="mt-3 space-y-1">
                  {(team.members ?? []).map((m) => (
                    <li key={m.employee_id} className="text-sm">
                      {employeeName(m.employee)}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </OperationsWorkspace>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("form.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>{t("form.supervisor")}</Label>
              <Select value={supervisorId} onValueChange={setSupervisorId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("form.selectSupervisor")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("form.vehicle")}</Label>
              <Input value={vehicleInfo} onChange={(e) => setVehicleInfo(e.target.value)} />
            </div>
            <div>
              <Label>{t("form.members")}</Label>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={memberIds.includes(e.id)}
                      onCheckedChange={() => toggleMember(e.id)}
                    />
                    {e.full_name}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={pending || !name.trim()} className="w-full">
              {t("form.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
