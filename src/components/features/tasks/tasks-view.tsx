"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Plus,
  ClipboardList,
  Copy,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  Ban,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { createTask, createRecurringTasks, updateTaskStatus, deleteTask, duplicateTask } from "@/actions/tasks/actions";
import { BulkActionBar } from "@/components/features/tasks/bulk-action-bar";
import { createTaskSchema, type CreateTaskInput } from "@/lib/validations/tasks";
import { RecurrencePicker } from "@/components/features/tasks/recurrence-picker";
import type { RecurrenceRule } from "@/lib/recurring/generator";
import { SERVICE_TYPES } from "@/types/enums";
import type { ServiceType, TaskStatus, MemberRole } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyState,
  OPERATIONS_FORM_CLASS,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  ROW_ACTION_TRIGGER_CLASS,
  StatusBadge,
  type StatusTone,
} from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiDomainWidget } from "@/components/features/ai/ai-domain-widget";
import { cn } from "@/lib/utils";

const LOCALE_MAP: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
};

const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  draft: "neutral",
  scheduled: "pending",
  in_progress: "info",
  completed: "success",
  cancelled: "danger",
};

const STATUS_ICON: Record<
  TaskStatus,
  { icon: React.ElementType; color: string }
> = {
  draft: { icon: Circle, color: "text-muted-foreground" },
  scheduled: { icon: Clock, color: "text-blue-500" },
  in_progress: { icon: AlertCircle, color: "text-amber-500" },
  completed: { icon: CheckCircle2, color: "text-emerald-500" },
  cancelled: { icon: Ban, color: "text-destructive" },
};

interface Address {
  id: string;
  label: string | null;
  street: string;
  house_number: string | null;
  city: string;
  postal_code: string;
  service_types: string[];
  client: { name: string } | null;
}

