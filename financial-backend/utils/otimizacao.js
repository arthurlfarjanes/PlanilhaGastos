/**
 * Motor determinístico de Otimização Financeira.
 * Calcula, em centavos inteiros, onde cada real disponível (sobra mensal ou
 * aporte simulado) gera maior ganho líquido entre quitação de dívidas (Avalanche
 * vs. Bola de Neve), formação de reserva imediata, redução de desperdícios e
 * aceleração de objetivos ativos.
 */
const { toCents, fromCents } = require("./contasFixas");
const { simularAmortizacao } = require("./dividas");

function taxaAnualParaMensalPct(taxaAnualPct) {
  const a = Number(taxaAnualPct || 0) / 100;
  if (!Number.isFinite(a) || a <= 0) return 0;
  return (Math.pow(1 + a, 1 / 12) - 1) * 100;
}

/**
 * Estima rendimento mensal médio ponderado do patrimônio líquido produtivo (% a.m.).
 */
function calcularTaxaMediaPatrimonioMensalPct(patrimonioItens = []) {
  let baseCents = 0;
  let somaPonderada = 0;
  for (const item of patrimonioItens) {
    if (item.ativo === false) continue;
    const valCents = toCents(item.valor_atual);
    if (valCents <= 0) continue;
    const taxaMensalPct = Number(item.taxa_mensal_estimada_percentual || 0);
    baseCents += valCents;
    somaPonderada += valCents * taxaMensalPct;
  }
  if (baseCents <= 0) return 0;
  return Math.round((somaPonderada / baseCents) * 1000) / 1000;
}

/**
 * Identifica oportunidades concretas e quantificadas de redução de gastos
 * (orçamentos excedidos/alerta, desvios de categoria, assinaturas e recorrências).
 */
function extrairOportunidadesCorte({
  orcamentosItens = [],
  anomaliasCategorias = [],
  gastosFixos = [],
  recorrenciasNaoCadastradas = [],
} = {}) {
  const oportunidades = [];
  let totalEconomiaMensalCents = 0;

  for (const orc of orcamentosItens) {
    if (!orc.ativo) continue;
    const gastoCents = toCents(orc.gasto_realizado);
    const limiteCents = toCents(orc.valor_limite);
    if (gastoCents > limiteCents) {
      const excessoCents = gastoCents - limiteCents;
      totalEconomiaMensalCents += excessoCents;
      oportunidades.push({
        id: `orc-excesso-${orc.id}`,
        tipo: "orcamento_excedido",
        titulo: `Conter excesso em ${orc.categoria_nome}`,
        descricao: `Categoria ultrapassou o orçamento mensal de R$ ${fromCents(limiteCents).toFixed(2)}. Voltar ao teto libera margem imediata.`,
        economia_mensal: fromCents(excessoCents),
        economia_anual: fromCents(excessoCents * 12),
        rota_acao: "/orcamentos",
      });
    }
  }

  for (const anom of anomaliasCategorias) {
    if (anom.status !== "acima_da_media") continue;
    // Evita duplicar se já entrou como orçamento excedido para a mesma categoria
    if (
      orcamentosItens.some(
        (o) => o.ativo && o.categoria_id === anom.categoria_id && o.status === "excedido",
      )
    ) {
      continue;
    }
    const diffCents = Math.max(0, toCents(anom.diferenca));
    if (diffCents < 5000) continue;
    const recorteConservadorCents = Math.round(diffCents * 0.5);
    totalEconomiaMensalCents += recorteConservadorCents;
    oportunidades.push({
      id: `anom-cat-${anom.categoria_id || anom.categoria_nome}`,
      tipo: "desvio_categoria",
      titulo: `Reduzir pico em ${anom.categoria_nome} (+${anom.variacao_percentual}%)`,
      descricao: `Reverter metade do excesso atual em relação à média dos últimos 3 meses.`,
      economia_mensal: fromCents(recorteConservadorCents),
      economia_anual: fromCents(recorteConservadorCents * 12),
      rota_acao: "/diagnosticos",
    });
  }

  const assinaturasAtivas = gastosFixos
    .filter((gf) => gf.ativo !== false && gf.is_assinatura === true && gf.tipo !== "receita")
    .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0));

  for (const ass of assinaturasAtivas.slice(0, 4)) {
    const valCents = toCents(ass.valor);
    if (valCents <= 0) continue;
    oportunidades.push({
      id: `assinatura-${ass.id}`,
      tipo: "assinatura",
      titulo: `Revisar assinatura: ${ass.descricao}`,
      descricao: `Se pouco utilizada, o cancelamento economiza ${fromCents(valCents * 12).toFixed(2)} ao longo de 12 meses.`,
      economia_mensal: fromCents(valCents),
      economia_anual: fromCents(valCents * 12),
      rota_acao: "/gastos-fixos",
    });
  }

  for (const rec of recorrenciasNaoCadastradas.slice(0, 2)) {
    const valCents = toCents(rec.valor_medio);
    if (valCents <= 0) continue;
    oportunidades.push({
      id: `rec-oculta-${rec.descricao}`,
      tipo: "recorrencia_oculta",
      titulo: `Avaliar recorrência recorrente: ${rec.descricao}`,
      descricao: `Gasto repetido em ${rec.meses_encontrados} meses recentes fora do cadastro de fixas.`,
      economia_mensal: fromCents(valCents),
      economia_anual: fromCents(valCents * 12),
      rota_acao: "/gastos-fixos",
    });
  }

  return {
    oportunidades,
    economia_desbloqueavel_mensal: fromCents(totalEconomiaMensalCents),
    economia_desbloqueavel_anual: fromCents(totalEconomiaMensalCents * 12),
  };
}

