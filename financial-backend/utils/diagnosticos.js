/**
 * Motor determinístico de Diagnósticos Financeiros e Score de Saúde (0 a 100).
 * Opera exclusivamente sobre centavos inteiros e dados pré-computados pelos motores
 * auditados do backend. Não depende de IA externa para gerar diagnósticos.
 */
const { toCents, fromCents } = require("./contasFixas");
const { normalizarTexto, limparSufixoParcela } = require("./classificacao");

function roundPct(num, den) {
  if (den <= 0) return null;
  return Math.round((num * 1000) / den) / 10;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Detecta possíveis gastos recorrentes/assinaturas nos últimos meses que ainda
 * não estão cadastrados em `gastos_fixos`.
 */
function detectarRecorrenciasNaoCadastradas(transacoesRecentes = [], gastosFixos = []) {
  const fixasNorms = new Set(
    gastosFixos.map((gf) => limparSufixoParcela(normalizarTexto(gf.descricao))).filter(Boolean),
  );

  const grupos = new Map();
  for (const t of transacoesRecentes) {
    if (t.tipo !== "despesa") continue;
    const descBase = limparSufixoParcela(normalizarTexto(t.descricao));
    if (descBase.length < 3) continue;
    if (fixasNorms.has(descBase)) continue;
    // Ignora compras parceladas explícitas (já têm ciclo finito)
    if (/\(\d+\s*\/\s*\d+\)/.test(String(t.descricao || ""))) continue;

    const ym = String(t.data || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;

    if (!grupos.has(descBase)) {
      grupos.set(descBase, {
        descricao: t.descricao,
        meses: new Set(),
        valoresCents: [],
        datas: [],
      });
    }
    const g = grupos.get(descBase);
    g.meses.add(ym);
    g.valoresCents.push(toCents(t.valor));
    g.datas.push(String(t.data).slice(0, 10));
  }

  const detectadas = [];
  for (const g of grupos.values()) {
    if (g.meses.size < 2) continue;
    const avgCents = Math.round(
      g.valoresCents.reduce((s, v) => s + v, 0) / g.valoresCents.length,
    );
    if (avgCents <= 0) continue;
    // Verifica variação máxima <= 20% em torno da média (típico de mensalidade/assinatura)
    const consistente = g.valoresCents.every(
      (v) => Math.abs(v - avgCents) <= Math.max(500, Math.round(avgCents * 0.2)),
    );
    if (!consistente) continue;

    detectadas.push({
      descricao: g.descricao,
      meses_encontrados: g.meses.size,
      ocorrencias: g.valoresCents.length,
      valor_medio: fromCents(avgCents),
      ultima_data: g.datas.sort().pop(),
    });
  }

  return detectadas.sort((a, b) => b.valor_medio - a.valor_medio).slice(0, 8);
}

/**
 * Compara o gasto do mês atual por categoria contra a média dos últimos 3 meses anteriores.
 */
function analisarAnomaliasCategorias({ atualPorCategoria = [], historicoPorCategoria = [] }) {
  const atualMap = new Map();
  for (const item of atualPorCategoria) {
    atualMap.set(Number(item.categoria_id || 0), {
      categoria_id: item.categoria_id ? Number(item.categoria_id) : null,
      categoria_nome: item.categoria_nome || "Sem categoria",
      categoria_cor: item.categoria_cor || "#64748b",
      atual_cents: toCents(item.total),
    });
  }

  const histMap = new Map();
  for (const item of historicoPorCategoria) {
    const key = Number(item.categoria_id || 0);
    const total3mCents = toCents(item.total);
    const mesesComDados = Math.max(1, Number(item.meses_distintos || 3));
    histMap.set(key, {
      categoria_id: item.categoria_id ? Number(item.categoria_id) : null,
      categoria_nome: item.categoria_nome || "Sem categoria",
      categoria_cor: item.categoria_cor || "#64748b",
      media_mensal_cents: Math.round(total3mCents / mesesComDados),
    });
  }

  const allKeys = new Set([...atualMap.keys(), ...histMap.keys()]);
  const comparativos = [];

  for (const key of allKeys) {
    const cur = atualMap.get(key);
    const prev = histMap.get(key);
    const atualCents = cur ? cur.atual_cents : 0;
    const mediaCents = prev ? prev.media_mensal_cents : 0;
    const diffCents = atualCents - mediaCents;
    const variacaoPct = mediaCents > 0 ? roundPct(diffCents, mediaCents) : null;

    // Anomalia relevante: aumento >= 30% e pelo menos R$ 50,00 acima da média
    const ehAnomaliaAlta =
      mediaCents > 0 && variacaoPct !== null && variacaoPct >= 30 && diffCents >= 5000;
    const ehReducaoExpressiva =
      mediaCents > 0 && variacaoPct !== null && variacaoPct <= -25 && Math.abs(diffCents) >= 5000;

    comparativos.push({
      categoria_id: (cur || prev).categoria_id,
      categoria_nome: (cur || prev).categoria_nome,
      categoria_cor: (cur || prev).categoria_cor,
      gasto_atual: fromCents(atualCents),
      media_3_meses: fromCents(mediaCents),
      diferenca: fromCents(diffCents),
      variacao_percentual: variacaoPct,
      status: ehAnomaliaAlta
        ? "acima_da_media"
        : ehReducaoExpressiva
          ? "abaixo_da_media"
          : "normal",
    });
  }

  return comparativos.sort((a, b) => b.gasto_atual - a.gasto_atual);
}

/**
 * Calcula o score de saúde financeira (0 a 100) e lista priorizada de diagnósticos.
 */
function calcularDiagnosticosFinanceiros({
  indicadores = {},
  anomaliasCategorias = [],
  orcamentosItens = [],
  cartoesItens = [],
  cartoesResumo = {},
  dividasItens = [],
  dividasResumo = {},
  patrimonioResumo = {},
  objetivosResumo = {},
  contasResumo = {},
  despesasRecorrentesDetectadas = [],
  gastoMedioMensalCents = 0,
} = {}) {
  const pilares = [];
  const achados = [];

  const receitasCents = toCents(indicadores.receitas_periodo || 0);
  const despesasCents = toCents(indicadores.despesas_periodo || 0);
  const taxaEconomia = indicadores.taxa_economia_percentual;
  const comprometimento = indicadores.comprometimento_renda_percentual;

  // 1) Fluxo de Caixa & Taxa de Economia (25 pts)
  let ptsEconomia = 12;
  if (receitasCents === 0 && despesasCents === 0) {
    ptsEconomia = 15;
  } else if (receitasCents === 0 && despesasCents > 0) {
    ptsEconomia = 4;
  } else if (taxaEconomia !== null) {
    if (taxaEconomia >= 20) ptsEconomia = 25;
    else if (taxaEconomia >= 10) ptsEconomia = 20;
    else if (taxaEconomia >= 0) ptsEconomia = 13;
    else ptsEconomia = clamp(Math.round(8 + taxaEconomia * 0.25), 0, 8);
  }
  pilares.push({
    id: "economia",
    nome: "Fluxo de Caixa e Economia",
    pontos: ptsEconomia,
    max_pontos: 25,
    status: ptsEconomia >= 20 ? "bom" : ptsEconomia >= 13 ? "atencao" : "critico",
    resumo:
      taxaEconomia !== null
        ? `Taxa de economia em ${taxaEconomia}% no período.`
        : "Sem receitas registradas no período.",
  });

  if (taxaEconomia !== null && taxaEconomia < 0) {
    achados.push({
      id: "fluxo-deficit",
      severidade: "critica",
      area: "Visão Geral",
      titulo: "Despesas acima das receitas no mês",
      descricao: `Você gastou R$ ${fromCents(despesasCents - receitasCents).toFixed(2)} a mais do que recebeu no período (taxa de economia em ${taxaEconomia}%).`,
      impacto_valor: fromCents(despesasCents - receitasCents),
      acao_sugerida: "Revise os maiores ofensores por categoria e freie gastos não essenciais.",
      rota_acao: "/comparativo",
    });
  } else if (taxaEconomia !== null && taxaEconomia >= 20) {
    achados.push({
      id: "fluxo-saudavel",
      severidade: "positiva",
      area: "Visão Geral",
      titulo: "Excelente taxa de economia",
      descricao: `Você está poupando ${taxaEconomia}% da sua renda no período, acima da referência saudável de 20%.`,
      impacto_valor: fromCents(receitasCents - despesasCents),
      acao_sugerida: "Direcione o excedente para reserva ou acelere suas metas financeiras.",
      rota_acao: "/objetivos",
    });
  }

  // 2) Comprometimento Fixo + Dívidas (20 pts)
  let ptsComp = 15;
  if (comprometimento !== null) {
    if (comprometimento <= 45) ptsComp = 20;
    else if (comprometimento <= 60) ptsComp = 14;
    else if (comprometimento <= 75) ptsComp = 8;
    else ptsComp = 3;
  }
  pilares.push({
    id: "comprometimento",
    nome: "Comprometimento Fixo e Dívidas",
    pontos: ptsComp,
    max_pontos: 20,
    status: ptsComp >= 16 ? "bom" : ptsComp >= 10 ? "atencao" : "critico",
    resumo:
      comprometimento !== null
        ? `${comprometimento}% da renda comprometida com contas fixas e parcelas.`
        : "Aguardando registro de receitas para medir comprometimento.",
  });

  if (comprometimento !== null && comprometimento > 65) {
    achados.push({
      id: "comprometimento-alto",
      severidade: comprometimento > 75 ? "critica" : "atencao",
      area: "Gestão",
      titulo: "Renda muito comprometida com obrigações recorrentes",
      descricao: `${comprometimento}% das suas receitas já estão comprometidas com despesas fixas e parcelas de dívidas.`,
      impacto_valor: Number(indicadores.comprometimento_fixo_dividas || 0),
      acao_sugerida: "Avalie assinaturas dispensáveis em Transações Fixas ou simule amortizações.",
      rota_acao: "/gastos-fixos",
    });
  }

  // 3) Disciplina de Orçamentos (15 pts)
  const orcsAtivos = orcamentosItens.filter((o) => o.ativo);
  const orcsExcedidos = orcsAtivos.filter((o) => o.status === "excedido");
  const orcsAlerta = orcsAtivos.filter((o) => o.status === "alerta");
  let ptsOrc = 15;
  if (orcsAtivos.length > 0) {
    const okCount = orcsAtivos.filter((o) => o.status === "ok").length;
    const ratio = (okCount + orcsAlerta.length * 0.5) / orcsAtivos.length;
    ptsOrc = Math.round(ratio * 15);
  }
  pilares.push({
    id: "orcamentos",
    nome: "Disciplina de Orçamentos",
    pontos: ptsOrc,
    max_pontos: 15,
    status:
      orcsExcedidos.length === 0 && orcsAlerta.length === 0
        ? "bom"
        : orcsExcedidos.length > 0
          ? "critico"
          : "atencao",
    resumo:
      orcsAtivos.length === 0
        ? "Nenhum orçamento ativo configurado (pontuação neutra)."
        : `${orcsAtivos.length - orcsExcedidos.length - orcsAlerta.length} de ${orcsAtivos.length} dentro do limite.`,
  });

  if (orcsExcedidos.length > 0) {
    const totalExcesso = orcsExcedidos.reduce(
      (s, o) => s + Math.max(0, Number(o.gasto_realizado || 0) - Number(o.valor_limite || 0)),
      0,
    );
    achados.push({
      id: "orcamentos-excedidos",
      severidade: "critica",
      area: "Planejamento",
      titulo: `${orcsExcedidos.length} orçamento(s) excedido(s) neste mês`,
      descricao: `Categorias estouradas: ${orcsExcedidos.map((o) => o.categoria_nome).join(", ")}.`,
      impacto_valor: Number(totalExcesso.toFixed(2)),
      acao_sugerida: "Ajuste os gastos dessas categorias até o fechamento do mês.",
      rota_acao: "/orcamentos",
    });
  } else if (orcsAtivos.length > 0 && orcsAlerta.length === 0) {
    achados.push({
      id: "orcamentos-ok",
      severidade: "positiva",
      area: "Planejamento",
      titulo: "Todos os orçamentos ativos sob controle",
      descricao: `Seus ${orcsAtivos.length} orçamentos ativos estão abaixo da faixa de alerta.`,
      impacto_valor: 0,
      acao_sugerida: "Mantenha o acompanhamento semanal pelo Dashboard.",
      rota_acao: "/orcamentos",
    });
  }

  // 4) Cartões e Faturas (15 pts)
  const cartoesAtivos = cartoesItens.filter((c) => c.ativo);
  const faturasVencidas = cartoesAtivos.filter((c) => c.fatura_atual?.status === "vencida");
  const limTotalCents = toCents(cartoesResumo.limite_total_global || 0);
  const limUsadoCents = toCents(cartoesResumo.limite_usado_global || 0);
  const usoCartaoPct = limTotalCents > 0 ? roundPct(limUsadoCents, limTotalCents) : 0;

  let ptsCartao = 15;
  if (faturasVencidas.length > 0) {
    ptsCartao = 4;
  } else if (usoCartaoPct >= 80) {
    ptsCartao = 6;
  } else if (usoCartaoPct >= 60) {
    ptsCartao = 11;
  }
  pilares.push({
    id: "cartoes",
    nome: "Uso de Limite e Faturas",
    pontos: ptsCartao,
    max_pontos: 15,
    status: ptsCartao >= 12 ? "bom" : ptsCartao >= 8 ? "atencao" : "critico",
    resumo:
      cartoesAtivos.length === 0
        ? "Nenhum cartão ativo cadastrado."
        : faturasVencidas.length > 0
          ? `${faturasVencidas.length} fatura(s) vencida(s) pendente(s).`
          : `${usoCartaoPct}% do limite global comprometido.`,
  });

  if (faturasVencidas.length > 0) {
    achados.push({
      id: "cartoes-vencidos",
      severidade: "critica",
      area: "Cartões",
      titulo: "Fatura(s) de cartão vencida(s)",
      descricao: `Cartões com fatura vencida: ${faturasVencidas.map((c) => c.nome).join(", ")}.`,
      impacto_valor: faturasVencidas.reduce((s, c) => s + Number(c.fatura_atual?.total || 0), 0),
      acao_sugerida: "Quite ou regularize em Cartões para evitar juros rotativos.",
      rota_acao: "/cartoes",
    });
  } else if (usoCartaoPct >= 70 && cartoesAtivos.length > 0) {
    achados.push({
      id: "cartoes-limite-alto",
      severidade: "atencao",
      area: "Cartões",
      titulo: "Uso elevado do limite de cartões",
      descricao: `Você já comprometeu ${usoCartaoPct}% do seu limite total somando faturas abertas e parcelas futuras.`,
      impacto_valor: fromCents(limUsadoCents),
      acao_sugerida: "Evite novos parcelamentos longos até liquidar as próximas faturas.",
      rota_acao: "/cartoes",
    });
  }

  // 5) Reserva de Emergência em Liquidez Imediata (15 pts)
  const liquidezImediataCents = toCents(patrimonioResumo.liquidez_imediata || 0);
  const baseMensalCents =
    gastoMedioMensalCents > 0 ? gastoMedioMensalCents : despesasCents;
  const mesesCobertura =
    baseMensalCents > 0
      ? Math.round((liquidezImediataCents * 10) / baseMensalCents) / 10
      : liquidezImediataCents > 0
        ? 6
        : 0;

  let ptsReserva = 4;
  if (mesesCobertura >= 6) ptsReserva = 15;
  else if (mesesCobertura >= 3) ptsReserva = 11;
  else if (mesesCobertura >= 1) ptsReserva = 7;

  pilares.push({
    id: "reserva",
    nome: "Reserva de Emergência",
    pontos: ptsReserva,
    max_pontos: 15,
    status: ptsReserva >= 12 ? "bom" : ptsReserva >= 8 ? "atencao" : "critico",
    resumo:
      baseMensalCents > 0
        ? `Liquidez imediata cobre ~${mesesCobertura} mês(es) de gastos médios.`
        : "Cadastre ativos de liquidez imediata em Patrimônio.",
  });

  if (baseMensalCents > 0 && mesesCobertura < 3) {
    const meta3MesesCents = Math.max(0, baseMensalCents * 3 - liquidezImediataCents);
    achados.push({
      id: "reserva-baixa",
      severidade: mesesCobertura < 1 ? "critica" : "atencao",
      area: "Patrimônio",
      titulo: "Reserva de emergência abaixo de 3 meses",
      descricao: `Sua liquidez imediata (R$ ${fromCents(liquidezImediataCents).toFixed(2)}) cobre cerca de ${mesesCobertura} mês(es) do seu gasto médio mensal.`,
      impacto_valor: fromCents(meta3MesesCents),
      acao_sugerida: "Crie ou reforce um objetivo de Reserva de Emergência com liquidez imediata.",
      rota_acao: "/patrimonio",
    });
  } else if (baseMensalCents > 0 && mesesCobertura >= 6) {
    achados.push({
      id: "reserva-solida",
      severidade: "positiva",
      area: "Patrimônio",
      titulo: "Reserva de liquidez imediata sólida",
      descricao: `Você possui liquidez imediata equivalente a ${mesesCobertura} meses de despesas médias.`,
      impacto_valor: fromCents(liquidezImediataCents),
      acao_sugerida: "Considere alocar novos aportes em objetivos de médio/longo prazo.",
      rota_acao: "/objetivos",
    });
  }

  // 6) Dívidas Caras & Progresso de Objetivos (10 pts)
  const dividasAtivas = dividasItens.filter((d) => d.status === "ativa");
  const maiorJurosDivida = dividasResumo?.estrategias?.avalanche?.[0] || null;
  const atrasadosCount = objetivosResumo?.contagem?.em_atraso || 0;

  let ptsDivObj = 10;
  if (maiorJurosDivida && Number(maiorJurosDivida.taxa_juros_mensal || 0) >= 4) {
    ptsDivObj -= 5;
  } else if (dividasAtivas.length > 0) {
    ptsDivObj -= 2;
  }
  if (atrasadosCount > 0) {
    ptsDivObj -= Math.min(4, atrasadosCount * 2);
  }
  ptsDivObj = clamp(ptsDivObj, 0, 10);

  pilares.push({
    id: "dividas_objetivos",
    nome: "Juros e Ritmo de Metas",
    pontos: ptsDivObj,
    max_pontos: 10,
    status: ptsDivObj >= 8 ? "bom" : ptsDivObj >= 5 ? "atencao" : "critico",
    resumo:
      dividasAtivas.length === 0 && atrasadosCount === 0
        ? "Sem dívidas ativas caras ou metas em atraso."
        : `${dividasAtivas.length} dívida(s) ativa(s) · ${atrasadosCount} objetivo(s) com prazo pressionado.`,
  });

  if (maiorJurosDivida && Number(maiorJurosDivida.taxa_juros_mensal || 0) >= 2.5) {
    achados.push({
      id: "divida-juros-altos",
      severidade: Number(maiorJurosDivida.taxa_juros_mensal) >= 5 ? "critica" : "atencao",
      area: "Dívidas",
      titulo: `Dívida com juros elevados: ${maiorJurosDivida.nome}`,
      descricao: `Taxa de ${maiorJurosDivida.taxa_juros_mensal}% a.m. sobre saldo devedor de R$ ${Number(maiorJurosDivida.saldo_devedor).toFixed(2)}.`,
      impacto_valor: Number(maiorJurosDivida.saldo_devedor),
      acao_sugerida: "Simule uma amortização extra pela estratégia Avalanche.",
      rota_acao: "/dividas",
    });
  }

  // Achados extras de anomalias, concentração, contas atrasadas e recorrências detectadas
  const contasAtrasadas = Number(contasResumo?.contagem_status?.atrasado || 0);
  if (contasAtrasadas > 0) {
    achados.push({
      id: "contas-atrasadas",
      severidade: "critica",
      area: "Contas Fixas",
      titulo: `${contasAtrasadas} conta(s) fixa(s) com vencimento em atraso`,
      descricao: "Existem contas ou assinaturas do mês vencidas e ainda não marcadas como pagas.",
      impacto_valor: 0,
      acao_sugerida: "Regularize em Transações Fixas para evitar multas e manter o extrato alinhado.",
      rota_acao: "/gastos-fixos",
    });
  }

  const spikes = anomaliasCategorias.filter((a) => a.status === "acima_da_media");
  for (const sp of spikes.slice(0, 3)) {
    achados.push({
      id: `anomalia-cat-${sp.categoria_id || sp.categoria_nome}`,
      severidade: sp.variacao_percentual >= 60 ? "critica" : "atencao",
      area: "Categorias",
      titulo: `Desvio atípico em ${sp.categoria_nome} (+${sp.variacao_percentual}%)`,
      descricao: `Você gastou R$ ${sp.gasto_atual.toFixed(2)} neste mês contra média de R$ ${sp.media_3_meses.toFixed(2)} nos últimos 3 meses.`,
      impacto_valor: sp.diferenca,
      acao_sugerida: "Inspecione os lançamentos desta categoria no extrato do Dashboard.",
      rota_acao: "/dashboard",
    });
  }

  // Concentração excessiva em uma categoria (>= 40% das despesas e pelo menos R$ 200)
  if (despesasCents >= 20000 && anomaliasCategorias.length >= 2) {
    const topCat = [...anomaliasCategorias].sort((a, b) => b.gasto_atual - a.gasto_atual)[0];
    if (topCat && topCat.gasto_atual > 0) {
      const sharePct = roundPct(toCents(topCat.gasto_atual), despesasCents);
      if (sharePct !== null && sharePct >= 40) {
        achados.push({
          id: "concentracao-categoria",
          severidade: "informativa",
          area: "Categorias",
          titulo: `Alta concentração em ${topCat.categoria_nome} (${sharePct}%)`,
          descricao: `Quase metade das despesas do mês está concentrada em ${topCat.categoria_nome}.`,
          impacto_valor: topCat.gasto_atual,
          acao_sugerida: "Considere definir um teto mensal em Orçamentos se essa despesa for variável.",
          rota_acao: "/orcamentos",
        });
      }
    }
  }

  if (despesasRecorrentesDetectadas.length > 0) {
    const somaRec = despesasRecorrentesDetectadas.reduce((s, r) => s + r.valor_medio, 0);
    achados.push({
      id: "recorrencias-invisiveis",
      severidade: "informativa",
      area: "Recorrências",
      titulo: `${despesasRecorrentesDetectadas.length} possível(is) gasto(s) recorrente(s) fora do cadastro fixo`,
      descricao: `Despesas repetidas em meses consecutivos (${despesasRecorrentesDetectadas.slice(0, 3).map((r) => r.descricao).join(", ")}), somando cerca de R$ ${somaRec.toFixed(2)}/mês.`,
      impacto_valor: Number(somaRec.toFixed(2)),
      acao_sugerida: "Cadastre em Transações Fixas para prever vencimentos e receber lembretes.",
      rota_acao: "/gastos-fixos",
    });
  }

  const score = clamp(
    pilares.reduce((sum, p) => sum + p.pontos, 0),
    0,
    100,
  );
  const classificacao =
    score >= 75 ? "saudavel" : score >= 50 ? "atencao" : "critico";

  const sevRank = { critica: 1, atencao: 2, informativa: 3, positiva: 4 };
  achados.sort((a, b) => (sevRank[a.severidade] || 9) - (sevRank[b.severidade] || 9));

  return {
    saude_financeira: {
      score,
      classificacao,
      meses_reserva_estimados: mesesCobertura,
      pilares,
    },
    diagnosticos: achados,
  };
}

module.exports = {
  detectarRecorrenciasNaoCadastradas,
  analisarAnomaliasCategorias,
  calcularDiagnosticosFinanceiros,
};
