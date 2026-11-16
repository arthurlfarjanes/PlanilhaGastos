/**
 * Motor determinístico de indicadores financeiros do Dashboard.
 * Todos os cálculos monetários utilizam centavos inteiros.
 */
const { toCents, fromCents } = require("./contasFixas");

function roundOneDecimalPct(numCents, denCents) {
  if (denCents <= 0) return null;
  return Math.round((numCents * 1000) / denCents) / 10;
}

/**
 * Calcula taxa de economia, comprometimento de renda e consolida resumo patrimonial/objetivos.
 */
function calcularIndicadoresFinanceiros({
  receitas = 0,
  despesas = 0,
  contasFixasDespesas = 0,
  dividasMensais = 0,
  faturasMesAtual = 0,
  patrimonioResumo = null,
  objetivosResumo = null,
} = {}) {
  const receitasCents = Math.max(0, toCents(receitas));
  const despesasCents = Math.max(0, toCents(despesas));
  const economiaCents = receitasCents - despesasCents;

  const taxaEconomiaPct =
    receitasCents > 0 ? roundOneDecimalPct(economiaCents, receitasCents) : null;

  let taxaEconomiaStatus = "sem_receita";
  if (taxaEconomiaPct !== null) {
    if (taxaEconomiaPct >= 20) taxaEconomiaStatus = "saudavel";
    else if (taxaEconomiaPct >= 0) taxaEconomiaStatus = "moderado";
    else taxaEconomiaStatus = "critico";
  }

  const fixasCents = Math.max(0, toCents(contasFixasDespesas));
  const dividasCents = Math.max(0, toCents(dividasMensais));
  const faturasCents = Math.max(0, toCents(faturasMesAtual));
  const comprometimentoFixoDividasCents = fixasCents + dividasCents;

  const comprometimentoPct =
    receitasCents > 0
      ? roundOneDecimalPct(comprometimentoFixoDividasCents, receitasCents)
      : null;

  const gastoSobreRendaPct =
    receitasCents > 0 ? roundOneDecimalPct(despesasCents, receitasCents) : null;

  let comprometimentoStatus = "sem_receita";
  if (comprometimentoPct !== null) {
    if (comprometimentoPct <= 50) comprometimentoStatus = "saudavel";
    else if (comprometimentoPct <= 75) comprometimentoStatus = "atencao";
    else comprometimentoStatus = "critico";
  }

  return {
    receitas_periodo: fromCents(receitasCents),
    despesas_periodo: fromCents(despesasCents),
    economia_periodo: fromCents(economiaCents),
    taxa_economia_percentual: taxaEconomiaPct,
    taxa_economia_status: taxaEconomiaStatus,
    gasto_sobre_renda_percentual: gastoSobreRendaPct,
    contas_fixas_mensais: fromCents(fixasCents),
    dividas_parcelas_mensais: fromCents(dividasCents),
    faturas_mes_atual: fromCents(faturasCents),
    comprometimento_fixo_dividas: fromCents(comprometimentoFixoDividasCents),
    comprometimento_renda_percentual: comprometimentoPct,
    comprometimento_status: comprometimentoStatus,
    patrimonio_liquido: patrimonioResumo ? patrimonioResumo.patrimonio_liquido : 0,
    total_ativos: patrimonioResumo ? patrimonioResumo.total_ativos : 0,
    total_passivos: patrimonioResumo ? patrimonioResumo.total_passivos : 0,
    rendimento_mensal_estimado: patrimonioResumo
      ? patrimonioResumo.rendimento_mensal_estimado_total || 0
      : 0,
    objetivos_percentual_geral: objetivosResumo ? objetivosResumo.percentual_geral : 0,
    objetivos_ativos: objetivosResumo?.contagem?.ativos || 0,
    objetivos_total_acumulado: objetivosResumo ? objetivosResumo.total_acumulado : 0,
    objetivos_total_alvo: objetivosResumo ? objetivosResumo.total_alvo : 0,
  };
}

module.exports = {
  calcularIndicadoresFinanceiros,
};