interface Employee {
  id: string;
  full_name: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TaskWithRelations = any;

interface TasksViewProps {
  slug: string;
  tasks: TaskWithRelations[];
  addresses: Address[];
  employees: Employee[];
  canWrite: boolean;
  memberRole: MemberRole;
  totalCount?: number;
  autoCreate?: boolean;
  prefillEmployeeId?: string;
  prefillScheduledDate?: string;
}

export function TasksView({
  slug,
  tasks,
  addresses,
  employees,
  canWrite,
  memberRole,
  totalCount,
  autoCreate = false,
  prefillEmployeeId,
  prefillScheduledDate,
}: TasksViewProps) {
  const t = useTranslations("tasks");
  const tStatus = useTranslations("status");
  const tServiceTypes = useTranslations("serviceTypes");
  const tCommon = useTranslations("common");
  const tToasts = useTranslations("toasts");
  const locale = useLocale();
  const dateLocale = LOCALE_MAP[locale] ?? locale;

  const todayIso = new Date().toISOString().slice(0, 10);

  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (autoCreate && canWrite) {
      setCreateOpen(true);
    }
  }, [autoCreate, canWrite]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((task) => task.id)));
    }
  }

  const filtered = tasks.filter((task) => {
    if (activeTab === "active") return ["scheduled", "in_progress", "draft"].includes(task.status);
    if (activeTab === "completed") return task.status === "completed";
    return true;
  });

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    const result = await updateTaskStatus(slug, taskId, status);
    if (!result.success) toast.error(result.error);
    else toast.success(tToasts("statusUpdated"));
  }

  async function handleDelete(taskId: string) {
    const result = await deleteTask(slug, taskId);
    if (!result.success) toast.error(result.error);
    else toast.success(tToasts("taskCancelled"));
  }

  async function handleDuplicate(taskId: string) {
    const result = await duplicateTask(slug, taskId);
    if (!result.success) toast.error(result.error);
    else toast.success(tToasts("taskDuplicated"));
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={
          totalCount !== undefined
            ? t("descriptionWithCount", { count: totalCount })
            : t("description")
        }
        compact
        actions={
          <>
            {canWrite && filtered.length > 0 && (
              <button
                type="button"
                suppressHydrationWarning
                onClick={toggleSelectAll}
                className="inline-flex h-7 items-center rounded-md border border-border/70 px-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              >
                {selectedIds.size === filtered.length && filtered.length > 0
                  ? tCommon("deselectAll")
                  : tCommon("selectAll")}
              </button>
            )}
            {canWrite && (
              <Link
                href={`/${slug}/tasks/series`}
                className="inline-flex h-7 items-center rounded-md border border-border/70 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              >
                {t("series.title")}
              </Link>
            )}
            {canWrite && (
              <Button size="sm" className="h-7" onClick={() => setCreateOpen(true)}>
                <Plus />
                {t("create")}
              </Button>
            )}
          </>
        }
      />

      <AiDomainWidget slug={slug} domain="tasks" compact className="mb-2" role={memberRole} />

      <OperationsWorkspace className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between border-b border-border/80 px-2.5 py-0.5">
            <TabsList className="h-7 gap-0 bg-transparent p-0">
              <TabsTrigger
                value="active"
                className="h-6 rounded-none border-b-2 border-transparent px-2.5 text-[11px] font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
              >
                {t("tabs.active")}
                <span className="ml-1 tabular-nums text-muted-foreground">
                  {tasks.filter((task) => ["scheduled", "in_progress", "draft"].includes(task.status)).length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="h-6 rounded-none border-b-2 border-transparent px-2.5 text-[11px] font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
              >
                {t("tabs.completed")}
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="h-6 rounded-none border-b-2 border-transparent px-2.5 text-[11px] font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
              >
                {t("tabs.all")}
              </TabsTrigger>
            </TabsList>
            <span className="hidden text-[10px] tabular-nums text-muted-foreground sm:inline">
              {tCommon("entries", { count: filtered.length })}
            </span>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {filtered.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={t("empty.title")}
                description={t("empty.description")}
                size="sm"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    {canWrite && <TableHead className="w-7 px-2" />}
                    <TableHead className="min-w-[200px]">{t("columns.task")}</TableHead>
                    <TableHead className="hidden w-28 md:table-cell">{t("columns.team")}</TableHead>
                    <TableHead className="hidden w-32 sm:table-cell">{t("columns.status")}</TableHead>
                    <TableHead className="hidden w-36 lg:table-cell">{t("columns.service")}</TableHead>
                    <TableHead className="hidden w-20 sm:table-cell text-right">{t("columns.date")}</TableHead>
                    <TableHead className="w-7 px-1" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((task) => {
                    const iconMeta = STATUS_ICON[task.status as TaskStatus] ?? STATUS_ICON.draft;
                    const statusLabel = tStatus(task.status as TaskStatus);
                    const priorityLabel = tStatus(`priorities.${task.priority}` as "priorities.low");
                    const addr = Array.isArray(task.address) ? task.address[0] : task.address;
                    const assignees: Employee[] = (task.assignments ?? [])
                      .map((a: { employee: Employee }) => a.employee)
                      .filter(Boolean);
                    const tags = (task.tags ?? [])
                      .map(
                        (row: {
                          tag?:
                            | { id: string; name: string; color: string }
                            | { id: string; name: string; color: string }[];
                        }) => (Array.isArray(row.tag) ? row.tag[0] : row.tag),
                      )
                      .filter(Boolean);
                    const isOpenTask = ["draft", "scheduled", "in_progress"].includes(task.status);
                    const overdueDays =
                      isOpenTask && task.scheduled_date < todayIso
                        ? Math.max(
                            1,
                            Math.floor(
                              (new Date(`${todayIso}T00:00:00`).getTime() -
                                new Date(`${task.scheduled_date}T00:00:00`).getTime()) /
                                86_400_000,
                            ),
                          )
                        : 0;

                    const isSelected = selectedIds.has(task.id);
                    const addressLine = addr
                      ? `${addr.street} ${addr.house_number ?? ""}, ${addr.city}`.trim()
                      : null;

                    return (
                      <TableRow
                        key={task.id}
                        className={cn(
                          "group border-border/50",
                          isSelected && "bg-primary/[0.04]",
                        )}
                      >
                        {canWrite && (
                          <TableCell className="px-2 py-1">
                            <button
                              type="button"
                              suppressHydrationWarning
                              onClick={() => toggleSelect(task.id)}
                              className={cn(
                                "flex size-3 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                                isSelected
                                  ? "border-primary bg-primary opacity-100"
                                  : "border-muted-foreground/30 opacity-0 group-hover:opacity-100",
                              )}
                              aria-label={
                                isSelected ? t("selection.deselect") : t("selection.select")
                              }
                            >
                              {isSelected && (
                                <svg
                                  className="size-2 text-primary-foreground"
                                  viewBox="0 0 10 8"
                                  fill="currentColor"
                                >
                                  <path
                                    d="M1 4l3 3 5-6"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          </TableCell>
                        )}
                        <TableCell className="max-w-0 py-1 whitespace-normal">
                          <div className="flex min-w-0 items-center gap-2">
                            <iconMeta.icon
                              className={cn("size-3 shrink-0 opacity-70", iconMeta.color)}
                            />
                            <div className="min-w-0 flex-1 leading-tight">
                              <Link
                                href={`/${slug}/tasks/${task.id}`}
                                className="block truncate text-[12px] font-medium tracking-[-0.01em] transition-colors hover:text-primary"
                              >
                                {task.title}
                              </Link>
                              {(addressLine || tags.length > 0) && (
                                <p className="mt-px truncate text-[10px] text-muted-foreground">
                                  {addressLine}
                                  {tags.length > 0 && addressLine && (
                                    <span className="mx-1 text-border">·</span>
                                  )}
                                  {tags.slice(0, 2).map((tag: { id: string; name: string; color: string }, i: number) => (
                                    <span key={tag.id}>
                                      {i > 0 && <span className="mx-0.5">·</span>}
                                      <span style={{ color: tag.color }}>{tag.name}</span>
                                    </span>
                                  ))}
                                </p>
                              )}
                              <div className="mt-0.5 flex items-center gap-1 sm:hidden">
                                <TaskStatusPill
                                  status={task.status as TaskStatus}
                                  label={statusLabel}
                                />
                                {overdueDays > 0 && (
                                  <OverduePill days={overdueDays} />
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-1 md:table-cell">
                          {assignees.length > 0 ? (
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {assignees.map((e) => e.full_name).join(", ")}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50">{tCommon("notAvailable")}</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden py-1 sm:table-cell">
                          <div className="flex items-center gap-1">
                            <TaskStatusPill
                              status={task.status as TaskStatus}
                              label={statusLabel}
                            />
                            {overdueDays > 0 && <OverduePill days={overdueDays} />}
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-1 lg:table-cell">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <PriorityDot priority={task.priority} label={priorityLabel} />
                            <span className="truncate text-[11px] text-muted-foreground">
                              {tServiceTypes(task.service_type as ServiceType)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-1 text-right sm:table-cell">
                          <span
                            className={cn(
                              "text-[11px] tabular-nums",
                              overdueDays > 0
                                ? "font-medium text-destructive"
                                : "text-muted-foreground",
                            )}
                          >
                            {new Date(task.scheduled_date).toLocaleDateString(dateLocale, {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="px-1 py-1">
                          {canWrite && (
                            <DropdownMenu>
                              <DropdownMenuTrigger className={ROW_ACTION_TRIGGER_CLASS}>
                                <MoreHorizontal className="size-3.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-40">
                                {task.status === "scheduled" && (
                                  <DropdownMenuItem
                                    onSelect={() => handleStatusChange(task.id, "in_progress")}
                                  >
                                    <AlertCircle className="size-3.5" />
                                    {t("actions.start")}
                                  </DropdownMenuItem>
                                )}
                                {task.status === "in_progress" && (
                                  <DropdownMenuItem
                                    onSelect={() => handleStatusChange(task.id, "completed")}
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                    {t("actions.complete")}
                                  </DropdownMenuItem>
                                )}
                                {["draft", "scheduled"].includes(task.status) && (
                                  <DropdownMenuItem
                                    onSelect={() => handleStatusChange(task.id, "scheduled")}
                                  >
                                    <Clock className="size-3.5" />
                                    {t("actions.schedule")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => handleDuplicate(task.id)}>
                                  <Copy className="size-3.5" />
                                  {t("actions.duplicate")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => handleDelete(task.id)}
                                >
                                  <Ban className="size-3.5" />
                                  {t("actions.cancel")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </OperationsWorkspace>

      {selectedIds.size > 0 && (
        <BulkActionBar
          slug={slug}
          selectedIds={Array.from(selectedIds)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dialogs.createTitle")}</DialogTitle>
          </DialogHeader>
          <TaskForm
            slug={slug}
            addresses={addresses}
            employees={employees}
            prefillEmployeeId={prefillEmployeeId}
            prefillScheduledDate={prefillScheduledDate}
            onSuccess={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}

function TaskStatusPill({ status, label }: { status: TaskStatus; label: string }) {
  return (
    <StatusBadge
      status={STATUS_TONE[status] ?? "neutral"}
      label={label}
      showDot
      className="h-[18px] gap-1 border-0 bg-muted/40 px-1.5 py-0 text-[10px] font-medium leading-none shadow-none"
    />
  );
}

function OverduePill({ days }: { days: number }) {
  const t = useTranslations("tasks");
  return (
    <StatusBadge
      status="danger"
      label={t("overdue.daysShort", { days })}
      showDot={false}
      className="h-[18px] border-0 bg-destructive/10 px-1 py-0 text-[10px] font-medium leading-none text-destructive shadow-none"
    />
  );
}

function PriorityDot({ priority, label }: { priority: string; label: string }) {
  if (priority === "normal" || priority === "low") return null;

  const color =
    priority === "urgent"
      ? "bg-destructive"
      : priority === "high"
        ? "bg-amber-500"
        : "bg-muted-foreground/40";

  return (
    <span
      className={cn("size-1.5 shrink-0 rounded-full", color)}
      title={label}
    />
  );
}

function TaskForm({
  slug,
  addresses,
  employees,
  prefillEmployeeId,
  prefillScheduledDate,
  onSuccess,
}: {
  slug: string;
  addresses: Address[];
  employees: Employee[];
  prefillEmployeeId?: string;
  prefillScheduledDate?: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("tasks");
  const tStatus = useTranslations("status");
  const tServiceTypes = useTranslations("serviceTypes");
  const tCommon = useTranslations("common");
  const tToasts = useTranslations("toasts");

  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      addressId: "",
      serviceType: "",
      title: "",
      description: "",
      scheduledDate: prefillScheduledDate ?? new Date().toISOString().split("T")[0],
      scheduledStart: "",
      scheduledEnd: "",
      priority: "normal",
      employeeIds: prefillEmployeeId ? [prefillEmployeeId] : [],
    },
  });

  const selectedAddressId = form.watch("addressId");
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  async function onSubmit(values: CreateTaskInput) {
    if (recurrenceRule) {
      const result = await createRecurringTasks(slug, { ...values, recurrenceRule });
      if (!result.success) { toast.error(result.error); return; }
      toast.success(tToasts("recurringTasksCreated", { count: result.data?.count ?? 0 }));
    } else {
      const result = await createTask(slug, values);
      if (!result.success) { toast.error(result.error); return; }
      toast.success(tToasts("taskCreated"));
    }
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.title")} *</FormLabel>
            <FormControl><Input placeholder={t("form.titlePlaceholder")} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="addressId" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("dialogs.serviceObject")} *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("dialogs.selectObject")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {addresses.map((addr) => (
                  <SelectItem key={addr.id} value={addr.id}>
                    <span className="flex flex-col">
                      <span>{addr.street} {addr.house_number}, {addr.city}</span>
                      {addr.client && <span className="text-xs text-muted-foreground">{addr.client.name}</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="serviceType" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.serviceType")} *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("dialogs.selectServiceType")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(selectedAddress?.service_types ?? SERVICE_TYPES).map((type) => (
                  <SelectItem key={type} value={type}>
                    {tServiceTypes(type as ServiceType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="scheduledDate" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.scheduledDate")} *</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.priority")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(["low", "normal", "high", "urgent"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {tStatus(`priorities.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="scheduledStart" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("dialogs.startTime")}</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="scheduledEnd" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("dialogs.endTime")}</FormLabel>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.description")}</FormLabel>
            <FormControl><Textarea rows={2} placeholder={t("form.descriptionPlaceholder")} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {employees.length > 0 && (
          <FormField control={form.control} name="employeeIds" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("dialogs.assignEmployees")}</FormLabel>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {employees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border hover:bg-muted/40 transition-colors">
                    <Checkbox
                      checked={(field.value ?? []).includes(emp.id)}
                      onCheckedChange={(checked) => {
                        const current = field.value ?? [];
                        field.onChange(
                          checked
                            ? [...current, emp.id]
                            : current.filter((id) => id !== emp.id),
                        );
                      }}
                    />
                    <span className="text-sm truncate">{emp.full_name}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <RecurrencePicker value={recurrenceRule} onChange={setRecurrenceRule} />

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            {recurrenceRule ? t("dialogs.createSeries") : tCommon("create")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
