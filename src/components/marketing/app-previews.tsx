import { cn } from "@/lib/utils";

function PreviewBar({ width = "60%" }: { width?: string }) {
  return <div className="h-2 rounded-full bg-[#E2E8F0]" style={{ width }} />;
}

function PreviewRow({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white p-2.5", className)}>
      {children}
    </div>
  );
}

export function DashboardPreview({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 p-3", className)}>
      <div className="grid grid-cols-3 gap-2">
        {["#2563EB", "#22C55E", "#F59E0B"].map((color) => (
          <div key={color} className="rounded-lg border border-[#E2E8F0] bg-white p-2">
            <div className="mb-2 h-1.5 w-8 rounded-full bg-[#E2E8F0]" />
            <div className="h-4 w-10 rounded bg-[#F1F5F9]" style={{ color }} />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
        <div className="mb-3 flex gap-2">
          <PreviewBar width="30%" />
          <PreviewBar width="20%" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <PreviewRow key={i}>
              <div className="size-6 rounded-md bg-[#EFF6FF]" />
              <div className="flex-1 space-y-1">
                <PreviewBar width={`${55 + i * 5}%`} />
                <PreviewBar width="35%" />
              </div>
              <div className="h-5 w-12 rounded-full bg-[#DCFCE7]" />
            </PreviewRow>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WorkforcePreview({ className }: { className?: string }) {
  return (
    <div className={cn("p-3", className)}>
      <div className="mb-3 flex items-center justify-between">
        <PreviewBar width="40%" />
        <div className="h-6 w-16 rounded-md bg-[#2563EB]/10" />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={index} className="text-[8px] font-medium text-[#64748B]">
            {day}
          </span>
        ))}
      </div>
      <div className="mt-2 space-y-1.5">
        {[
          { name: "Ana", color: "#DBEAFE" },
          { name: "João", color: "#DCFCE7" },
          { name: "Maria", color: "#FEF3C7" },
        ].map((row) => (
          <div key={row.name} className="flex items-center gap-2">
            <span className="w-8 text-[9px] font-medium text-[#64748B]">{row.name}</span>
            <div className="grid flex-1 grid-cols-7 gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <div
                  key={d}
                  className="h-5 rounded"
                  style={{
                    backgroundColor: d < 5 ? row.color : "transparent",
                    border: d >= 5 ? "1px dashed #E2E8F0" : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OperationsPreview({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 p-3", className)}>
      <div className="flex gap-2">
        {["Hoje", "Semana", "Mapa"].map((tab, i) => (
          <span
            key={tab}
            className={cn(
              "rounded-md px-2 py-1 text-[9px] font-medium",
              i === 0 ? "bg-[#2563EB] text-white" : "bg-white text-[#64748B] border border-[#E2E8F0]",
            )}
          >
            {tab}
          </span>
        ))}
      </div>
      {[
        { status: "Em curso", color: "#2563EB" },
        { status: "Agendado", color: "#64748B" },
        { status: "Concluído", color: "#22C55E" },
      ].map((job) => (
        <PreviewRow key={job.status}>
          <div className="size-2 rounded-full" style={{ backgroundColor: job.color }} />
          <div className="flex-1 space-y-1">
            <PreviewBar width="70%" />
            <PreviewBar width="45%" />
          </div>
          <span className="text-[8px] font-medium text-[#64748B]">{job.status}</span>
        </PreviewRow>
      ))}
      <div className="mt-2 h-24 rounded-lg border border-[#E2E8F0] bg-white p-2">
        <div className="relative h-full rounded bg-[#EFF6FF]">
          <div className="absolute left-[20%] top-[30%] size-3 rounded-full border-2 border-white bg-[#2563EB]" />
          <div className="absolute left-[55%] top-[50%] size-3 rounded-full border-2 border-white bg-[#22C55E]" />
          <div className="absolute left-[75%] top-[25%] size-3 rounded-full border-2 border-white bg-[#F59E0B]" />
        </div>
      </div>
    </div>
  );
}

export function FinancePreview({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 p-3", className)}>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-2">
          <p className="text-[8px] text-[#64748B]">Receita</p>
          <p className="text-sm font-semibold text-[#0F172A]">€24.8k</p>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-2">
          <p className="text-[8px] text-[#64748B]">Em aberto</p>
          <p className="text-sm font-semibold text-[#0F172A]">€3.2k</p>
        </div>
      </div>
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-2">
        <div className="mb-2 flex justify-between">
          <PreviewBar width="30%" />
          <PreviewBar width="15%" />
        </div>
        {["INV-1042", "INV-1041", "INV-1040"].map((inv) => (
          <div key={inv} className="flex items-center justify-between border-t border-[#F1F5F9] py-1.5 first:border-0">
            <span className="text-[9px] font-medium text-[#0F172A]">{inv}</span>
            <span className="rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[7px] font-medium text-[#B45309]">
              Pendente
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortalPreview({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 p-3", className)}>
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-center">
        <div className="mx-auto mb-2 size-8 rounded-full bg-[#EFF6FF]" />
        <PreviewBar width="50%" />
        <p className="mt-2 text-[8px] text-[#64748B]">Portal do cliente</p>
      </div>
      {["Relatório mensal", "Fatura #1042", "Próxima visita"].map((item) => (
        <PreviewRow key={item}>
          <div className="size-5 rounded bg-[#F1F5F9]" />
          <span className="text-[9px] font-medium text-[#0F172A]">{item}</span>
        </PreviewRow>
      ))}
    </div>
  );
}

export function AiPreview({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 p-3", className)}>
      <div className="rounded-lg border border-border bg-card p-2.5">
        <p className="text-[9px] text-muted-foreground">You</p>
        <p className="mt-1 text-[10px] text-foreground">Which crews are available tomorrow?</p>
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
        <p className="text-[9px] font-medium text-primary">FeldOps AI</p>
        <p className="mt-1 text-[10px] leading-relaxed text-foreground">
          3 crews available: North A, Central B, South C. Want me to suggest a schedule?
        </p>
      </div>
    </div>
  );
}

export function MobilePreview({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 p-3", className)}>
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2">
        <PreviewBar width="45%" />
        <div className="size-6 rounded-full bg-success/20" />
      </div>
      <div className="rounded-lg border border-border bg-card p-2.5">
        <div className="mb-2 flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10" />
          <div className="flex-1 space-y-1">
            <PreviewBar width="65%" />
            <PreviewBar width="40%" />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-md bg-primary py-2 text-center text-[8px] font-semibold text-primary-foreground">
            Check-in
          </div>
          <div className="rounded-md border border-border py-2 text-center text-[8px] font-medium text-muted-foreground">
            Check-out
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 flex-1 rounded-lg border border-border bg-muted/30" />
        ))}
      </div>
      <PreviewRow>
        <div className="size-2 rounded-full bg-success" />
        <span className="text-[9px] text-muted-foreground">GPS verified · 2h 15m logged</span>
      </PreviewRow>
    </div>
  );
}