function compararEstrategiasDivida(dividasAtivas = [], aporteExtraCents = 0) {
  if (dividasAtivas.length === 0) {
    return {
      possui_dividas: false,
      avalanche_alvo: null,
      bola_de_neve_alvo: null,
    };
  }

  const comSaldo = dividasAtivas.filter((d) => toCents(d.saldo_devedor) > 0);
  if (comSaldo.length === 0) {
    return {
      possui_dividas: false,
      avalanche_alvo: null,
      bola_de_neve_alvo: null,
    };
  }

  const avalancheAlvo = [...comSaldo].sort(
    (a, b) => Number(b.taxa_juros_mensal || 0) - Number(a.taxa_juros_mensal || 0) ||
      toCents(a.saldo_devedor) - toCents(b.saldo_devedor),
  )[0];
  const bolaAlvo = [...comSaldo].sort(
    (a, b) => toCents(a.saldo_devedor) - toCents(b.saldo_devedor) ||
      Number(b.taxa_juros_mensal || 0) - Number(a.taxa_juros_mensal || 0),
  )[0];

  const simularPara = (alvo) => {
    const parcelaBaseCents =
      alvo.valor_parcela && toCents(alvo.valor_parcela) > 0
        ? toCents(alvo.valor_parcela)
        : Math.max(10000, Math.round(toCents(alvo.saldo_devedor) * 0.1));

    const sim = simularAmortizacao({
      saldo_devedor: alvo.saldo_devedor,
      taxa_juros_mensal: alvo.taxa_juros_mensal,
      valor_parcela: fromCents(parcelaBaseCents),
      aporte_extra: fromCents(Math.max(0, aporteExtraCents)),
    });

    return {
      id: alvo.id,
      nome: alvo.nome,
      saldo_devedor: Number(alvo.saldo_devedor),
      taxa_juros_mensal: Number(alvo.taxa_juros_mensal || 0),
      parcela_base: fromCents(parcelaBaseCents),
      simulacao: sim.error ? null : sim,
    };
  };

  return {
    possui_dividas: true,
    avalanche_alvo: simularPara(avalancheAlvo),
    bola_de_neve_alvo: simularPara(bolaAlvo),
  };
}

