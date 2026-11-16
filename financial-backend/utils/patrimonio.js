/**
 * Motor determinístico de Patrimônio (ativos, liquidez, distribuição, projeção de rendimento e patrimônio líquido).
 * Todos os valores monetários são manipulados em centavos inteiros.
 */
const { toCents, fromCents } = require("./contasFixas");

const TIPOS_PATRIMONIO = [
  "conta_corrente",
  "poupanca",
  "reserva_emergencia",
  "renda_fixa",
  "renda_variavel",
  "previdencia",
  "imovel",
  "veiculo",
  "outro",
];

const LIQUIDEZ_VALIDA = ["imediata", "media", "baixa"];
const RENDIMENTO_TIPOS = ["nenhum", "cdi_percentual", "anual", "mensal"];
const DEFAULT_CDI_ANUAL = 14.65;

function calcularTaxasRendimento({
  rendimento_tipo = "nenhum",
  rendimento_valor = null,
  cdi_referencia = null,
} = {}) {
  const tipo = RENDIMENTO_TIPOS.includes(rendimento_tipo) ? rendimento_tipo : "nenhum";
  const valNum =
    rendimento_valor !== null && rendimento_valor !== undefined && rendimento_valor !== ""
      ? Number(rendimento_valor)
      : null;

  if (tipo === "nenhum" || valNum === null || !Number.isFinite(valNum) || valNum <= 0) {
    return {
      ativo: false,
      rendimento_tipo: tipo,
      rendimento_valor: valNum !== null && Number.isFinite(valNum) ? valNum : null,
      cdi_referencia: null,
      taxa_anual_decimal: 0,
      taxa_mensal_decimal: 0,
      taxa_anual_efetiva: null,
      taxa_mensal_efetiva: null,
    };
  }

  let taxaAnualDecimal = 0;
  let taxaMensalDecimal = 0;
  let cdiRefFinal = null;

  if (tipo === "cdi_percentual") {
    const cdiNum =
      cdi_referencia !== null && cdi_referencia !== undefined && cdi_referencia !== ""
        ? Number(cdi_referencia)
        : DEFAULT_CDI_ANUAL;
    cdiRefFinal = Number.isFinite(cdiNum) && cdiNum >= 0 ? cdiNum : DEFAULT_CDI_ANUAL;
    taxaAnualDecimal = (cdiRefFinal / 100) * (valNum / 100);
    taxaMensalDecimal = Math.pow(1 + taxaAnualDecimal, 1 / 12) - 1;
  } else if (tipo === "anual") {
    taxaAnualDecimal = valNum / 100;
    taxaMensalDecimal = Math.pow(1 + taxaAnualDecimal, 1 / 12) - 1;
  } else if (tipo === "mensal") {
    taxaMensalDecimal = valNum / 100;
    taxaAnualDecimal = Math.pow(1 + taxaMensalDecimal, 12) - 1;
  }

  return {
    ativo: true,
    rendimento_tipo: tipo,
    rendimento_valor: Math.round(valNum * 1000) / 1000,
    cdi_referencia: cdiRefFinal !== null ? Math.round(cdiRefFinal * 1000) / 1000 : null,
    taxa_anual_decimal: taxaAnualDecimal,
    taxa_mensal_decimal: taxaMensalDecimal,
    taxa_anual_efetiva: Math.round(taxaAnualDecimal * 10000) / 100,
    taxa_mensal_efetiva: Math.round(taxaMensalDecimal * 10000) / 100,
  };
}

