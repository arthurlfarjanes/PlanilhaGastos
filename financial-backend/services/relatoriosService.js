/**
 * Serviço agregador de Relatórios Financeiros Inteligentes (JSON, CSV e PDF).
 * Reutiliza `collectFinancialSnapshot`, diagnósticos e otimização para manter
 * uma única fonte determinística de cálculos no backend.
 */
const pool = require("../config/db");
const { todayISO } = require("../utils/contasFixas");
const {
  calcularDiagnosticosFinanceiros,
} = require("../utils/diagnosticos");
const { gerarPlanoOtimizacao } = require("../utils/otimizacao");
const {
  defaultReportPeriod,
  summarizePeriodTransactions,
} = require("../utils/relatorios");
const { collectFinancialSnapshot } = require("./diagnosticosService");

async function buildUserFinancialReport(
  userId,
  {
    dataInicio = null,
    dataFim = null,
    refDate = todayISO(),
    incluirTransacoes = true,
  } = {},
) {
  const defaults = defaultReportPeriod(refDate);
  const inicio = dataInicio || defaults.dataInicio;
  const fim = dataFim || defaults.dataFim;

  const [userRes, txRes, snap] = await Promise.all([
    pool.query("SELECT id, username, role FROM usuarios WHERE id = $1", [userId]),
    pool.query(
      `SELECT t.id, t.descricao, t.valor, t.tipo, t.data::text AS data,
              t.categoria_id, t.cartao_id, t.cartao_excluido_nome,
              COALESCE(c.nome, 'Sem categoria') AS categoria_nome,
              COALESCE(c.cor, '#64748b') AS categoria_cor,
              ca.nome AS cartao_nome
       FROM transacoes t
       LEFT JOIN categorias c ON t.categoria_id = c.id AND c.user_id = t.user_id
       LEFT JOIN cartoes ca ON t.cartao_id = ca.id AND ca.user_id = t.user_id
       WHERE t.user_id = $1 AND t.data >= $2::date AND t.data <= $3::date
       ORDER BY t.data DESC, t.id DESC`,
      [userId, inicio, fim],
    ),
    collectFinancialSnapshot(userId, refDate),
  ]);

  const usuario = userRes.rows[0] || { id: userId, username: "Usuário", role: "user" };
  const diag = calcularDiagnosticosFinanceiros(snap);
  const otimizacao = gerarPlanoOtimizacao(snap);
  const transacoes = txRes.rows.map((r) => ({
    ...r,
    valor: Number(r.valor || 0),
  }));
  const periodoAgg = summarizePeriodTransactions(transacoes);

  return {
    gerado_em: refDate,
    usuario: {
      username: usuario.username,
      role: usuario.role,
    },
    periodo: {
      dataInicio: inicio,
      dataFim: fim,
      refDate,
    },
    incluir_transacoes: Boolean(incluirTransacoes),
    resumo_periodo: periodoAgg.resumo_periodo,
    categorias_despesa: periodoAgg.categorias_despesa,
    indicadores: snap.indicadores,
    saude_financeira: diag.saude_financeira,
    diagnosticos: diag.diagnosticos,
    anomalias_categorias: snap.anomaliasCategorias,
    recorrencias_nao_cadastradas: snap.despesasRecorrentesDetectadas,
    otimizacao: {
      economia_total_potencial_mensal: otimizacao.economia_total_potencial_mensal,
      economia_total_potencial_anual: otimizacao.economia_total_potencial_anual,
      estrategia_divida_recomendada: otimizacao.estrategia_divida_recomendada,
      oportunidades_corte: otimizacao.oportunidades_corte,
      plano_priorizado: otimizacao.plano_priorizado,
    },
    orcamentos: snap.orcamentosItens,
    dividas: {
      itens: snap.dividasItens,
      resumo: snap.dividasResumo,
    },
    patrimonio: {
      itens: snap.patrimonioItens,
      resumo: snap.patrimonioResumo,
    },
    objetivos: {
      itens: snap.objetivosItens,
      resumo: snap.objetivosResumo,
    },
    transacoes,
  };
}

module.exports = {
  buildUserFinancialReport,
};
