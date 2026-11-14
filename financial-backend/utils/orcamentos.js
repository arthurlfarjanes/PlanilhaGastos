/**
 * Cálculos determinísticos de Orçamento por Categoria (em centavos inteiros).
 */
const { toCents, fromCents } = require("./contasFixas");

/**
 * Retorna intervalo de datas [inicioISO, fimExclusivoISO) do mês para usar o índice (user_id, data).
 */
function monthDateBounds(ano, mes) {
  const start = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;
  const endExclusive = `${nextAno}-${String(nextMes).padStart(2, "0")}-01`;
  return { start, endExclusive };
}

function enrichOrcamento(row, ano, mes) {
  const limiteCents = toCents(row.valor_limite);
  const gastoCents = toCents(row.gasto_realizado || 0);
  const restanteCents = limiteCents - gastoCents;
  const percentual =
    limiteCents > 0 ? Math.round((gastoCents * 1000) / limiteCents) / 10 : 0;

  const ativo = row.ativo !== false;
  const alertaPct = Number(row.alerta_percentual || 80);

  let status = "ok";
  if (!ativo) {
    status = "inativo";
  } else if (gastoCents > limiteCents) {
    status = "excedido";
  } else if (percentual >= alertaPct) {
    status = "alerta";
  }

  return {
    id: row.id,
    categoria_id: row.categoria_id,
    categoria_nome: row.categoria_nome || "Sem categoria",
    categoria_cor: row.categoria_cor || "#10b981",
    valor_limite: fromCents(limiteCents),
    alerta_percentual: alertaPct,
    ativo,
    competencia_ano: ano,
    competencia_mes: mes,
    gasto_realizado: fromCents(gastoCents),
    saldo_restante: fromCents(restanteCents),
    percentual_consumido: percentual,
    status,
  };
}

function calcularResumoOrcamentos(itens) {
  let totalOrcadoCents = 0;
  let totalGastoCents = 0;
  let ativos = 0;
  let ok = 0;
  let emAlerta = 0;
  let excedidos = 0;

  for (const item of itens) {
    if (!item.ativo) continue;
    ativos++;
    totalOrcadoCents += toCents(item.valor_limite);
    totalGastoCents += toCents(item.gasto_realizado);

    if (item.status === "excedido") excedidos++;
    else if (item.status === "alerta") emAlerta++;
    else ok++;
  }

  const saldoDisponivelCents = totalOrcadoCents - totalGastoCents;
  const percentualGeral =
    totalOrcadoCents > 0
      ? Number(((totalGastoCents * 100) / totalOrcadoCents).toFixed(1))
      : 0;

  return {
    total_orcado: fromCents(totalOrcadoCents),
    total_gasto: fromCents(totalGastoCents),
    saldo_disponivel: fromCents(saldoDisponivelCents),
    percentual_geral: percentualGeral,
    contagem: {
      total: itens.length,
      ativos,
      ok,
      em_alerta: emAlerta,
      excedidos,
    },
  };
}

module.exports = {
  monthDateBounds,
  enrichOrcamento,
  calcularResumoOrcamentos,
};
