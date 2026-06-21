import { formatMinutes } from "@/lib/workforce/workforce-data";
import type { EmployeeTimePeriodRow } from "@/lib/time-tracking/compute-time-summary";

export interface PayrollCsvLabels {
  employee: string;
  employeeNumber: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  planned: string;
  worked: string;
  breaks: string;
  travel: string;
  netWorked: string;
  overtime: string;
  balance: string;
  payable: string;
  daysWorked: string;
}

export function getPayrollCsvLabels(locale: string): PayrollCsvLabels {
  const en = locale === "en";
  return {
    employee: en ? "Employee" : "Colaborador",
    employeeNumber: en ? "Employee No." : "Nº Colaborador",
    period: en ? "Period" : "Período",
    periodStart: en ? "Period Start" : "Início",
    periodEnd: en ? "Period End" : "Fim",
    planned: en ? "Planned Hours" : "Horas Planeadas",
    worked: en ? "Worked Hours" : "Horas Trabalhadas",
    breaks: en ? "Breaks" : "Pausas",
    travel: en ? "Travel Time" : "Deslocação",
    netWorked: en ? "Net Worked" : "Líquido Trabalhado",
    overtime: en ? "Overtime" : "Horas Extra",
    balance: en ? "Balance" : "Saldo",
    payable: en ? "Payable Hours" : "Horas Pagáveis",
    daysWorked: en ? "Days Worked" : "Dias Trabalhados",
  };
}

function toCsvCell(value: string | number): string {
  const s = String(value).replace(/"/g, '""');
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
}

export function buildPayrollCsv(rows: EmployeeTimePeriodRow[], locale: string): string {
  const labels = getPayrollCsvLabels(locale);
  const header = [
    labels.employee,
    labels.employeeNumber,
    labels.period,
    labels.periodStart,
    labels.periodEnd,
    labels.planned,
    labels.worked,
    labels.breaks,
    labels.travel,
    labels.netWorked,
    labels.overtime,
    labels.balance,
    labels.payable,
    labels.daysWorked,
  ];

  const lines = rows.map((row) =>
    [
      row.employeeName,
      row.employeeNumber ?? "",
      row.periodLabel,
      row.periodStart,
      row.periodEnd,
      formatMinutes(row.plannedMinutes),
      formatMinutes(row.workedMinutes),
      formatMinutes(row.breakMinutes),
      formatMinutes(row.travelMinutes),
      formatMinutes(row.netWorkedMinutes),
      formatMinutes(row.overtimeMinutes),
      formatMinutes(row.balanceMinutes),
      formatMinutes(row.payableMinutes),
      row.daysWorked,
    ]
      .map(toCsvCell)
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
