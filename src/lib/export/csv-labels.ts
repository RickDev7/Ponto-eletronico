import type { ExportLocale } from "./locale-from-request";

type YesNo = { yes: string; no: string };

export interface CsvLabels {
  yesNo: YesNo;
  employees: {
    headers: string[];
    filename: string;
  };
  clients: {
    headers: string[];
    filename: string;
  };
  addresses: {
    headers: string[];
    filename: string;
  };
  tasks: {
    headers: string[];
    filename: string;
  };
  timesheet: {
    headers: string[];
    filenamePrefix: string;
  };
  reports: {
    checkins: {
      headers: string[];
      filenamePrefix: string;
    };
    tasks: {
      headers: string[];
      filenamePrefix: string;
    };
    periodAll: string;
    statusLabels: Record<string, string>;
    priorityLabels: Record<string, string>;
  };
  audits: {
    headers: string[];
    filenamePrefix: string;
    typeLabels: Record<"gps_missing" | "outside_radius", string>;
  };
}

const LABELS: Record<ExportLocale, CsvLabels> = {
  pt: {
    yesNo: { yes: "Sim", no: "Não" },
    employees: {
      headers: ["Nº", "Nome", "E-mail", "Telefone", "Endereço", "Status", "Criado em"],
      filename: "colaboradores",
    },
    clients: {
      headers: [
        "Nome",
        "Razão social",
        "E-mail",
        "Telefone",
        "Endereço",
        "CNPJ/ID fiscal",
        "Status",
        "Observações",
        "Criado em",
      ],
      filename: "clientes",
    },
    addresses: {
      headers: [
        "Identificação",
        "Rua",
        "Nº",
        "CEP",
        "Cidade",
        "País",
        "Andar",
        "Unidade",
        "Acesso",
        "Ativo",
        "Cliente",
      ],
      filename: "enderecos",
    },
    tasks: {
      headers: [
        "Título",
        "Serviço",
        "Status",
        "Prioridade",
        "Data",
        "Início",
        "Fim",
        "Colaboradores",
        "Endereço",
        "Descrição",
      ],
      filename: "tarefas",
    },
    timesheet: {
      headers: [
        "Data",
        "Check-in",
        "Check-out",
        "Duração (h)",
        "Tarefa",
        "Serviço",
        "Local",
        "Observações",
      ],
      filenamePrefix: "folha_ponto",
    },
    reports: {
      checkins: {
        headers: [
          "Colaborador",
          "Matrícula",
          "Tarefa",
          "Serviço",
          "Data",
          "Check-in",
          "Check-out",
          "Duração (h:mm)",
          "Endereço",
          "Obs. check-in",
          "Obs. check-out",
        ],
        filenamePrefix: "relatorio_horas",
      },
      tasks: {
        headers: [
          "Tarefa",
          "Status",
          "Serviço",
          "Prioridade",
          "Data",
          "Início",
          "Fim",
          "Concluída em",
          "Cliente",
          "Endereço",
          "Colaboradores",
          "Descrição",
        ],
        filenamePrefix: "relatorio_tarefas",
      },
      periodAll: "todos",
      statusLabels: {
        draft: "Rascunho",
        scheduled: "Agendada",
        in_progress: "Em andamento",
        completed: "Concluída",
        cancelled: "Cancelada",
      },
      priorityLabels: {
        low: "Baixa",
        normal: "Normal",
        high: "Alta",
        urgent: "Urgente",
      },
    },
    audits: {
      headers: ["Tipo", "Colaborador", "Tarefa", "Endereço", "Check-in", "Distância (m)"],
      filenamePrefix: "auditorias_violacoes",
      typeLabels: {
        gps_missing: "GPS ausente",
        outside_radius: "Fora do raio (>1 km)",
      },
    },
  },
  en: {
    yesNo: { yes: "Yes", no: "No" },
    employees: {
      headers: ["No.", "Name", "Email", "Phone", "Address", "Status", "Created"],
      filename: "employees",
    },
    clients: {
      headers: [
        "Name",
        "Legal name",
        "Email",
        "Phone",
        "Address",
        "Tax ID",
        "Status",
        "Notes",
        "Created",
      ],
      filename: "clients",
    },
    addresses: {
      headers: [
        "Label",
        "Street",
        "No.",
        "Postal code",
        "City",
        "Country",
        "Floor",
        "Unit",
        "Access",
        "Active",
        "Client",
      ],
      filename: "addresses",
    },
    tasks: {
      headers: [
        "Title",
        "Service",
        "Status",
        "Priority",
        "Date",
        "Start",
        "End",
        "Employees",
        "Address",
        "Description",
      ],
      filename: "tasks",
    },
    timesheet: {
      headers: [
        "Date",
        "Check-in",
        "Check-out",
        "Duration (h)",
        "Task",
        "Service",
        "Location",
        "Notes",
      ],
      filenamePrefix: "timesheet",
    },
    reports: {
      checkins: {
        headers: [
          "Employee",
          "Employee no.",
          "Task",
          "Service",
          "Date",
          "Check-in",
          "Check-out",
          "Duration (h:mm)",
          "Address",
          "Check-in notes",
          "Check-out notes",
        ],
        filenamePrefix: "hours_report",
      },
      tasks: {
        headers: [
          "Task",
          "Status",
          "Service",
          "Priority",
          "Date",
          "Start",
          "End",
          "Completed on",
          "Client",
          "Address",
          "Employees",
          "Description",
        ],
        filenamePrefix: "tasks_report",
      },
      periodAll: "all",
      statusLabels: {
        draft: "Draft",
        scheduled: "Scheduled",
        in_progress: "In progress",
        completed: "Completed",
        cancelled: "Cancelled",
      },
      priorityLabels: {
        low: "Low",
        normal: "Normal",
        high: "High",
        urgent: "Urgent",
      },
    },
    audits: {
      headers: ["Type", "Employee", "Task", "Address", "Check-in", "Distance (m)"],
      filenamePrefix: "audit_violations",
      typeLabels: {
        gps_missing: "GPS missing",
        outside_radius: "Outside radius (>1 km)",
      },
    },
  },
};

export function getCsvLabels(locale: ExportLocale): CsvLabels {
  return LABELS[locale];
}

export function timeLocaleForExport(locale: ExportLocale): string {
  return locale === "pt" ? "pt-BR" : "en-US";
}
