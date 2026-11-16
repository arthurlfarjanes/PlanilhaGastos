/**
 * Motor determinístico de lembretes/notificações financeiras.
 * Reaproveita os estados reais de contas fixas, faturas de cartões, orçamentos e objetivos.
 */
const { diffDaysISO, todayISO } = require("./contasFixas");

const SEVERIDADE_PESO = { alta: 1, media: 2, baixa: 3 };

function gerarLembretesFinanceiros({
  contas = [],
  cartoesFaturas = [],
  orcamentos = [],
  objetivos = [],
  prefs = {},
  refTodayISO = todayISO(),
} = {}) {
  const enabled = prefs.enabled !== false;
  if (!enabled) {
    return {
      resumo: { total: 0, alta: 0, media: 0, baixa: 0 },
      lembretes: [],
    };
  }

  const daysAhead =
    Number.isInteger(prefs.daysAhead) && prefs.daysAhead >= 1 ? prefs.daysAhead : 5;
  const remindBills = prefs.remindBills !== false;
  const remindCards = prefs.remindCards !== false;
  const remindBudgets = prefs.remindBudgets !== false;
  const remindGoals = prefs.remindGoals !== false;

  const lembretes = [];

  if (remindBills) {
    for (const c of contas) {
      const pago = Boolean(c.pagamento || c.pago || c.status_competencia === "pago");
      const statusConta = c.status_competencia || c.status;
      if (!c.ativo || pago || c.tipo !== "despesa") continue;
      if (statusConta === "atrasado") {
        const atraso = Math.abs(Number(c.dias_para_vencer || 0));
        lembretes.push({
          id: `conta-${c.id}`,
          origem: "conta",
          severidade: "alta",
          titulo: `Conta atrasada: ${c.descricao}`,
          descricao:
            atraso > 0
              ? `Venceu há ${atraso} dia(s) (${c.data_vencimento}).`
              : `Venceu em ${c.data_vencimento}.`,
          valor: c.valor,
          data_referencia: c.data_vencimento,
          link: "/gastos-fixos",
        });
      } else if (statusConta === "vence_hoje") {
        lembretes.push({
          id: `conta-${c.id}`,
          origem: "conta",
          severidade: "alta",
          titulo: `Vence hoje: ${c.descricao}`,
          descricao: "Conta fixa ou assinatura com vencimento hoje.",
          valor: c.valor,
          data_referencia: c.data_vencimento,
          link: "/gastos-fixos",
        });
      } else if (
        statusConta === "pendente" &&
        c.dias_para_vencer != null &&
        c.dias_para_vencer > 0 &&
        c.dias_para_vencer <= daysAhead
      ) {
        lembretes.push({
          id: `conta-${c.id}`,
          origem: "conta",
          severidade: "media",
          titulo: `Vence em ${c.dias_para_vencer} dia(s): ${c.descricao}`,
          descricao: `Vencimento previsto para ${c.data_vencimento}.`,
          valor: c.valor,
          data_referencia: c.data_vencimento,
          link: "/gastos-fixos",
        });
      }
    }
  }

  if (remindCards) {
    for (const f of cartoesFaturas) {
      const paga = Boolean(f && (f.paga || f.status === "paga"));
      if (!f || paga || Number(f.total || 0) <= 0) continue;
      const dataVenc = f.vencimento || f.data_vencimento || null;
      const dias = dataVenc ? diffDaysISO(refTodayISO, dataVenc) : null;
      if (f.status === "vencida" || (dias !== null && dias < 0)) {
        lembretes.push({
          id: `cartao-${f.cartao_id}-${f.competencia_ano}-${f.competencia_mes}`,
          origem: "cartao",
          severidade: "alta",
          titulo: `Fatura vencida: ${f.cartao_nome}`,
          descricao: `Fatura ${String(f.competencia_mes).padStart(2, "0")}/${f.competencia_ano} venceu em ${dataVenc}.`,
          valor: f.total,
          data_referencia: dataVenc,
          link: "/cartoes",
        });
      } else if (dias !== null && dias >= 0 && dias <= daysAhead) {
        lembretes.push({
          id: `cartao-${f.cartao_id}-${f.competencia_ano}-${f.competencia_mes}`,
          origem: "cartao",
          severidade: dias === 0 ? "alta" : "media",
          titulo:
            dias === 0
              ? `Fatura vence hoje: ${f.cartao_nome}`
              : `Fatura vence em ${dias} dia(s): ${f.cartao_nome}`,
          descricao: `Fatura ${String(f.competencia_mes).padStart(2, "0")}/${f.competencia_ano} (${f.status}).`,
          valor: f.total,
          data_referencia: dataVenc,
          link: "/cartoes",
        });
      }
    }
  }

  if (remindBudgets) {
    for (const o of orcamentos) {
      if (!o.ativo) continue;
      const pctConsumido = o.percentual_consumido ?? o.percentual_usado ?? 0;
      if (o.status === "excedido") {
        lembretes.push({
          id: `orcamento-${o.id}`,
          origem: "orcamento",
          severidade: "alta",
          titulo: `Orçamento excedido: ${o.categoria_nome}`,
          descricao: `${pctConsumido}% do limite mensal já foi utilizado.`,
          valor: o.gasto_realizado,
          data_referencia: refTodayISO,
          link: "/orcamentos",
        });
      } else if (o.status === "alerta") {
        lembretes.push({
          id: `orcamento-${o.id}`,
          origem: "orcamento",
          severidade: "media",
          titulo: `Orçamento em alerta: ${o.categoria_nome}`,
          descricao: `${pctConsumido}% do limite mensal atingido (alerta em ${o.alerta_percentual}%).`,
          valor: o.gasto_realizado,
          data_referencia: refTodayISO,
          link: "/orcamentos",
        });
      }
    }
  }

  if (remindGoals) {
    for (const obj of objetivos) {
      if (obj.status !== "ativo") continue;
      if (obj.situacao_prazo === "atrasado") {
        lembretes.push({
          id: `objetivo-${obj.id}`,
          origem: "objetivo",
          severidade: "alta",
          titulo: `Prazo vencido: ${obj.nome}`,
          descricao: `A meta tinha prazo para ${obj.prazo} e ainda faltam valores.`,
          valor: obj.valor_restante,
          data_referencia: obj.prazo,
          link: "/objetivos",
        });
      } else if (
        obj.dias_ate_prazo !== null &&
        obj.dias_ate_prazo >= 0 &&
        obj.dias_ate_prazo <= daysAhead
      ) {
        lembretes.push({
          id: `objetivo-${obj.id}`,
          origem: "objetivo",
          severidade: "media",
          titulo:
            obj.dias_ate_prazo === 0
              ? `Meta vence hoje: ${obj.nome}`
              : `Meta próxima do prazo (${obj.dias_ate_prazo}d): ${obj.nome}`,
          descricao: `Progresso atual de ${obj.percentual_concluido}% até ${obj.prazo}.`,
          valor: obj.valor_restante,
          data_referencia: obj.prazo,
          link: "/objetivos",
        });
      } else if (obj.situacao_prazo === "atencao") {
        lembretes.push({
          id: `objetivo-${obj.id}`,
          origem: "objetivo",
          severidade: "baixa",
          titulo: `Ritmo abaixo do necessário: ${obj.nome}`,
          descricao: `Necessário cerca de R$ ${Number(obj.aporte_necessario_prazo || 0).toFixed(2)}/mês para cumprir o prazo ${obj.prazo}.`,
          valor: obj.aporte_necessario_prazo,
          data_referencia: obj.prazo || refTodayISO,
          link: "/objetivos",
        });
      }
    }
  }

  lembretes.sort((a, b) => {
    const pDiff = (SEVERIDADE_PESO[a.severidade] || 9) - (SEVERIDADE_PESO[b.severidade] || 9);
    if (pDiff !== 0) return pDiff;
    return String(a.data_referencia || "").localeCompare(String(b.data_referencia || ""));
  });

  const contagem = {
    total: lembretes.length,
    alta: lembretes.filter((l) => l.severidade === "alta").length,
    media: lembretes.filter((l) => l.severidade === "media").length,
    baixa: lembretes.filter((l) => l.severidade === "baixa").length,
  };

  return { resumo: contagem, lembretes };
}

module.exports = {
  gerarLembretesFinanceiros,
};
