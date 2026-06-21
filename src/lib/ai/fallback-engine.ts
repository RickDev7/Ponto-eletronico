import type { AiCapability, AiCompanyContext, AiStructuredResult } from "@/lib/ai/types";

function centsToEur(cents: number): string {
  return `€${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`;
}

export function runFallbackCapability(
  capability: AiCapability,
  ctx: AiCompanyContext,
): AiStructuredResult {
  switch (capability) {
    case "optimize_schedules":
      return optimizeSchedulesFallback(ctx);
    case "suggest_workforce_allocation":
      return workforceAllocationFallback(ctx);
    case "estimate_costs":
      return estimateCostsFallback(ctx);
    case "predict_delays":
      return predictDelaysFallback(ctx);
    case "generate_quotes":
      return generateQuotesFallback(ctx);
    case "generate_reports":
      return generateReportsFallback(ctx);
    case "analyze_productivity":
      return analyzeProductivityFallback(ctx);
    default:
      return {
        summary: "Capability not available.",
        insights: [],
        recommendations: [],
      };
  }
}

function optimizeSchedulesFallback(ctx: AiCompanyContext): AiStructuredResult {
  const insights = [];
  if (ctx.tasks.unassigned > 0) {
    insights.push({
      title: "Tarefas sem atribuição",
      description: `${ctx.tasks.unassigned} tarefas aguardam colaborador. Priorize atribuição antes de redistribuir datas.`,
      priority: "high" as const,
      metric: String(ctx.tasks.unassigned),
    });
  }
  if (ctx.tasks.overdue > 0) {
    insights.push({
      title: "Tarefas em atraso",
      description: `${ctx.tasks.overdue} tarefas passaram da data planeada. Considere reagendar ou reforçar equipa.`,
      priority: "high" as const,
      metric: String(ctx.tasks.overdue),
    });
  }
  if (ctx.workforce.openShifts > 0) {
    insights.push({
      title: "Turnos abertos",
      description: `${ctx.workforce.openShifts} turnos sem colaborador esta semana.`,
      priority: "medium" as const,
    });
  }

  const recommendations = [
    ctx.tasks.unassigned > 0
      ? "Execute auto-plan no planeamento de workforce para preencher lacunas."
      : "Revise a carga semanal e agrupe visitas por zona geográfica.",
    ctx.tasks.overdue > 3
      ? "Adie tarefas de baixa prioridade e concentre equipa nas críticas."
      : "Mantenha buffer de 15% na agenda diária para imprevistos.",
  ];

  return {
    summary: `Análise de agenda: ${ctx.tasks.scheduled} agendadas, ${ctx.tasks.overdue} em atraso, ${ctx.tasks.unassigned} sem atribuição.`,
    insights,
    recommendations,
    metrics: {
      scheduled: ctx.tasks.scheduled,
      overdue: ctx.tasks.overdue,
      unassigned: ctx.tasks.unassigned,
      visitsThisWeek: ctx.operations.visitsThisWeek,
    },
  };
}

