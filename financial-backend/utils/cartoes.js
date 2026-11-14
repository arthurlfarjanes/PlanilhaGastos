/**
 * Motor determinístico de Cartões e faturas (centavos inteiros).
 *
 * Modelo: cada despesa atrelada a um cartão (transacoes.cartao_id) é um "lançamento"
 * da fatura. Compras parceladas já são N transações mensais, então cada parcela cai
 * na fatura correspondente à sua própria data.
 *
 * Convenções:
 * - A fatura é identificada pela competência (ano, mes) do mês de FECHAMENTO.
 * - Lançamento até o dia de fechamento (inclusive) entra na fatura do próprio mês;
 *   depois do fechamento, entra na fatura do mês seguinte.
 * - Vencimento: mesmo mês do fechamento se dia_vencimento > dia_fechamento;
 *   caso contrário, mês seguinte.
 * - Dias inexistentes (ex.: 31 em fevereiro) são ajustados para o último dia do mês.
 * - O pagamento da fatura apenas a liquida; não gera nova despesa.
 */
const { toCents, fromCents, resolveDueDate, diffDaysISO, todayISO } = require("./contasFixas");

function addMonths(ano, mes, n) {
  const idx = ano * 12 + (mes - 1) + n;
  return { ano: Math.floor(idx / 12), mes: (idx % 12) + 1 };
}

function compKey(ano, mes) {
  return ano * 12 + (mes - 1);
}

/** Fatura (competência) em que um lançamento com a data informada (YYYY-MM-DD) cai. */
function faturaDaData(dataISO, diaFechamento) {
  const [y, m, d] = String(dataISO).slice(0, 10).split("-").map(Number);
  const fechamento = resolveDueDate(y, m, diaFechamento);
  const diaFech = Number(fechamento.slice(8, 10));
  return d <= diaFech ? { ano: y, mes: m } : addMonths(y, m, 1);
}

function datasDaFatura(ano, mes, diaFechamento, diaVencimento) {
  const fechamento = resolveDueDate(ano, mes, diaFechamento);
  const mesmoMes = Number(diaVencimento) > Number(diaFechamento);
  const v = mesmoMes ? { ano, mes } : addMonths(ano, mes, 1);
  return { fechamento, vencimento: resolveDueDate(v.ano, v.mes, diaVencimento) };
}

/**
 * lancamentos: [{ id, descricao, valor, data (YYYY-MM-DD), categoria_id }]
 * pagamento: linha de cartoes_faturas_pagas (ou null).
 * Status: paga | vencida | fechada | aberta
 */
function calcularFatura(cartao, lancamentos, ano, mes, pagamento = null, hoje = todayISO()) {
  const itens = lancamentos
    .filter((l) => {
      const f = faturaDaData(l.data, cartao.dia_fechamento);
      return f.ano === ano && f.mes === mes;
    })
    .sort((a, b) => String(a.data).localeCompare(String(b.data)) || a.id - b.id);

  const totalCents = itens.reduce((acc, l) => acc + toCents(l.valor), 0);
  const { fechamento, vencimento } = datasDaFatura(ano, mes, cartao.dia_fechamento, cartao.dia_vencimento);

  let status;
  if (pagamento) status = "paga";
  else if (diffDaysISO(vencimento, hoje) > 0) status = "vencida";
  else if (diffDaysISO(fechamento, hoje) > 0) status = "fechada";
  else status = "aberta";

  return {
    competencia_ano: ano,
    competencia_mes: mes,
    fechamento,
    vencimento,
    status,
    total: fromCents(totalCents),
    valor_pago: pagamento ? fromCents(toCents(pagamento.valor_pago)) : null,
    data_pagamento: pagamento ? pagamento.data_pagamento : null,
    itens: itens.map((l) => ({
      transacao_id: l.id,
      descricao: l.descricao,
      categoria_id: l.categoria_id || null,
      data: String(l.data).slice(0, 10),
      valor: fromCents(toCents(l.valor)),
    })),
  };
}

/**
 * Limite usado = soma dos lançamentos de faturas ainda não pagas (inclusive futuras).
 * Quando competenciaRef ({ ano, mes }) é informada, também detalha quanto pertence
 * à fatura selecionada vs. outras faturas em aberto e lista cada competência em aberto.
 */
function calcularLimite(cartao, lancamentos, pagamentos = [], competenciaRef = null) {
  const pagas = new Set(pagamentos.map((p) => compKey(Number(p.competencia_ano), Number(p.competencia_mes))));
  const hasRef =
    competenciaRef &&
    Number.isInteger(Number(competenciaRef.ano)) &&
    Number.isInteger(Number(competenciaRef.mes));
  const refKey = hasRef ? compKey(Number(competenciaRef.ano), Number(competenciaRef.mes)) : null;

  let usadoCents = 0;
  let usadoMesCents = 0;
  let usadoOutrasCents = 0;
  const abertasMap = new Map();

  for (const l of lancamentos) {
    const f = faturaDaData(l.data, cartao.dia_fechamento);
    const key = compKey(f.ano, f.mes);
    if (pagas.has(key)) continue;

    const valCents = toCents(l.valor);
    usadoCents += valCents;
    if (refKey !== null) {
      if (key === refKey) usadoMesCents += valCents;
      else usadoOutrasCents += valCents;
    }

    const prev = abertasMap.get(key) || { ano: f.ano, mes: f.mes, totalCents: 0, quantidade: 0 };
    prev.totalCents += valCents;
    prev.quantidade += 1;
    abertasMap.set(key, prev);
  }

  const limiteCents = toCents(cartao.limite_total);
  const pct = (cents) =>
    limiteCents > 0 ? Math.min(999, Math.round((cents * 1000) / limiteCents) / 10) : 0;

  const faturasEmAberto = Array.from(abertasMap.values())
    .filter((f) => f.totalCents > 0)
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .map((f) => ({
      ano: f.ano,
      mes: f.mes,
      total: fromCents(f.totalCents),
      quantidade: f.quantidade,
    }));

  return {
    limite_total: fromCents(limiteCents),
    limite_usado: fromCents(usadoCents),
    limite_usado_mes: fromCents(usadoMesCents),
    limite_usado_outras: fromCents(usadoOutrasCents),
    limite_disponivel: fromCents(limiteCents - usadoCents),
    percentual_usado: pct(usadoCents),
    percentual_usado_mes: pct(usadoMesCents),
    percentual_usado_outras: pct(usadoOutrasCents),
    faturas_em_aberto: faturasEmAberto,
  };
}

/** Indica se a data cai em uma fatura já paga (pagamentos = linhas de cartoes_faturas_pagas). */
function dataEmFaturaPaga(cartao, dataISO, pagamentos = []) {
  const f = faturaDaData(dataISO, cartao.dia_fechamento);
  return pagamentos.some(
    (p) => Number(p.competencia_ano) === f.ano && Number(p.competencia_mes) === f.mes,
  );
}

module.exports = {
  addMonths,
  faturaDaData,
  datasDaFatura,
  calcularFatura,
  calcularLimite,
  dataEmFaturaPaga,
};
