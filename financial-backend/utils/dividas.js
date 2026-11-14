/**
 * Motor determinístico de Dívidas, Parcelas e Amortizações.
 * Todos os valores monetários são manipulados em centavos inteiros.
 */
const { toCents, fromCents } = require("./contasFixas");

const MAX_SIMULATION_MONTHS = 600;

function enrichDivida(row) {
  const originalCents = toCents(row.valor_original);
  const saldoCents = toCents(row.saldo_devedor);
  const amortizadoCents = Math.max(0, originalCents - saldoCents);
  const percentualQuitado =
    originalCents > 0
      ? Math.min(100, Math.round((amortizadoCents * 1000) / originalCents) / 10)
      : 0;

  const totalParcelas = row.total_parcelas !== null && row.total_parcelas !== undefined
    ? Number(row.total_parcelas)
    : null;
  const parcelasPagas = Number(row.parcelas_pagas || 0);
  const parcelasRestantes =
    totalParcelas !== null ? Math.max(0, totalParcelas - parcelasPagas) : null;

  return {
    id: row.id,
    nome: row.nome,
    credor: row.credor || "",
    tipo: row.tipo,
    valor_original: fromCents(originalCents),
    saldo_devedor: fromCents(saldoCents),
    valor_amortizado_total: fromCents(amortizadoCents),
    percentual_quitado: percentualQuitado,
    taxa_juros_mensal: Number(row.taxa_juros_mensal || 0),
    total_parcelas: totalParcelas,
    parcelas_pagas: parcelasPagas,
    parcelas_restantes: parcelasRestantes,
    valor_parcela: row.valor_parcela ? fromCents(toCents(row.valor_parcela)) : null,
    dia_vencimento: row.dia_vencimento || null,
    categoria_id: row.categoria_id || null,
    categoria_nome: row.categoria_nome || null,
    categoria_cor: row.categoria_cor || null,
    status: row.status,
    observacoes: row.observacoes || "",
  };
}

function calcularResumoDividas(itens) {
  let totalOriginalCents = 0;
  let totalSaldoCents = 0;
  let comprometimentoMensalCents = 0;
  let somaPonderadaTaxa = 0;

  let ativas = 0;
  let quitadas = 0;
  let pausadas = 0;

  for (const d of itens) {
    totalOriginalCents += toCents(d.valor_original);
    const saldoCents = toCents(d.saldo_devedor);
    totalSaldoCents += saldoCents;

    if (d.status === "ativa") {
      ativas++;
      if (d.valor_parcela) {
        comprometimentoMensalCents += toCents(d.valor_parcela);
      }
      somaPonderadaTaxa += saldoCents * Number(d.taxa_juros_mensal || 0);
    } else if (d.status === "quitada") {
      quitadas++;
    } else {
      pausadas++;
    }
  }

  const totalAmortizadoCents = Math.max(0, totalOriginalCents - totalSaldoCents);
  const taxaMediaPonderada =
    totalSaldoCents > 0
      ? Math.round((somaPonderadaTaxa / totalSaldoCents) * 100) / 100
      : 0;

  const ativasLista = itens.filter((d) => d.status === "ativa" && d.saldo_devedor > 0);
  const ordemAvalanche = [...ativasLista]
    .sort((a, b) => b.taxa_juros_mensal - a.taxa_juros_mensal || a.saldo_devedor - b.saldo_devedor)
    .map((d) => d.id);
  const ordemBolaDeNeve = [...ativasLista]
    .sort((a, b) => a.saldo_devedor - b.saldo_devedor || b.taxa_juros_mensal - a.taxa_juros_mensal)
    .map((d) => d.id);

  return {
    total_original: fromCents(totalOriginalCents),
    total_saldo_devedor: fromCents(totalSaldoCents),
    total_amortizado: fromCents(totalAmortizadoCents),
    comprometimento_mensal: fromCents(comprometimentoMensalCents),
    taxa_media_ponderada: taxaMediaPonderada,
    contagem: {
      total: itens.length,
      ativas,
      quitadas,
      pausadas,
    },
    estrategias: {
      avalanche_ids: ordemAvalanche,
      bola_de_neve_ids: ordemBolaDeNeve,
    },
  };
}

function rodarSimulacaoMensal(saldoInicialCents, taxaMensalPct, parcelaMensalCents, aporteExtraCents) {
  let saldo = saldoInicialCents;
  let meses = 0;
  let jurosTotaisCents = 0;
  const taxa = Number(taxaMensalPct || 0) / 100;

  if (saldo <= 0) {
    return { meses: 0, juros_totais: 0, quitavel: true };
  }

  while (saldo > 0 && meses < MAX_SIMULATION_MONTHS) {
    meses++;
    const jurosMesCents = Math.round(saldo * taxa);
    const pagamentoDisponivel = parcelaMensalCents + aporteExtraCents;

    // Se no primeiro mês o pagamento total não supera os juros, a dívida nunca amortiza
    if (meses === 1 && pagamentoDisponivel <= jurosMesCents && taxa > 0) {
      return { meses: null, juros_totais: null, quitavel: false };
    }

    const totalDevidoMes = saldo + jurosMesCents;
    const pagamentoEfetivo = Math.min(totalDevidoMes, pagamentoDisponivel);
    jurosTotaisCents += Math.min(jurosMesCents, pagamentoEfetivo);
    saldo = totalDevidoMes - pagamentoEfetivo;
  }

  if (saldo > 0) {
    return { meses: null, juros_totais: null, quitavel: false };
  }

  return {
    meses,
    juros_totais: fromCents(jurosTotaisCents),
    quitavel: true,
  };
}

/**
 * Simula cenário base vs cenário com aporte extra mensal.
 */
function simularAmortizacao({
  saldo_devedor,
  taxa_juros_mensal = 0,
  valor_parcela,
  aporte_extra = 0,
}) {
  const saldoCents = toCents(saldo_devedor);
  const parcelaCents = toCents(valor_parcela);
  const extraCents = Math.max(0, toCents(aporte_extra));

  if (parcelaCents <= 0) {
    return { error: "Informe um valor de parcela mensal positivo para simular." };
  }

  const base = rodarSimulacaoMensal(saldoCents, taxa_juros_mensal, parcelaCents, 0);
  const comAporte = rodarSimulacaoMensal(saldoCents, taxa_juros_mensal, parcelaCents, extraCents);

  const mesesEconomizados =
    base.quitavel && comAporte.quitavel ? Math.max(0, base.meses - comAporte.meses) : null;
  const jurosEconomizados =
    base.quitavel && comAporte.quitavel
      ? fromCents(Math.max(0, toCents(base.juros_totais) - toCents(comAporte.juros_totais)))
      : null;

  return {
    premissas: {
      saldo_devedor: fromCents(saldoCents),
      taxa_juros_mensal: Number(taxa_juros_mensal || 0),
      valor_parcela: fromCents(parcelaCents),
      aporte_extra_mensal: fromCents(extraCents),
    },
    cenario_atual: base,
    cenario_com_aporte: comAporte,
    economia: {
      meses_economizados: mesesEconomizados,
      juros_economizados: jurosEconomizados,
    },
  };
}

module.exports = {
  enrichDivida,
  calcularResumoDividas,
  simularAmortizacao,
};