function workforceAllocationFallback(ctx: AiCompanyContext): AiStructuredResult {
  const loadPerEmployee = ctx.productivity.avgTasksPerEmployee;
  const insights = [];

  if (ctx.workforce.utilizationPct < 70) {
    insights.push({
      title: "Subutilização de equipa",
      description: `Utilização de turnos em ${ctx.workforce.utilizationPct}%. Há capacidade para absorver mais serviços.`,
      priority: "medium" as const,
      metric: `${ctx.workforce.utilizationPct}%`,
    });
  } else if (ctx.workforce.utilizationPct > 95) {
    insights.push({
      title: "Equipa sobrecarregada",
      description: `Utilização em ${ctx.workforce.utilizationPct}%. Risco de atrasos e burnout.`,
      priority: "high" as const,
      metric: `${ctx.workforce.utilizationPct}%`,
    });
  }

  if (ctx.workforce.onVacation > 0) {
    insights.push({
      title: "Colaboradores ausentes",
      description: `${ctx.workforce.onVacation} em férias hoje — redistribua turnos críticos.`,
      priority: "medium" as const,
    });
  }

  return {
    summary: `${ctx.workforce.activeEmployees} colaboradores ativos, ${ctx.workforce.openShifts} turnos abertos, média de ${loadPerEmployee} tarefas/colaborador.`,
    insights,
    recommendations: [
      ctx.workforce.openShifts > 0
        ? "Preencha turnos abertos com colaboradores de menor carga (ver planeamento)."
        : "Balanceie tarefas entre colaboradores com skills compatíveis.",
      ctx.workforce.utilizationPct > 90
        ? "Considere contratar temporários ou subcontratar picos."
        : "Use auto-plan para otimizar a semana atual.",
    ],
    metrics: {
      activeEmployees: ctx.workforce.activeEmployees,
      openShifts: ctx.workforce.openShifts,
      utilizationPct: ctx.workforce.utilizationPct,
    },
  };
}

function estimateCostsFallback(ctx: AiCompanyContext): AiStructuredResult {
  const laborEstimateCents = Math.round(
    ctx.workforce.activeEmployees * 40 * 4.33 * 2500,
  );
  const totalExposureCents = ctx.finance.outstandingCents + laborEstimateCents;

  return {
    summary: `MRR ${centsToEur(ctx.finance.mrrCents)}, recebido YTD ${centsToEur(ctx.finance.receivedYtdCents)}, exposição estimada ${centsToEur(totalExposureCents)}.`,
    insights: [
      {
        title: "Receita recorrente",
        description: `Contratos ativos geram ~${centsToEur(ctx.finance.mrrCents)}/mês.`,
        metric: centsToEur(ctx.finance.mrrCents),
      },
      {
        title: "Contas a receber",
        description: `${ctx.finance.openInvoices} faturas em aberto (${centsToEur(ctx.finance.outstandingCents)}).`,
        priority: ctx.finance.overdueInvoices > 0 ? "high" : "medium",
        metric: centsToEur(ctx.finance.outstandingCents),
      },
      {
        title: "Custo operacional estimado",
        description: `Estimativa mensal de mão-de-obra: ${centsToEur(laborEstimateCents)} (${ctx.workforce.activeEmployees} FTE).`,
        metric: centsToEur(laborEstimateCents),
      },
    ],
    recommendations: [
      ctx.finance.overdueInvoices > 0
        ? "Ative automação de lembrete para faturas vencidas."
        : "Mantenha margem de 25–35% sobre custo de mão-de-obra.",
      "Revise contratos com baixa margem no módulo de rentabilidade.",
    ],
    metrics: {
      mrrCents: ctx.finance.mrrCents,
      outstandingCents: ctx.finance.outstandingCents,
      laborEstimateCents,
    },
  };
}

function predictDelaysFallback(ctx: AiCompanyContext): AiStructuredResult {
  const riskScore =
    ctx.tasks.overdue * 3 +
    ctx.tasks.unassigned * 2 +
    (ctx.workforce.utilizationPct > 90 ? 5 : 0) +
    ctx.workforce.openShifts;

  const riskLevel = riskScore > 15 ? "high" : riskScore > 8 ? "medium" : "low";

  return {
    summary: `Risco de atrasos: ${riskLevel === "high" ? "elevado" : riskLevel === "medium" ? "moderado" : "baixo"} (score ${riskScore}).`,
    insights: [
      {
        title: "Tarefas em atraso",
        description: `${ctx.tasks.overdue} tarefas já passaram do prazo.`,
        priority: ctx.tasks.overdue > 0 ? "high" : "low",
        metric: String(ctx.tasks.overdue),
      },
      {
        title: "Taxa de pontualidade",
        description: `${ctx.productivity.onTimeRatePct}% das conclusões foram no prazo.`,
        metric: `${ctx.productivity.onTimeRatePct}%`,
      },
      {
        title: "Capacidade da equipa",
        description: `Utilização ${ctx.workforce.utilizationPct}% com ${ctx.workforce.openShifts} turnos por preencher.`,
        priority: ctx.workforce.utilizationPct > 90 ? "high" : "medium",
      },
    ],
    recommendations: [
      riskLevel === "high"
        ? "Reagende tarefas não críticas e comunique atrasos aos clientes afetados."
        : "Monitorize tarefas de amanhã sem atribuição.",
      "Use o calendário operacional para visualizar concentração de visitas.",
    ],
    metrics: { riskScore, onTimeRatePct: ctx.productivity.onTimeRatePct },
  };
}

