/**
 * Serviço agregador para Diagnósticos Financeiros determinísticos.
 * Reutilizado por `/inteligencia/diagnosticos` e pela ferramenta somente leitura do Teco.
 */
const pool = require("../config/db");
const {
  toCents,
  todayISO,
  enrichContaCompetencia,
  calcularResumoContas,
} = require("../utils/contasFixas");
const { monthDateBounds, enrichOrcamento } = require("../utils/orcamentos");
const { enrichDivida, calcularResumoDividas } = require("../utils/dividas");
const { calcularFatura, calcularLimite } = require("../utils/cartoes");
const { enrichPatrimonioItem, calcularResumoPatrimonio } = require("../utils/patrimonio");
const { enrichObjetivo, calcularResumoObjetivos } = require("../utils/objetivos");
const { calcularIndicadoresFinanceiros } = require("../utils/indicadores");
const {
  detectarRecorrenciasNaoCadastradas,
  analisarAnomaliasCategorias,
  calcularDiagnosticosFinanceiros,
} = require("../utils/diagnosticos");
const { gerarPlanoOtimizacao } = require("../utils/otimizacao");

function shiftMonthsISO(ano, mes, deltaMonths) {
  const d = new Date(Date.UTC(ano, mes - 1 + deltaMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function collectFinancialSnapshot(userId, refDate = todayISO()) {
  const [ano, mes] = refDate.split("-").map(Number);
  const { start, endExclusive } = monthDateBounds(ano, mes);
  const histStart = shiftMonthsISO(ano, mes, -3);

  const [
    txMesRes,
    atualCatRes,
    histCatRes,
    txRecentesRes,
    fixasRes,
    fixasPgtoRes,
    orcRes,
    divRes,
    patRes,
    objRes,
    cartoesRes,
    lancCartaoRes,
    pagCartaoRes,
  ] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) AS receitas,
         COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS despesas
       FROM transacoes
       WHERE user_id = $1 AND data >= $2::date AND data < $3::date`,
      [userId, start, endExclusive],
    ),
    pool.query(
      `SELECT t.categoria_id,
              COALESCE(c.nome, 'Sem categoria') AS categoria_nome,
              COALESCE(c.cor, '#64748b') AS categoria_cor,
              COALESCE(SUM(t.valor), 0) AS total
       FROM transacoes t
       LEFT JOIN categorias c ON t.categoria_id = c.id AND c.user_id = t.user_id
       WHERE t.user_id = $1 AND t.tipo = 'despesa' AND t.data >= $2::date AND t.data < $3::date
       GROUP BY t.categoria_id, c.nome, c.cor`,
      [userId, start, endExclusive],
    ),
    pool.query(
      `SELECT t.categoria_id,
              COALESCE(c.nome, 'Sem categoria') AS categoria_nome,
              COALESCE(c.cor, '#64748b') AS categoria_cor,
              COALESCE(SUM(t.valor), 0) AS total,
              GREATEST(1, COUNT(DISTINCT to_char(t.data, 'YYYY-MM'))) AS meses_distintos
       FROM transacoes t
       LEFT JOIN categorias c ON t.categoria_id = c.id AND c.user_id = t.user_id
       WHERE t.user_id = $1 AND t.tipo = 'despesa' AND t.data >= $2::date AND t.data < $3::date
       GROUP BY t.categoria_id, c.nome, c.cor`,
      [userId, histStart, start],
    ),
    pool.query(
      `SELECT id, descricao, valor, tipo, data::text AS data, categoria_id
       FROM transacoes
       WHERE user_id = $1 AND tipo = 'despesa' AND data >= $2::date AND data < $3::date
       ORDER BY data DESC`,
      [userId, histStart, endExclusive],
    ),
    pool.query("SELECT * FROM gastos_fixos WHERE usuario_id = $1 AND ativo = TRUE", [userId]),
    pool.query(
      `SELECT gasto_fixo_id, valor_pago, data_pagamento, transacao_id
       FROM gastos_fixos_pagamentos
       WHERE usuario_id = $1 AND competencia_ano = $2 AND competencia_mes = $3`,
      [userId, ano, mes],
    ),
    pool.query(
      `SELECT o.id, o.categoria_id, o.valor_limite, o.alerta_percentual, o.ativo,
              c.nome AS categoria_nome, c.cor AS categoria_cor
       FROM orcamentos o
       JOIN categorias c ON o.categoria_id = c.id AND c.user_id = o.user_id
       WHERE o.user_id = $1`,
      [userId],
    ),
    pool.query("SELECT * FROM dividas WHERE user_id = $1", [userId]),
    pool.query("SELECT * FROM patrimonio_itens WHERE user_id = $1", [userId]),
    pool.query(
      `SELECT o.*, p.nome AS patrimonio_nome,
              p.rendimento_tipo AS patrimonio_rendimento_tipo,
              p.rendimento_valor AS patrimonio_rendimento_valor,
              p.cdi_referencia AS patrimonio_cdi_referencia
       FROM objetivos o
       LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
       WHERE o.user_id = $1`,
      [userId],
    ),
    pool.query("SELECT * FROM cartoes WHERE user_id = $1", [userId]),
    pool.query(
      `SELECT id, descricao, valor, data::text AS data, categoria_id, cartao_id
       FROM transacoes WHERE user_id = $1 AND cartao_id IS NOT NULL AND tipo = 'despesa'`,
      [userId],
    ),
    pool.query(
      `SELECT id, cartao_id, competencia_ano, competencia_mes, valor_pago,
              to_char(data_pagamento, 'YYYY-MM-DD') AS data_pagamento
       FROM cartoes_faturas_pagas WHERE user_id = $1`,
      [userId],
    ),
  ]);

  // Orçamentos enriquecidos com o gasto real do mês já agregado
  const gastoPorCatId = new Map(
    atualCatRes.rows.map((r) => [Number(r.categoria_id || 0), Number(r.total || 0)]),
  );
  const orcamentosItens = orcRes.rows.map((o) =>
    enrichOrcamento(
      { ...o, gasto_realizado: gastoPorCatId.get(Number(o.categoria_id)) || 0 },
      ano,
      mes,
    ),
  );

  // Contas fixas enriquecidas
  const pgtoMap = new Map(fixasPgtoRes.rows.map((p) => [p.gasto_fixo_id, p]));
  const contasEnriquecidas = fixasRes.rows.map((gf) => {
    const pg = pgtoMap.get(gf.id);
    return enrichContaCompetencia(
      {
        ...gf,
        pagamento_id: pg?.id || null,
        valor_pago: pg?.valor_pago || null,
        data_pagamento: pg?.data_pagamento || null,
        transacao_id: pg?.transacao_id || null,
      },
      ano,
      mes,
      refDate,
    );
  });
  const contasResumo = calcularResumoContas(contasEnriquecidas);

  // Dívidas, patrimônio e objetivos
  const dividasItens = divRes.rows.map(enrichDivida);
  const dividasResumo = calcularResumoDividas(dividasItens);
  const patrimonioItens = patRes.rows.map(enrichPatrimonioItem);
  const patrimonioResumo = calcularResumoPatrimonio(
    patrimonioItens,
    dividasResumo.total_saldo_devedor,
  );
  const objetivosItens = objRes.rows.map((r) => enrichObjetivo(r, refDate));
  const objetivosResumo = calcularResumoObjetivos(objetivosItens);

  // Cartões e faturas
  let faturasMesCents = 0;
  let limTotalGlobalCents = 0;
  let limUsadoGlobalCents = 0;
  const cartoesItens = cartoesRes.rows.map((c) => {
    const lancs = lancCartaoRes.rows.filter((l) => l.cartao_id === c.id);
    const pags = pagCartaoRes.rows.filter((p) => p.cartao_id === c.id);
    const lim = calcularLimite(c, lancs, pags, { ano, mes });
    const pagMes = pags.find(
      (p) => Number(p.competencia_ano) === ano && Number(p.competencia_mes) === mes,
    );
    const fat = calcularFatura(c, lancs, ano, mes, pagMes || null, refDate);
    if (c.ativo) {
      limTotalGlobalCents += toCents(c.limite_total);
      limUsadoGlobalCents += toCents(lim.limite_usado);
      if (fat.status !== "paga") faturasMesCents += toCents(fat.total);
    }
    return { ...c, fatura_atual: fat, limite: lim };
  });

  const cartoesResumo = {
    limite_total_global: limTotalGlobalCents / 100,
    limite_usado_global: limUsadoGlobalCents / 100,
  };

  const fixasDespesas = fixasRes.rows
    .filter((f) => f.tipo !== "receita")
    .reduce((s, f) => s + Number(f.valor || 0), 0);

  const indicadores = calcularIndicadoresFinanceiros({
    receitas: txMesRes.rows[0]?.receitas || 0,
    despesas: txMesRes.rows[0]?.despesas || 0,
    contasFixasDespesas: fixasDespesas,
    dividasMensais: dividasResumo.comprometimento_mensal || 0,
    faturasMesAtual: faturasMesCents / 100,
    patrimonioResumo,
    objetivosResumo,
  });

  // Gasto médio mensal real nos últimos 3 meses (+ mês atual se histórico vazio)
  const mesesHist = new Set();
  let somaHistCents = 0;
  for (const t of txRecentesRes.rows) {
    const ym = String(t.data || "").slice(0, 7);
    if (ym && ym < `${ano}-${String(mes).padStart(2, "0")}`) {
      mesesHist.add(ym);
      somaHistCents += toCents(t.valor);
    }
  }
  const gastoMedioMensalCents =
    mesesHist.size > 0
      ? Math.round(somaHistCents / mesesHist.size)
      : toCents(txMesRes.rows[0]?.despesas || 0);

  const anomaliasCategorias = analisarAnomaliasCategorias({
    atualPorCategoria: atualCatRes.rows,
    historicoPorCategoria: histCatRes.rows,
  });

  const despesasRecorrentesDetectadas = detectarRecorrenciasNaoCadastradas(
    txRecentesRes.rows,
    fixasRes.rows,
  );

  return {
    refDate,
    competencia: { ano, mes },
    indicadores,
    anomaliasCategorias,
    orcamentosItens,
    cartoesItens,
    cartoesResumo,
    dividasItens,
    dividasResumo,
    patrimonioItens,
    patrimonioResumo,
    objetivosItens,
    objetivosResumo,
    contasResumo,
    gastosFixos: fixasRes.rows,
    despesasRecorrentesDetectadas,
    gastoMedioMensalCents,
  };
}

async function computeUserDiagnostics(userId, refDate = todayISO()) {
  const snap = await collectFinancialSnapshot(userId, refDate);
  const diag = calcularDiagnosticosFinanceiros(snap);

  return {
    refDate: snap.refDate,
    competencia: snap.competencia,
    indicadores: snap.indicadores,
    saude_financeira: diag.saude_financeira,
    diagnosticos: diag.diagnosticos,
    anomalias_categorias: snap.anomaliasCategorias,
    recorrencias_nao_cadastradas: snap.despesasRecorrentesDetectadas,
  };
}

async function computeUserOptimization(
  userId,
  { refDate = todayISO(), aporteMensal = null, estrategiaDivida = "avalanche" } = {},
) {
  const snap = await collectFinancialSnapshot(userId, refDate);
  const plano = gerarPlanoOtimizacao({
    ...snap,
    aporteMensalManual: aporteMensal,
    estrategiaDivida,
  });

  return {
    refDate: snap.refDate,
    competencia: snap.competencia,
    indicadores: snap.indicadores,
    ...plano,
  };
}

module.exports = {
  collectFinancialSnapshot,
  computeUserDiagnostics,
  computeUserOptimization,
};