function enrichPatrimonioItem(row) {
  const atualCents = toCents(row.valor_atual);
  const temInvestido =
    row.valor_investido !== null &&
    row.valor_investido !== undefined &&
    row.valor_investido !== "";
  const investidoCents = temInvestido ? toCents(row.valor_investido) : null;

  let ganhoValor = null;
  let rentabilidadePercentual = null;
  if (investidoCents !== null && investidoCents > 0) {
    ganhoValor = fromCents(atualCents - investidoCents);
    rentabilidadePercentual =
      Math.round(((atualCents - investidoCents) * 10000) / investidoCents) / 100;
  }

  const taxas = calcularTaxasRendimento({
    rendimento_tipo: row.rendimento_tipo,
    rendimento_valor: row.rendimento_valor,
    cdi_referencia: row.cdi_referencia,
  });

  const rendimentoMensalEstimado = taxas.ativo
    ? fromCents(Math.round(atualCents * taxas.taxa_mensal_decimal))
    : null;
  const rendimentoAnualEstimado = taxas.ativo
    ? fromCents(Math.round(atualCents * taxas.taxa_anual_decimal))
    : null;

  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    instituicao: row.instituicao || "",
    valor_atual: fromCents(atualCents),
    valor_investido: investidoCents !== null ? fromCents(investidoCents) : null,
    ganho_valor: ganhoValor,
    rentabilidade_percentual: rentabilidadePercentual,
    rendimento_tipo: taxas.rendimento_tipo,
    rendimento_valor: taxas.rendimento_valor,
    cdi_referencia: taxas.cdi_referencia,
    taxa_anual_efetiva: taxas.taxa_anual_efetiva,
    taxa_mensal_efetiva: taxas.taxa_mensal_efetiva,
    rendimento_mensal_estimado: rendimentoMensalEstimado,
    rendimento_anual_estimado: rendimentoAnualEstimado,
    liquidez: row.liquidez || "media",
    ativo: row.ativo !== false,
    observacoes: row.observacoes || "",
  };
}

function calcularResumoPatrimonio(itens, totalPassivos = 0) {
  let totalAtivosCents = 0;
  let liquidezImediataCents = 0;
  let totalInvestidoCents = 0;
  let atualSobreInvestidoCents = 0;
  let rendimentoMensalTotalCents = 0;
  let rendimentoAnualTotalCents = 0;
  let ativosCount = 0;
  let inativosCount = 0;

  const porTipoMap = new Map();

  for (const item of itens) {
    if (item.ativo === false) {
      inativosCount++;
      continue;
    }
    ativosCount++;
    const atualCents = toCents(item.valor_atual);
    totalAtivosCents += atualCents;

    if (item.liquidez === "imediata") {
      liquidezImediataCents += atualCents;
    }

    if (item.valor_investido !== null && item.valor_investido !== undefined) {
      totalInvestidoCents += toCents(item.valor_investido);
      atualSobreInvestidoCents += atualCents;
    }

    if (item.rendimento_mensal_estimado != null) {
      rendimentoMensalTotalCents += toCents(item.rendimento_mensal_estimado);
    }
    if (item.rendimento_anual_estimado != null) {
      rendimentoAnualTotalCents += toCents(item.rendimento_anual_estimado);
    }

    const prev = porTipoMap.get(item.tipo) || { tipo: item.tipo, cents: 0, quantidade: 0 };
    prev.cents += atualCents;
    prev.quantidade += 1;
    porTipoMap.set(item.tipo, prev);
  }

  const passivosCents = Math.max(0, toCents(totalPassivos));
  const patrimonioLiquidoCents = totalAtivosCents - passivosCents;
  const ganhoTotalCents =
    totalInvestidoCents > 0 ? atualSobreInvestidoCents - totalInvestidoCents : 0;

  const distribuicaoPorTipo = Array.from(porTipoMap.values())
    .sort((a, b) => b.cents - a.cents || a.tipo.localeCompare(b.tipo))
    .map((entry) => ({
      tipo: entry.tipo,
      total: fromCents(entry.cents),
      quantidade: entry.quantidade,
      percentual:
        totalAtivosCents > 0
          ? Math.round((entry.cents * 1000) / totalAtivosCents) / 10
          : 0,
    }));

  return {
    total_ativos: fromCents(totalAtivosCents),
    total_passivos: fromCents(passivosCents),
    patrimonio_liquido: fromCents(patrimonioLiquidoCents),
    liquidez_imediata: fromCents(liquidezImediataCents),
    total_investido: fromCents(totalInvestidoCents),
    ganho_total: fromCents(ganhoTotalCents),
    rendimento_mensal_estimado_total: fromCents(rendimentoMensalTotalCents),
    rendimento_anual_estimado_total: fromCents(rendimentoAnualTotalCents),
    distribuicao_por_tipo: distribuicaoPorTipo,
    contagem: {
      total: itens.length,
      ativos: ativosCount,
      inativos: inativosCount,
    },
  };
}

module.exports = {
  TIPOS_PATRIMONIO,
  LIQUIDEZ_VALIDA,
  RENDIMENTO_TIPOS,
  DEFAULT_CDI_ANUAL,
  calcularTaxasRendimento,
  enrichPatrimonioItem,
  calcularResumoPatrimonio,
};
