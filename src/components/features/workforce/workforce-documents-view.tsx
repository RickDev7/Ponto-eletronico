"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Download, Plus, FileText, Upload } from "lucide-react";
import { uploadEmployeeDocumentAction } from "@/actions/workforce/actions";
import { employeeName } from "@/lib/workforce/workforce-data";
import { EmptyState, OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DocumentRow {
  id: string;
  title: string;
  doc_type: string;
  file_name: string | null;
  signedUrl?: string | null;
  employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
}

interface WorkforceDocumentsViewProps {
  slug: string;
  documents: DocumentRow[];
  employees: Array<{ id: string; full_name: string }>;
  canWrite: boolean;
}

export function WorkforceDocumentsView({ slug, documents, employees, canWrite }: WorkforceDocumentsViewProps) {
  const t = useTranslations("workforce.documents");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [docType, setDocType] = useState("contract");
  const [title, setTitle] = useState("");

  function handleCreate() {
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) {
      toast.error(t("form.fileRequired"));
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("employeeId", employeeId);
    fd.set("docType", docType);
    fd.set("title", title.trim());

    startTransition(async () => {
      const result = await uploadEmployeeDocumentAction(slug, fd);
      if (result.success) {
        toast.success(t("created"));
        setOpen(false);
        setTitle("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
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
        {documents.length === 0 ? (
          <EmptyState icon={FileText} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-muted-foreground">{employeeName(doc.employee)} · {t(`types.${doc.doc_type}`)}</p>
                </div>
                {doc.signedUrl && (
                  <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Download className="size-3.5" />
                    {doc.file_name ?? t("download")}
                  </a>
                )}
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
              <select className="flex h-9 w-full rounded-md border px-3 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {(["contract", "certificate", "training", "other"] as const).map((type) => (
                  <option key={type} value={type}>{t(`types.${type}`)}</option>
                ))}
              </select>
            </div>
            <div><Label>{t("form.title")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div>
              <Label>{t("form.file")}</Label>
              <Input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xlsx" />
            </div>
            <Button className="w-full" disabled={pending || !title.trim()} onClick={handleCreate}>
              <Upload className="mr-1.5 size-3.5" />
              {t("form.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
