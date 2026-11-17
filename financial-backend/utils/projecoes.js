/**
 * Motor determinístico de Projeções Financeiras e Simulador de Cenários ("E se...").
 * Opera em centavos inteiros, com premissas explícitas e separação entre
 * cenário base (inércia) e cenário simulado (ajustado pelo usuário).
 */
const { toCents, fromCents } = require("./contasFixas");
const { parseParcelaInfo } = require("./parcelas");

const HORIZONTES_VALIDOS = Object.freeze([6, 12, 24, 36, 60]);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function taxaAnualParaMensalDecimal(taxaAnualPct) {
  const a = Number(taxaAnualPct || 0) / 100;
  if (!Number.isFinite(a) || a <= -1) return 0;
  if (a === 0) return 0;
  return Math.pow(1 + a, 1 / 12) - 1;
}

function addMonthsYM(ano, mes, offset) {
  const d = new Date(Date.UTC(ano, mes - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calcula premissas reais iniciais a partir do histórico recente e cadastros ativos.
 */
function derivarPremissasIniciais({
  refDate,
  transacoesRecentes = [],
  gastosFixos = [],
  patrimonioItens = [],
} = {}) {
  const ymAtual = String(refDate || new Date().toISOString().slice(0, 10)).slice(0, 7);

  // Soma média mensal de receitas/despesas realizadas (excluindo parcelas futuras > refDate)
  const recPorMes = new Map();
  const despPorMes = new Map();

  for (const t of transacoesRecentes) {
    const dataStr = String(t.data || "").slice(0, 10);
    if (!dataStr || dataStr > refDate) continue;
    const ym = dataStr.slice(0, 7);
    const valCents = toCents(t.valor);
    if (t.tipo === "receita") {
      recPorMes.set(ym, (recPorMes.get(ym) || 0) + valCents);
    } else if (t.tipo === "despesa") {
      despPorMes.set(ym, (despPorMes.get(ym) || 0) + valCents);
    }
  }

  // Prefere meses fechados anteriores ao atual; se não houver, usa o mês atual
  const mesesFechadosRec = [...recPorMes.keys()].filter((ym) => ym < ymAtual);
  const mesesFechadosDesp = [...despPorMes.keys()].filter((ym) => ym < ymAtual);

  const mediaRecCents =
    mesesFechadosRec.length > 0
      ? Math.round(
          mesesFechadosRec.reduce((s, ym) => s + recPorMes.get(ym), 0) /
            mesesFechadosRec.length,
        )
      : recPorMes.get(ymAtual) || 0;

  const mediaDespCents =
    mesesFechadosDesp.length > 0
      ? Math.round(
          mesesFechadosDesp.reduce((s, ym) => s + despPorMes.get(ym), 0) /
            mesesFechadosDesp.length,
        )
      : despPorMes.get(ymAtual) || 0;

  // Caso não haja histórico de transações mas existam receitas/despesas fixas ativas, usa fixas como piso
  let fixasRecCents = 0;
  let fixasDespCents = 0;
  for (const gf of gastosFixos) {
    if (gf.ativo === false) continue;
    if (gf.tipo === "receita") fixasRecCents += toCents(gf.valor);
    else fixasDespCents += toCents(gf.valor);
  }

  const receitaBaseCents = Math.max(mediaRecCents, fixasRecCents);
  const despesaBaseCents = Math.max(mediaDespCents, fixasDespCents);

  // Taxa média anual ponderada configurada no patrimônio (ou CDI conservador 10.5% se não houver)
  let basePatCents = 0;
  let somaTaxaPonderada = 0;
  for (const p of patrimonioItens) {
    if (p.ativo === false) continue;
    const vCents = toCents(p.valor_atual);
    if (vCents <= 0) continue;
    basePatCents += vCents;
    somaTaxaPonderada += vCents * Number(p.taxa_anual_estimada_percentual || 0);
  }
  const taxaPatAnual =
    basePatCents > 0 && somaTaxaPonderada > 0
      ? Math.round((somaTaxaPonderada / basePatCents) * 100) / 100
      : 10.5;

  return {
    receita_mensal_base: fromCents(receitaBaseCents),
    despesa_mensal_base: fromCents(despesaBaseCents),
    taxa_rendimento_anual_pct: taxaPatAnual,
    origem_base:
      mesesFechadosRec.length > 0 || mesesFechadosDesp.length > 0
        ? `Média mensal dos últimos meses fechados + contas fixas ativas (${Math.max(mesesFechadosRec.length, mesesFechadosDesp.length)} mês(es))`
        : "Baseado no mês atual e contas fixas ativas",
    origem_taxa_rendimento:
      basePatCents > 0 && somaTaxaPonderada > 0
        ? "Média ponderada pelo rendimento configurado nos seus ativos de Patrimônio"
        : "Taxa referencial padrão conservadora (10,5% a.a.) ajustável no simulador",
  };
}

/**
 * Agrupa parcelas vincendas futuras já lançadas no extrato por YYYY-MM
 * para somá-las no mês correto sem precisar estimar novamente.
 */
function agruparParcelasFuturasPorMes(transacoesFuturas = [], refDate) {
  const porMes = new Map();
  for (const t of transacoesFuturas) {
    if (t.tipo !== "despesa") continue;
    const dataStr = String(t.data || "").slice(0, 10);
    if (!dataStr || dataStr <= refDate) continue;
    const info = parseParcelaInfo(t.descricao);
    if (!info) continue;
    const ym = dataStr.slice(0, 7);
    porMes.set(ym, (porMes.get(ym) || 0) + toCents(t.valor));
  }
  return porMes;
}

/**
 * Executa uma trajetória determinística mês a mês para um conjunto de premissas.
 */
function rodarTrajetoria({
  anoBase,
  mesBase,
  horizonteMeses,
  receitaMensalCents,
  despesaMensalCents,
  aporteExtraCents,
  taxaRendimentoAnualPct,
  inflacaoAnualPct,
  ativosInicialCents,
  dividasAtivas = [],
  parcelasFuturasPorMes = new Map(),
  eventoUnico = null,
}) {
  const taxaRendimentoMes = taxaAnualParaMensalDecimal(taxaRendimentoAnualPct);
  const inflacaoMes = taxaAnualParaMensalDecimal(inflacaoAnualPct);

  // Cópia mutável das dívidas ativas para amortização cronológica mês a mês
  const dividasEstado = dividasAtivas
    .filter((d) => d.status === "ativa" && toCents(d.saldo_devedor) > 0)
    .map((d) => ({
      id: d.id,
      nome: d.nome,
      saldoCents: toCents(d.saldo_devedor),
      taxaMes: Number(d.taxa_juros_mensal || 0) / 100,
      parcelaCents:
        d.valor_parcela && toCents(d.valor_parcela) > 0
          ? toCents(d.valor_parcela)
          : Math.max(5000, Math.round(toCents(d.saldo_devedor) * 0.08)),
    }));

  let ativosCents = Math.max(0, ativosInicialCents);
  let primeiroMesDeficit = null;
  let dividasQuitadasNoHorizonte = 0;
  let somaFluxoCents = 0;
  const serie = [];

  for (let k = 1; k <= horizonteMeses; k++) {
    const ym = addMonthsYM(anoBase, mesBase, k);

    // Rendimento dos ativos existentes antes do fluxo do mês
    const rendimentoCents = Math.round(ativosCents * taxaRendimentoMes);
    ativosCents += rendimentoCents;

    // Evolução das parcelas das dívidas ativas ainda em aberto neste mês
    let parcelasDividasMesCents = 0;
    let saldoDividasTotalCents = 0;
    for (const d of dividasEstado) {
      if (d.saldoCents <= 0) continue;
      const jurosCents = Math.round(d.saldoCents * d.taxaMes);
      const devidoCents = d.saldoCents + jurosCents;
      const pgtoCents = Math.min(devidoCents, d.parcelaCents);
      d.saldoCents = devidoCents - pgtoCents;
      parcelasDividasMesCents += pgtoCents;
      saldoDividasTotalCents += d.saldoCents;
      if (d.saldoCents === 0) dividasQuitadasNoHorizonte += 1;
    }

    const parcelasFuturasMesCents = parcelasFuturasPorMes.get(ym) || 0;

    let eventoReceitaCents = 0;
    let eventoDespesaCents = 0;
    if (eventoUnico && Number(eventoUnico.mes) === k && toCents(eventoUnico.valor) > 0) {
      if (eventoUnico.tipo === "receita") eventoReceitaCents = toCents(eventoUnico.valor);
      else eventoDespesaCents = toCents(eventoUnico.valor);
    }

    const receitaMesCents = receitaMensalCents + eventoReceitaCents;
    const despesaMesCents =
      despesaMensalCents +
      parcelasDividasMesCents +
      parcelasFuturasMesCents +
      eventoDespesaCents;

    // Aporte extra aumenta reserva quando positivo (ou sai do caixa líquido)
    const fluxoLiquidoCents = receitaMesCents - despesaMesCents;
    const variacaoAtivosCents = fluxoLiquidoCents + aporteExtraCents;
    ativosCents = Math.max(0, ativosCents + variacaoAtivosCents);

    if (fluxoLiquidoCents < 0 && !primeiroMesDeficit) {
      primeiroMesDeficit = ym;
    }
    somaFluxoCents += fluxoLiquidoCents;

    const plNominalCents = ativosCents - saldoDividasTotalCents;
    const fatorDeflator = Math.pow(1 + inflacaoMes, k);
    const ativosRealCents =
      fatorDeflator > 0 ? Math.round(ativosCents / fatorDeflator) : ativosCents;
    const plRealCents =
      fatorDeflator > 0 ? Math.round(plNominalCents / fatorDeflator) : plNominalCents;

    serie.push({
      mes_indice: k,
      competencia: ym,
      receita_projetada: fromCents(receitaMesCents),
      despesa_projetada: fromCents(despesaMesCents),
      parcelas_dividas_mes: fromCents(parcelasDividasMesCents),
      parcelas_futuras_mes: fromCents(parcelasFuturasMesCents),
      fluxo_liquido_mes: fromCents(fluxoLiquidoCents),
      saldo_ativos_nominal: fromCents(ativosCents),
      saldo_ativos_real: fromCents(ativosRealCents),
      saldo_dividas_restante: fromCents(saldoDividasTotalCents),
      patrimonio_liquido_nominal: fromCents(plNominalCents),
      patrimonio_liquido_real: fromCents(plRealCents),
    });
  }

  const ultimo = serie[serie.length - 1] || {
    saldo_ativos_nominal: fromCents(ativosInicialCents),
    saldo_ativos_real: fromCents(ativosInicialCents),
    saldo_dividas_restante: 0,
    patrimonio_liquido_nominal: fromCents(ativosInicialCents),
    patrimonio_liquido_real: fromCents(ativosInicialCents),
  };

  return {
    serie,
    resumo: {
      patrimonio_liquido_final_nominal: ultimo.patrimonio_liquido_nominal,
      patrimonio_liquido_final_real: ultimo.patrimonio_liquido_real,
      ativos_finais_nominal: ultimo.saldo_ativos_nominal,
      dividas_finais: ultimo.saldo_dividas_restante,
      fluxo_mensal_medio: fromCents(Math.round(somaFluxoCents / Math.max(1, horizonteMeses))),
      primeiro_mes_deficit: primeiroMesDeficit,
      dividas_quitadas_no_horizonte: dividasQuitadasNoHorizonte,
    },
  };
}

/**
 * Simula cenário Base (inércia) vs Cenário Simulado com premissas explícitas.
 */
function gerarProjecaoECenarios({
  refDate,
  premissasIniciais,
  parametrosUsuario = {},
  patrimonioResumo = {},
  dividasItens = [],
  objetivosItens = [],
  transacoesFuturas = [],
} = {}) {
  const [anoBase, mesBase] = String(refDate || new Date().toISOString().slice(0, 10))
    .split("-")
    .map(Number);

  const hRaw = parseInt(parametrosUsuario.horizonte_meses, 10);
  const horizonteMeses = HORIZONTES_VALIDOS.includes(hRaw) ? hRaw : 12;

  const receitaBaseOriginal =
    parametrosUsuario.receita_mensal_base !== undefined &&
    parametrosUsuario.receita_mensal_base !== null &&
    parametrosUsuario.receita_mensal_base !== ""
      ? Math.max(0, toCents(parametrosUsuario.receita_mensal_base))
      : toCents(premissasIniciais.receita_mensal_base);

  const despesaBaseOriginal =
    parametrosUsuario.despesa_mensal_base !== undefined &&
    parametrosUsuario.despesa_mensal_base !== null &&
    parametrosUsuario.despesa_mensal_base !== ""
      ? Math.max(0, toCents(parametrosUsuario.despesa_mensal_base))
      : toCents(premissasIniciais.despesa_mensal_base);

  const varRendaPct = clamp(Number(parametrosUsuario.variacao_renda_pct || 0), -90, 300);
  const varDespesaPct = clamp(Number(parametrosUsuario.variacao_despesa_pct || 0), -90, 300);
  const aporteExtraCents = Math.max(0, toCents(parametrosUsuario.aporte_mensal_extra || 0));

  const taxaRendAnual = clamp(
    parametrosUsuario.taxa_rendimento_anual_pct !== undefined &&
      parametrosUsuario.taxa_rendimento_anual_pct !== null &&
      parametrosUsuario.taxa_rendimento_anual_pct !== ""
      ? Number(parametrosUsuario.taxa_rendimento_anual_pct)
      : Number(premissasIniciais.taxa_rendimento_anual_pct || 10.5),
    0,
    60,
  );
  const inflacaoAnual = clamp(Number(parametrosUsuario.inflacao_anual_pct || 0), 0, 30);

  let eventoUnico = null;
  if (
    parametrosUsuario.evento_unico &&
    toCents(parametrosUsuario.evento_unico.valor) > 0
  ) {
    const mesEvt = clamp(
      parseInt(parametrosUsuario.evento_unico.mes || 1, 10) || 1,
      1,
      horizonteMeses,
    );
    eventoUnico = {
      mes: mesEvt,
      tipo: parametrosUsuario.evento_unico.tipo === "receita" ? "receita" : "despesa",
      valor: fromCents(toCents(parametrosUsuario.evento_unico.valor)),
      descricao: String(parametrosUsuario.evento_unico.descricao || "Evento pontual").trim().slice(0, 80),
    };
  }

  const receitaSimuladaCents = Math.max(
    0,
    Math.round(receitaBaseOriginal * (1 + varRendaPct / 100)),
  );
  const despesaSimuladaCents = Math.max(
    0,
    Math.round(despesaBaseOriginal * (1 + varDespesaPct / 100)),
  );

  const ativosInicialCents = toCents(patrimonioResumo.total_ativos || 0);
  const parcelasFuturasPorMes = agruparParcelasFuturasPorMes(transacoesFuturas, refDate);

  const cenarioBase = rodarTrajetoria({
    anoBase,
    mesBase,
    horizonteMeses,
    receitaMensalCents: receitaBaseOriginal,
    despesaMensalCents: despesaBaseOriginal,
    aporteExtraCents: 0,
    taxaRendimentoAnualPct: Number(premissasIniciais.taxa_rendimento_anual_pct || 10.5),
    inflacaoAnualPct: inflacaoAnual,
    ativosInicialCents,
    dividasAtivas: dividasItens,
    parcelasFuturasPorMes,
    eventoUnico: null,
  });

  const cenarioSimulado = rodarTrajetoria({
    anoBase,
    mesBase,
    horizonteMeses,
    receitaMensalCents: receitaSimuladaCents,
    despesaMensalCents: despesaSimuladaCents,
    aporteExtraCents,
    taxaRendimentoAnualPct: taxaRendAnual,
    inflacaoAnualPct: inflacaoAnual,
    ativosInicialCents,
    dividasAtivas: dividasItens,
    parcelasFuturasPorMes,
    eventoUnico,
  });

  // Combina as duas séries mês a mês para gráficos comparativos
  const comparativoMensal = cenarioBase.serie.map((b, idx) => {
    const s = cenarioSimulado.serie[idx];
    return {
      mes_indice: b.mes_indice,
      competencia: b.competencia,
      pl_base_nominal: b.patrimonio_liquido_nominal,
      pl_simulado_nominal: s.patrimonio_liquido_nominal,
      pl_simulado_real: s.patrimonio_liquido_real,
      fluxo_base: b.fluxo_liquido_mes,
      fluxo_simulado: s.fluxo_liquido_mes,
      receita_simulada: s.receita_projetada,
      despesa_simulada: s.despesa_projetada,
      dividas_simulado: s.saldo_dividas_restante,
    };
  });

  const difPlCents =
    toCents(cenarioSimulado.resumo.patrimonio_liquido_final_nominal) -
    toCents(cenarioBase.resumo.patrimonio_liquido_final_nominal);

  // Marcos de objetivos ativos sob o fluxo adicional simulado
  const ganhoFluxoSimuladoCents =
    toCents(cenarioSimulado.resumo.fluxo_mensal_medio) -
    toCents(cenarioBase.resumo.fluxo_mensal_medio) +
    aporteExtraCents;

  const previsaoObjetivos = objetivosItens
    .filter((o) => o.status === "ativo" && toCents(o.faltante) > 0)
    .slice(0, 6)
    .map((o) => {
      const faltCents = toCents(o.faltante);
      const aportePlanejCents = toCents(o.aporte_mensal_planejado || 0);
      const aporteSimObjCents = Math.max(0, aportePlanejCents + Math.max(0, ganhoFluxoSimuladoCents));
      const mesesBaseObj =
        o.meses_estimados ||
        (aportePlanejCents > 0 ? Math.ceil(faltCents / aportePlanejCents) : null);
      const mesesSimObj =
        aporteSimObjCents > 0 ? Math.ceil(faltCents / aporteSimObjCents) : null;
      return {
        id: o.id,
        nome: o.nome,
        faltante: o.faltante,
        meses_base: mesesBaseObj,
        meses_simulado: mesesSimObj,
        meses_ganhos:
          mesesBaseObj !== null && mesesSimObj !== null
            ? mesesBaseObj - mesesSimObj
            : null,
      };
    });

  return {
    refDate,
    premissas: {
      horizonte_meses: horizonteMeses,
      receita_mensal_base: fromCents(receitaBaseOriginal),
      despesa_mensal_base: fromCents(despesaBaseOriginal),
      receita_simulada_efetiva: fromCents(receitaSimuladaCents),
      despesa_simulada_efetiva: fromCents(despesaSimuladaCents),
      variacao_renda_pct: varRendaPct,
      variacao_despesa_pct: varDespesaPct,
      aporte_mensal_extra: fromCents(aporteExtraCents),
      taxa_rendimento_anual_pct: taxaRendAnual,
      inflacao_anual_pct: inflacaoAnual,
      evento_unico: eventoUnico,
      patrimonio_liquido_inicial: Number(patrimonioResumo.patrimonio_liquido || 0),
      ativos_iniciais: fromCents(ativosInicialCents),
      dividas_iniciais: Number(patrimonioResumo.total_passivos || 0),
      origem_base: premissasIniciais.origem_base,
      origem_taxa_rendimento: premissasIniciais.origem_taxa_rendimento,
    },
    resumo_comparativo: {
      base: cenarioBase.resumo,
      simulado: cenarioSimulado.resumo,
      diferenca_patrimonio_final: fromCents(difPlCents),
    },
    comparativo_mensal: comparativoMensal,
    previsao_objetivos: previsaoObjetivos,
  };
}

module.exports = {
  HORIZONTES_VALIDOS,
  derivarPremissasIniciais,
  agruparParcelasFuturasPorMes,
  gerarProjecaoECenarios,
};
