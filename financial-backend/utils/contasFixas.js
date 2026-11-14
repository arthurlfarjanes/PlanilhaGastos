/**
 * Utilitários determinísticos para Contas Fixas, Vencimentos e Assinaturas.
 * Todos os cálculos monetários usam centavos inteiros para evitar erro de ponto flutuante.
 */

function toCents(val) {
  if (val === null || val === undefined || val === "") return 0;
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

function daysInMonth(ano, mes) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/**
 * Resolve a data de vencimento (YYYY-MM-DD) para uma competência (ano, mes).
 * Se dia_vencimento exceder o total de dias do mês (ex.: 31 em fevereiro), ajusta para o último dia do mês.
 */
function resolveDueDate(ano, mes, diaVencimento) {
  const maxDay = daysInMonth(ano, mes);
  const dia = Math.min(Math.max(1, Number(diaVencimento) || 1), maxDay);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function diffDaysISO(fromISO, toISO) {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  const msFrom = Date.UTC(fy, fm - 1, fd);
  const msTo = Date.UTC(ty, tm - 1, td);
  return Math.round((msTo - msFrom) / 86400000);
}

function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseCompetencia(query = {}, now = new Date()) {
  const ano = Number(query.ano);
  const mes = Number(query.mes);
  const validAno = Number.isInteger(ano) && ano >= 2000 && ano <= 2100 ? ano : now.getFullYear();
  const validMes = Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : now.getMonth() + 1;
  return { ano: validAno, mes: validMes };
}

/**
 * Determina status determinístico de um item na competência solicitada.
 */
function enrichContaCompetencia(row, ano, mes, refTodayISO = todayISO()) {
  const dataVencimento = resolveDueDate(ano, mes, row.dia_vencimento);
  const diasParaVencer = diffDaysISO(refTodayISO, dataVencimento);

  const pagamento = row.pagamento_id
    ? {
        id: row.pagamento_id,
        valor_pago: Number(row.valor_pago),
        data_pagamento:
          row.data_pagamento instanceof Date
            ? row.data_pagamento.toISOString().slice(0, 10)
            : String(row.data_pagamento).slice(0, 10),
        transacao_id: row.transacao_id || null,
      }
    : null;

  let status = "pendente";
  if (pagamento) {
    status = "pago";
  } else if (!row.ativo) {
    status = "inativo";
  } else if (diasParaVencer < 0) {
    status = "atrasado";
  } else if (diasParaVencer === 0) {
    status = "vence_hoje";
  }

  return {
    id: row.id,
    descricao: row.descricao,
    valor: Number(row.valor),
    dia_vencimento: row.dia_vencimento,
    categoria_id: row.categoria_id,
    tipo: row.tipo,
    is_assinatura: Boolean(row.is_assinatura),
    ativo: row.ativo !== false,
    gerar_automatico: row.gerar_automatico !== false,
    categoria_nome: row.categoria_nome || null,
    categoria_cor: row.categoria_cor || null,
    competencia_ano: ano,
    competencia_mes: mes,
    data_vencimento: dataVencimento,
    dias_para_vencer: diasParaVencer,
    status_competencia: status,
    pagamento,
  };
}

/**
 * Calcula resumo financeiro determinístico (em centavos inteiros) a partir de itens enriquecidos.
 */
function calcularResumoContas(itens) {
  let receitasPrevistasCents = 0;
  let despesasPrevistasCents = 0;
  let despesasPagasCents = 0;
  let despesasPendentesCents = 0;
  let assinaturasCents = 0;

  let pagas = 0;
  let pendentes = 0;
  let atrasadas = 0;
  let assinaturas = 0;
  let ativas = 0;

  for (const item of itens) {
    if (!item.ativo && !item.pagamento) continue;
    ativas++;

    const valCents = toCents(item.valor);
    const pagoCents = item.pagamento ? toCents(item.pagamento.valor_pago) : 0;

    if (item.tipo === "receita") {
      receitasPrevistasCents += valCents;
    } else {
      despesasPrevistasCents += valCents;
      if (item.pagamento) {
        despesasPagasCents += pagoCents;
      } else {
        despesasPendentesCents += valCents;
      }
      if (item.is_assinatura) {
        assinaturas++;
        assinaturasCents += valCents;
      }

      if (item.status_competencia === "pago") pagas++;
      else if (item.status_competencia === "atrasado") {
        atrasadas++;
        pendentes++;
      } else if (item.status_competencia === "pendente" || item.status_competencia === "vence_hoje") {
        pendentes++;
      }
    }
  }

  const proximosVencimentos = itens
    .filter(
      (i) =>
        i.ativo &&
        i.tipo !== "receita" &&
        (i.status_competencia === "atrasado" ||
          i.status_competencia === "vence_hoje" ||
          i.status_competencia === "pendente"),
    )
    .sort((a, b) => a.dias_para_vencer - b.dias_para_vencer);

  return {
    total_receitas_previstas: fromCents(receitasPrevistasCents),
    total_despesas_previstas: fromCents(despesasPrevistasCents),
    balanco_previsto: fromCents(receitasPrevistasCents - despesasPrevistasCents),
    total_despesas_pagas: fromCents(despesasPagasCents),
    total_despesas_pendentes: fromCents(despesasPendentesCents),
    total_assinaturas: fromCents(assinaturasCents),
    contagem: {
      total: itens.length,
      ativas,
      pagas,
      pendentes,
      atrasadas,
      assinaturas,
    },
    proximos_vencimentos: proximosVencimentos,
  };
}

module.exports = {
  toCents,
  fromCents,
  daysInMonth,
  resolveDueDate,
  diffDaysISO,
  todayISO,
  parseCompetencia,
  enrichContaCompetencia,
  calcularResumoContas,
};