function generateQuotesFallback(ctx: AiCompanyContext): AiStructuredResult {
  const monthlyRate = ctx.finance.mrrCents / Math.max(1, ctx.operations.activeContracts);
  const suggestedMonthly = monthlyRate > 0 ? monthlyRate : 150000;

  const generatedContent = `ORÇAMENTO — ${ctx.companyName}

Serviços de manutenção e limpeza
Imóvel / local: [A definir]
Frequência: Mensal

Itens:
• Limpeza de áreas comuns — ${centsToEur(Math.round(suggestedMonthly * 0.6))}/mês
• Manutenção preventiva — ${centsToEur(Math.round(suggestedMonthly * 0.25))}/mês
• Materiais e consumíveis — ${centsToEur(Math.round(suggestedMonthly * 0.15))}/mês

Subtotal: ${centsToEur(suggestedMonthly)}
IVA (19%): ${centsToEur(Math.round(suggestedMonthly * 0.19))}
Total: ${centsToEur(Math.round(suggestedMonthly * 1.19))}

Validade: 30 dias
Condições: Pagamento a 14 dias após faturação.`;

  return {
    summary: "Rascunho de orçamento gerado com base na média dos contratos ativos.",
    insights: [
      {
        title: "Referência de preço",
        description: `Média mensal por contrato: ${centsToEur(Math.round(monthlyRate || suggestedMonthly))}.`,
      },
    ],
    recommendations: [
      "Ajuste valores por tipo de serviço e metragem do imóvel.",
      "Importe para Finance → Orçamentos para formalizar.",
    ],
    generatedContent,
  };
}

function generateReportsFallback(ctx: AiCompanyContext): AiStructuredResult {
  const generatedContent = `RELATÓRIO OPERACIONAL — ${ctx.companyName}
Período: Ano corrente

Resumo executivo
• ${ctx.tasks.completed} serviços concluídos de ${ctx.tasks.total} planeados (${ctx.productivity.completionRatePct}%)
• ${ctx.operations.activeContracts} contratos ativos em ${ctx.operations.activeProperties} propriedades
• Receita recebida: ${centsToEur(ctx.finance.receivedYtdCents)}
• MRR: ${centsToEur(ctx.finance.mrrCents)}

Workforce
• ${ctx.workforce.activeEmployees} colaboradores ativos
• Utilização de turnos: ${ctx.workforce.utilizationPct}%
• Pontualidade: ${ctx.productivity.onTimeRatePct}%

Riscos
• ${ctx.tasks.overdue} tarefas em atraso
• ${ctx.finance.overdueInvoices} faturas vencidas

Recomendações
1. Reduzir tarefas sem atribuição (${ctx.tasks.unassigned})
2. Reforçar cobrança de faturas em aberto
3. Otimizar agenda semanal no módulo Operações`;

  return {
    summary: "Relatório executivo gerado com dados atuais da empresa.",
    insights: [
      {
        title: "Taxa de conclusão",
        description: `${ctx.productivity.completionRatePct}% das tarefas concluídas.`,
        metric: `${ctx.productivity.completionRatePct}%`,
      },
      {
        title: "Saúde financeira",
        description: `${ctx.finance.openInvoices} faturas em aberto.`,
        priority: ctx.finance.overdueInvoices > 0 ? "high" : "low",
      },
    ],
    recommendations: [
      "Exporte este resumo para PDF em Relatórios.",
      "Partilhe com clientes via portal (relatórios visíveis).",
    ],
    generatedContent,
  };
}

