"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Plus, Wrench } from "lucide-react";
import { createServiceAction } from "@/actions/operations/actions";
import type { ServiceRow } from "@/lib/operations/operations-data";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface OperationsServicesViewProps {
  slug: string;
  services: ServiceRow[];
  canWrite: boolean;
}

export function OperationsServicesView({ slug, services, canWrite }: OperationsServicesViewProps) {
  const t = useTranslations("operations.services");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [color, setColor] = useState("#6366f1");

  function handleCreate() {
    startTransition(async () => {
      const result = await createServiceAction(slug, {
        name,
        description,
        estimatedDurationMinutes: parseInt(duration, 10) || 60,
        color,
        defaultChecklist: [],
        isActive: true,
      });
      if (result.success) {
        toast.success(t("created"));
        setOpen(false);
        setName("");
        setDescription("");
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
        {services.length === 0 ? (
          <EmptyState icon={Wrench} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.id}
                className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="size-3 mt-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{service.name}</h3>
                    {service.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    )}
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <dt>{t("duration")}</dt>
                        <dd className="font-medium text-foreground">
                          {service.estimated_duration_minutes} min
                        </dd>
                      </div>
                      <div>
                        <dt>{t("frequency")}</dt>
                        <dd className="font-medium text-foreground">
                          {service.frequency ?? "—"}
                        </dd>
                      </div>
                    </dl>
                    {service.default_checklist.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {service.default_checklist.slice(0, 3).map((item) => (
                          <li key={item.label}>• {item.label}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </OperationsWorkspace>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("form.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>{t("form.description")}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("form.duration")}</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div>
                <Label>{t("form.color")}</Label>
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
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