/**
 * Gera plano determinístico completo de otimização financeira e alocação de excedentes.
 */
function gerarPlanoOtimizacao({
  indicadores = {},
  orcamentosItens = [],
  anomaliasCategorias = [],
  gastosFixos = [],
  recorrenciasNaoCadastradas = [],
  cartoesItens = [],
  contasResumo = {},
  dividasItens = [],
  patrimonioItens = [],
  patrimonioResumo = {},
  objetivosItens = [],
  gastoMedioMensalCents = 0,
  aporteMensalManual = null,
  estrategiaDivida = "avalanche",
} = {}) {
  const estrategia = estrategiaDivida === "bola_de_neve" ? "bola_de_neve" : "avalanche";
  const excedenteAtualCents = Math.max(0, toCents(indicadores.economia_periodo || 0));

  const {
    oportunidades,
    economia_desbloqueavel_mensal,
    economia_desbloqueavel_anual,
  } = extrairOportunidadesCorte({
    orcamentosItens,
    anomaliasCategorias,
    gastosFixos,
    recorrenciasNaoCadastradas,
  });

  const desbloqueavelCents = toCents(economia_desbloqueavel_mensal);
  const aporteBaseSugeridoCents =
    excedenteAtualCents > 0 ? excedenteAtualCents : Math.min(desbloqueavelCents, 50000);

  const aporteMensalCents =
    aporteMensalManual !== null && aporteMensalManual !== undefined && aporteMensalManual !== ""
      ? Math.max(0, toCents(aporteMensalManual))
      : aporteBaseSugeridoCents;

  const taxaMediaPatMensalPct = calcularTaxaMediaPatrimonioMensalPct(patrimonioItens);
  const taxaRefReservaPct = taxaMediaPatMensalPct > 0 ? taxaMediaPatMensalPct : taxaAnualParaMensalPct(10.5);

  const dividasAtivas = dividasItens.filter(
    (d) => d.status === "ativa" && toCents(d.saldo_devedor) > 0,
  );
  const comparativoDividas = compararEstrategiasDivida(dividasAtivas, aporteMensalCents);
  const dividaEscolhida =
    estrategia === "bola_de_neve"
      ? comparativoDividas.bola_de_neve_alvo
      : comparativoDividas.avalanche_alvo;

  const faturasVencidas = cartoesItens.filter((c) => c.ativo && c.fatura_atual?.status === "vencida");
  const contasAtrasadas = Number(contasResumo?.contagem_status?.atrasado || 0);

  const liquidezCents = toCents(patrimonioResumo.liquidez_imediata || 0);
  const gastoBaseCents =
    gastoMedioMensalCents > 0 ? gastoMedioMensalCents : toCents(indicadores.despesas_periodo || 0);
  const alvo3MesesCents = gastoBaseCents * 3;
  const alvo6MesesCents = gastoBaseCents * 6;
  const falta3MesesCents = Math.max(0, alvo3MesesCents - liquidezCents);
  const falta6MesesCents = Math.max(0, alvo6MesesCents - liquidezCents);

  const mesesPara3m =
    falta3MesesCents === 0
      ? 0
      : aporteMensalCents > 0
        ? Math.ceil(falta3MesesCents / aporteMensalCents)
        : null;
  const mesesPara6m =
    falta6MesesCents === 0
      ? 0
      : aporteMensalCents > 0
        ? Math.ceil(falta6MesesCents / aporteMensalCents)
        : null;

  const objetivosAtivos = objetivosItens
    .filter((o) => o.status === "ativo" && toCents(o.faltante) > 0)
    .sort((a, b) => {
      const prioRank = { alta: 1, media: 2, baixa: 3 };
      const pDiff = (prioRank[a.prioridade] || 2) - (prioRank[b.prioridade] || 2);
      if (pDiff !== 0) return pDiff;
      return String(a.prazo || "9999-12-31").localeCompare(String(b.prazo || "9999-12-31"));
    });

  // Monta Plano Priorizado (Passos 1..4)
  const passos = [];
  let saldoRestanteSimuladoCents = aporteMensalCents;

  // Passo 1: Pendências vencidas / juros punitivos
  if (faturasVencidas.length > 0 || contasAtrasadas > 0) {
    const totalVencidoCartaoCents = faturasVencidas.reduce(
      (s, c) => s + toCents(c.fatura_atual?.total || 0),
      0,
    );
    passos.push({
      ordem: passos.length + 1,
      nivel: "urgente",
      titulo: "Eliminar faturas e contas em atraso",
      motivo: "Evita juros rotativos de cartão (tipicamente >10% a.m.) e multas contratuais antes de qualquer outra alocação.",
      valor_sugerido_mensal: fromCents(Math.min(saldoRestanteSimuladoCents, Math.max(totalVencidoCartaoCents, saldoRestanteSimuladoCents))),
      ganho_estimado: `${faturasVencidas.length} fatura(s) e ${contasAtrasadas} conta(s) pendente(s)`,
      rota_acao: faturasVencidas.length > 0 ? "/cartoes" : "/gastos-fixos",
    });
  }

  // Passo 2: Quitação acelerada de dívida mais cara que rendimento líquido de reserva
  const temDividaCara =
    dividaEscolhida && Number(dividaEscolhida.taxa_juros_mensal || 0) >= Math.max(0.8, taxaRefReservaPct);

  if (temDividaCara && dividaEscolhida) {
    const sim = dividaEscolhida.simulacao;
    const jurosEcon = sim?.economia?.juros_economizados || 0;
    const mesesEcon = sim?.economia?.meses_economizados || 0;
    const alocacaoCents =
      falta3MesesCents > 0 && Number(dividaEscolhida.taxa_juros_mensal) < 3
        ? Math.round(aporteMensalCents * 0.6)
        : aporteMensalCents;

    passos.push({
      ordem: passos.length + 1,
      nivel: "alta_rentabilidade",
      titulo: `Amortizar dívida "${dividaEscolhida.nome}" (${estrategia === "bola_de_neve" ? "Bola de Neve" : "Avalanche"})`,
      motivo: `Cada real amortizado rende ${dividaEscolhida.taxa_juros_mensal}% a.m. garantidos (supera os ~${taxaRefReservaPct.toFixed(2)}% a.m. estimados do patrimônio).`,
      valor_sugerido_mensal: fromCents(alocacaoCents),
      ganho_estimado:
        aporteMensalCents > 0 && sim
          ? `Economiza ${fromCents(toCents(jurosEcon)).toFixed(2)} em juros e reduz ${mesesEcon} mês(es)`
          : `Saldo devedor atual: R$ ${Number(dividaEscolhida.saldo_devedor).toFixed(2)}`,
      rota_acao: "/dividas",
    });
  }

  // Passo 3: Reserva de Emergência (3 a 6 meses)
  if (falta6MesesCents > 0) {
    const metaAlvoTexto = falta3MesesCents > 0 ? "3 meses de cobertura" : "6 meses de cobertura";
    const faltaRef = falta3MesesCents > 0 ? falta3MesesCents : falta6MesesCents;
    const mesesRef = falta3MesesCents > 0 ? mesesPara3m : mesesPara6m;
    const pctAloc = temDividaCara ? (falta3MesesCents > 0 ? 0.4 : 0.25) : 0.7;
    const sugCents =
      aporteMensalCents > 0 ? Math.max(0, Math.round(aporteMensalCents * pctAloc)) : 0;

    passos.push({
      ordem: passos.length + 1,
      nivel: falta3MesesCents > 0 ? "seguranca" : "consolidacao",
      titulo: `Reforçar Reserva de Emergência (${metaAlvoTexto})`,
      motivo: `Faltam R$ ${fromCents(faltaRef).toFixed(2)} em liquidez imediata para atingir ${metaAlvoTexto} com base no seu gasto médio mensal.`,
      valor_sugerido_mensal: fromCents(sugCents),
      ganho_estimado:
        mesesRef !== null
          ? `Com R$ ${fromCents(aporteMensalCents).toFixed(2)}/mês totais, atinge em ${mesesRef} mês(es)`
          : "Simule um aporte mensal acima para ver o prazo",
      rota_acao: "/patrimonio",
    });
  }

  // Passo 4: Objetivos prioritários + dívidas restantes de juro moderado
  if (objetivosAtivos.length > 0) {
    const objTop = objetivosAtivos[0];
    const faltanteCents = toCents(objTop.faltante);
    const aporteObjCents =
      aporteMensalCents > 0
        ? Math.max(0, Math.round(aporteMensalCents * (temDividaCara || falta3MesesCents > 0 ? 0.3 : 0.8)))
        : 0;
    const mesesAtual = objTop.meses_estimados;
    const aporteTotalObj = toCents(objTop.aporte_mensal_planejado || 0) + aporteObjCents;
    const mesesComOtimizacao =
      aporteTotalObj > 0 ? Math.ceil(faltanteCents / aporteTotalObj) : null;
    const ganhoMeses =
      mesesAtual && mesesComOtimizacao && mesesAtual > mesesComOtimizacao
        ? mesesAtual - mesesComOtimizacao
        : null;

    passos.push({
      ordem: passos.length + 1,
      nivel: "crescimento",
      titulo: `Acelerar objetivo "${objTop.nome}"`,
      motivo: `Objetivo ativo prioritário (faltam R$ ${fromCents(faltanteCents).toFixed(2)} para concluir).`,
      valor_sugerido_mensal: fromCents(aporteObjCents),
      ganho_estimado:
        ganhoMeses !== null
          ? `Antecipa conclusão em ~${ganhoMeses} mês(es)`
          : mesesComOtimizacao !== null
            ? `Conclusão estimada em ${mesesComOtimizacao} mês(es)`
            : "Defina um aporte mensal para estimar conclusão",
      rota_acao: "/objetivos",
    });
  } else if (!temDividaCara && dividaEscolhida) {
    const sim = dividaEscolhida.simulacao;
    passos.push({
      ordem: passos.length + 1,
      nivel: "consolidacao",
      titulo: `Antecipar quitação de "${dividaEscolhida.nome}"`,
      motivo: `Taxa de ${dividaEscolhida.taxa_juros_mensal}% a.m. abaixo do corte crítico, mas antecipar reduz comprometimento fixo mensal.`,
      valor_sugerido_mensal: fromCents(aporteMensalCents),
      ganho_estimado: sim
        ? `Economia de R$ ${Number(sim.economia?.juros_economizados || 0).toFixed(2)} em juros`
        : "Libera parcela fixa mais cedo",
      rota_acao: "/dividas",
    });
  }

  return {
    parametros: {
      aporte_mensal_simulado: fromCents(aporteMensalCents),
      excedente_atual_mes: fromCents(excedenteAtualCents),
      estrategia_divida: estrategia,
      taxa_media_patrimonio_mensal_pct: taxaMediaPatMensalPct,
    },
    resumo: {
      economia_desbloqueavel_mensal,
      economia_desbloqueavel_anual,
      juros_economizaveis_divida_foco:
        dividaEscolhida?.simulacao?.economia?.juros_economizados ?? 0,
      meses_economizados_divida_foco:
        dividaEscolhida?.simulacao?.economia?.meses_economizados ?? 0,
      falta_reserva_3_meses: fromCents(falta3MesesCents),
      meses_para_reserva_3_meses: mesesPara3m,
      falta_reserva_6_meses: fromCents(falta6MesesCents),
      meses_para_reserva_6_meses: mesesPara6m,
    },
    plano_alocacao: passos,
    comparativo_dividas: comparativoDividas,
    oportunidades_corte: oportunidades,
  };
}

module.exports = {
  extrairOportunidadesCorte,
  compararEstrategiasDivida,
  gerarPlanoOtimizacao,
};
