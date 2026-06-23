import type {
  FieldJobAiCapability,
  FieldJobAiContext,
  FieldJobAiResult,
  FieldJobMaterialSuggestion,
} from "@/lib/ai/field-job-types";

const DEFAULT_CHECKLIST: Record<string, string[]> = {
  treppenhausreinigung: [
    "Verificar iluminação e acessos",
    "Aspirar e lavar escadas e patamares",
    "Limpar corrimãos e portas de entrada",
    "Esvaziar caixotes do lixo",
    "Registar danos ou anomalias",
    "Foto antes e depois",
  ],
  gartenpflege: [
    "Inspecionar estado geral do jardim",
    "Cortar relva e aparar sebes",
    "Remover ervas daninhas",
    "Regar plantas se necessário",
    "Recolher resíduos verdes",
    "Foto do resultado final",
  ],
  winterdienst: [
    "Verificar previsão e temperatura",
    "Espalhar sal/areia nas zonas críticas",
    "Limpar entradas e passagens",
    "Registar hora de início e fim",
    "Documentar com foto",
  ],
  glasreinigung: [
    "Preparar equipamento e produtos",
    "Limpar vidros interiores",
    "Limpar vidros exteriores (se aplicável)",
    "Secar e verificar manchas",
    "Foto antes e depois",
  ],
};

const DEFAULT_MATERIALS: Record<string, FieldJobMaterialSuggestion[]> = {
  treppenhausreinigung: [
    { name: "Detergente multiusos", quantity: "1 L" },
    { name: "Sacos de lixo", quantity: "3 un" },
    { name: "Panos de microfibra", quantity: "4 un" },
  ],
  gartenpflege: [
    { name: "Sacos de resíduos verdes", quantity: "5 un" },
    { name: "Adubo (se aplicável)", quantity: "2 kg" },
  ],
  winterdienst: [
    { name: "Sal de descongelamento", quantity: "10 kg" },
    { name: "Areia", quantity: "5 kg" },
    { name: "Luvas térmicas", quantity: "1 par" },
  ],
  glasreinigung: [
    { name: "Limpa-vidros", quantity: "500 ml" },
    { name: "Rodo", quantity: "1 un" },
    { name: "Panos sem fiapos", quantity: "3 un" },
  ],
};

export function runFieldJobFallback(
  capability: FieldJobAiCapability,
  ctx: FieldJobAiContext,
): FieldJobAiResult {
  switch (capability) {
    case "suggest_checklist":
      return suggestChecklistFallback(ctx);
    case "suggest_materials":
      return suggestMaterialsFallback(ctx);
    case "generate_service_notes":
      return generateServiceNotesFallback(ctx);
  }
}

function suggestChecklistFallback(ctx: FieldJobAiContext): FieldJobAiResult {
  const fromTemplate = ctx.templateChecklists.flat();
  const defaults = DEFAULT_CHECKLIST[ctx.task.serviceType] ?? [
    "Confirmar acesso ao local",
    "Executar serviço conforme instruções",
    "Registar anomalias",
    "Foto de evidência",
    "Check-out com notas",
  ];

  const existing = new Set(ctx.existingChecklist.map((t) => t.toLowerCase()));
  const merged = [...fromTemplate, ...defaults].filter(
    (item, index, arr) =>
      arr.indexOf(item) === index && !existing.has(item.toLowerCase()),
  );

  const checklistItems = merged.slice(0, 8);

  return {
    capability: "suggest_checklist",
    provider: "fallback",
    summary: `${checklistItems.length} passos sugeridos para ${ctx.task.title}.`,
    recommendations: [
      "Use como referência durante a execução.",
      ctx.existingChecklist.length > 0
        ? "A checklist oficial já tem itens — compare com as sugestões."
        : "Peça ao supervisor para adicionar estes passos ao modelo oficial.",
    ],
    checklistItems,
  };
}

function suggestMaterialsFallback(ctx: FieldJobAiContext): FieldJobAiResult {
  const fromDb = ctx.linkedMaterials;
  const defaults = DEFAULT_MATERIALS[ctx.task.serviceType] ?? [
    { name: "EPI básico (luvas)", quantity: "1 par" },
    { name: "Produtos de limpeza", quantity: "conforme stock" },
  ];

  const materials = fromDb.length > 0 ? fromDb : defaults;

  return {
    capability: "suggest_materials",
    provider: "fallback",
    summary: `${materials.length} materiais recomendados para este tipo de serviço.`,
    recommendations: [
      "Confirme stock no veículo antes de sair.",
      "Registe consumo real após o serviço, se aplicável.",
    ],
    materials,
  };
}

function generateServiceNotesFallback(ctx: FieldJobAiContext): FieldJobAiResult {
  const date = new Date(ctx.task.scheduledDate).toLocaleDateString(
    ctx.locale.startsWith("en") ? "en-GB" : "pt-PT",
  );
  const client = ctx.task.clientName ?? "Cliente";
  const location = ctx.task.addressLine ?? "Local do serviço";

  const serviceNotes = [
    `Serviço: ${ctx.task.title}`,
    `Cliente: ${client}`,
    `Local: ${location}`,
    `Data: ${date}`,
    "",
    "Trabalho realizado conforme planeado.",
    ctx.task.description ? `Observações: ${ctx.task.description}` : null,
    ctx.task.accessNotes ? `Acesso: ${ctx.task.accessNotes}` : null,
    "",
    "Sem incidentes a reportar. Cliente informado da conclusão.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    capability: "generate_service_notes",
    provider: "fallback",
    summary: "Rascunho de notas de serviço gerado com base nos dados do trabalho.",
    recommendations: [
      "Revise e personalize antes do check-out.",
      "Inclua detalhes específicos do que foi feito no local.",
    ],
    serviceNotes,
  };
}