function analyzeProductivityFallback(ctx: AiCompanyContext): AiStructuredResult {
  return {
    summary: `Produtividade: ${ctx.productivity.completionRatePct}% conclusão, ${ctx.productivity.onTimeRatePct}% no prazo, ${ctx.productivity.avgTasksPerEmployee} tarefas/colaborador.`,
    insights: [
      {
        title: "Taxa de conclusão",
        description: `${ctx.productivity.completionRatePct}% do volume anual concluído.`,
        metric: `${ctx.productivity.completionRatePct}%`,
      },
      {
        title: "Pontualidade",
        description: `${ctx.productivity.onTimeRatePct}% entregas no prazo.`,
        metric: `${ctx.productivity.onTimeRatePct}%`,
        priority: ctx.productivity.onTimeRatePct < 80 ? "high" : "low",
      },
      {
        title: "Carga por colaborador",
        description: `Média de ${ctx.productivity.avgTasksPerEmployee} tarefas ativas por colaborador.`,
        metric: String(ctx.productivity.avgTasksPerEmployee),
      },
    ],
    recommendations: [
      ctx.productivity.onTimeRatePct < 85
        ? "Investigue causas de atraso: rotas, skills ou materiais em falta."
        : "Mantenha práticas atuais e documente processos de sucesso.",
      "Compare com Analytics → Operacional para tendências mensais.",
    ],
    metrics: {
      completionRatePct: ctx.productivity.completionRatePct,
      onTimeRatePct: ctx.productivity.onTimeRatePct,
      utilizationPct: ctx.workforce.utilizationPct,
    },
  };
}

export function runFallbackChat(
  message: string,
  ctx: AiCompanyContext,
): AiStructuredResult {
  const lower = message.toLowerCase();
  if (lower.includes("atraso") || lower.includes("delay")) {
    return predictDelaysFallback(ctx);
  }
  if (lower.includes("custo") || lower.includes("cost") || lower.includes("orçamento")) {
    return estimateCostsFallback(ctx);
  }
  if (lower.includes("equipa") || lower.includes("workforce") || lower.includes("escala")) {
    return workforceAllocationFallback(ctx);
  }
  if (lower.includes("agenda") || lower.includes("schedule") || lower.includes("rota")) {
    return optimizeSchedulesFallback(ctx);
  }
  if (lower.includes("relatório") || lower.includes("report")) {
    return generateReportsFallback(ctx);
  }
  if (lower.includes("produtiv")) {
    return analyzeProductivityFallback(ctx);
  }
  if (lower.includes("orçamento") || lower.includes("quote")) {
    return generateQuotesFallback(ctx);
  }

  return {
    summary: `Assistente IA (${ctx.companyName}): ${ctx.tasks.overdue} tarefas em atraso, ${ctx.finance.openInvoices} faturas abertas, utilização ${ctx.workforce.utilizationPct}%.`,
    insights: [
      {
        title: "Estado operacional",
        description: `${ctx.tasks.scheduled} agendadas, ${ctx.tasks.completed} concluídas.`,
      },
      {
        title: "Finanças",
        description: `MRR ${centsToEur(ctx.finance.mrrCents)}, pendente ${centsToEur(ctx.finance.outstandingCents)}.`,
      },
    ],
    recommendations: [
      "Pergunte sobre: agenda, equipa, custos, atrasos, orçamentos ou relatórios.",
      "Use as capacidades rápidas no painel para análises detalhadas.",
    ],
  };
}
