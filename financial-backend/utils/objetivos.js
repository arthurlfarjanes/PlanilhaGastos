/**
 * Motor determinístico de Objetivos financeiros (progresso, estimativa de conclusão e ritmo por prazo).
 * Todos os cálculos monetários são executados em centavos inteiros.
 */
const { toCents, fromCents, diffDaysISO, todayISO } = require("./contasFixas");
const { calcularTaxasRendimento } = require("./patrimonio");

const CATEGORIAS_OBJETIVO = [
  "reserva_emergencia",
  "viagem",
  "imovel",
  "veiculo",
  "aposentadoria",
  "educacao",
  "quitacao",
  "outro",
];

const PRIORIDADES_OBJETIVO = ["alta", "media", "baixa"];
const STATUS_OBJETIVO = ["ativo", "concluido", "pausado"];

function daysInUTCMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonthsToISO(isoDate, months) {
  const [y, m, d] = String(isoDate).slice(0, 10).split("-").map(Number);
  const idx = y * 12 + (m - 1) + Number(months || 0);
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  const nd = Math.min(d, daysInUTCMonth(ny, nm));
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

function monthsUntilISO(fromISO, toISO) {
  if (diffDaysISO(fromISO, toISO) <= 0) return 0;
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  const raw = (ty - fy) * 12 + (tm - fm) + (td > fd ? 1 : 0);
  return Math.max(1, raw);
}

function enrichObjetivo(row, refTodayISO = todayISO()) {
  const alvoCents = toCents(row.valor_alvo);
  const atualCents = toCents(row.valor_atual);
  const restanteCents = Math.max(0, alvoCents - atualCents);
  const percentualConcluido =
    alvoCents > 0
      ? Math.min(100, Math.round((atualCents * 1000) / alvoCents) / 10)
      : 0;

  const temAportePlanejado =
    row.aporte_mensal_planejado !== null &&
    row.aporte_mensal_planejado !== undefined &&
    row.aporte_mensal_planejado !== "";
  const aportePlanejadoCents = temAportePlanejado ? toCents(row.aporte_mensal_planejado) : null;

  const patTaxas = calcularTaxasRendimento({
    rendimento_tipo: row.patrimonio_rendimento_tipo,
    rendimento_valor: row.patrimonio_rendimento_valor,
    cdi_referencia: row.patrimonio_cdi_referencia,
  });
  const taxaMensalDecimal = patTaxas.ativo ? patTaxas.taxa_mensal_decimal : 0;

  const concluido = row.status === "concluido" || restanteCents === 0;

  let mesesEstimados = null;
  let dataEstimada = null;
  if (concluido) {
    mesesEstimados = 0;
    dataEstimada = refTodayISO;
  } else if (
    (aportePlanejadoCents !== null && aportePlanejadoCents > 0) ||
    (taxaMensalDecimal > 0 && atualCents > 0)
  ) {
    if (taxaMensalDecimal > 0) {
      let saldoSimCents = atualCents;
      const aporteMensalCents = aportePlanejadoCents || 0;
      let meses = 0;
      while (saldoSimCents < alvoCents && meses < 1200) {
        const rendimentoMes = Math.round(saldoSimCents * taxaMensalDecimal);
        const proximo = saldoSimCents + rendimentoMes + aporteMensalCents;
        if (proximo <= saldoSimCents) {
          meses = null;
          break;
        }
        saldoSimCents = proximo;
        meses++;
      }
      if (meses !== null && saldoSimCents >= alvoCents) {
        mesesEstimados = meses;
        dataEstimada = addMonthsToISO(refTodayISO, mesesEstimados);
      }
    } else if (aportePlanejadoCents > 0) {
      mesesEstimados = Math.ceil(restanteCents / aportePlanejadoCents);
      dataEstimada = addMonthsToISO(refTodayISO, mesesEstimados);
    }
  }

  const prazoISO = row.prazo ? String(row.prazo).slice(0, 10) : null;
  let diasAtePrazo = null;
  let aporteNecessarioPrazo = null;
  let situacaoPrazo = concluido ? "concluido" : "sem_prazo";

  if (prazoISO) {
    diasAtePrazo = diffDaysISO(refTodayISO, prazoISO);
    if (concluido) {
      situacaoPrazo = "concluido";
      aporteNecessarioPrazo = 0;
    } else if (diasAtePrazo < 0) {
      situacaoPrazo = "atrasado";
      aporteNecessarioPrazo = fromCents(restanteCents);
    } else {
      const mesesPrazo = Math.max(1, monthsUntilISO(refTodayISO, prazoISO));
      let necCents;
      if (taxaMensalDecimal > 0) {
        const fator = Math.pow(1 + taxaMensalDecimal, mesesPrazo);
        const futuroAtual = atualCents * fator;
        if (futuroAtual >= alvoCents) {
          necCents = 0;
        } else {
          const denominador = (fator - 1) / taxaMensalDecimal;
          necCents = Math.max(0, Math.ceil((alvoCents - futuroAtual) / denominador));
        }
      } else {
        necCents = Math.ceil(restanteCents / mesesPrazo);
      }
      aporteNecessarioPrazo = fromCents(necCents);
      if (dataEstimada && dataEstimada <= prazoISO) {
        situacaoPrazo = "no_prazo";
      } else if (aportePlanejadoCents !== null && aportePlanejadoCents > 0 && aportePlanejadoCents < necCents) {
        situacaoPrazo = "atencao";
      } else {
        situacaoPrazo = "em_andamento";
      }
    }
  }

  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria || "outro",
    valor_alvo: fromCents(alvoCents),
    valor_atual: fromCents(atualCents),
    valor_restante: fromCents(restanteCents),
    percentual_concluido: percentualConcluido,
    aporte_mensal_planejado:
      aportePlanejadoCents !== null ? fromCents(aportePlanejadoCents) : null,
    prazo: prazoISO,
    dias_ate_prazo: diasAtePrazo,
    aporte_necessario_prazo: aporteNecessarioPrazo,
    meses_estimados: mesesEstimados,
    data_estimada: dataEstimada,
    situacao_prazo: situacaoPrazo,
    considera_rendimento_patrimonio: taxaMensalDecimal > 0,
    taxa_mensal_patrimonio: patTaxas.taxa_mensal_efetiva,
    prioridade: row.prioridade || "media",
    patrimonio_id: row.patrimonio_id || null,
    patrimonio_nome: row.patrimonio_nome || null,
    status: row.status || "ativo",
    observacoes: row.observacoes || "",
  };
}

function calcularResumoObjetivos(itens) {
  let totalAlvoCents = 0;
  let totalAcumuladoCents = 0;
  let totalRestanteCents = 0;
  let aporteMensalTotalCents = 0;
  let ativos = 0;
  let concluidos = 0;
  let pausados = 0;

  for (const obj of itens) {
    if (obj.status === "pausado") {
      pausados++;
      continue;
    }
    if (obj.status === "concluido") concluidos++;
    else ativos++;

    totalAlvoCents += toCents(obj.valor_alvo);
    totalAcumuladoCents += toCents(obj.valor_atual);
    totalRestanteCents += toCents(obj.valor_restante);
    if (obj.status === "ativo" && obj.aporte_mensal_planejado) {
      aporteMensalTotalCents += toCents(obj.aporte_mensal_planejado);
    }
  }

  const percentualGeral =
    totalAlvoCents > 0
      ? Math.min(100, Math.round((totalAcumuladoCents * 1000) / totalAlvoCents) / 10)
      : 0;

  return {
    total_alvo: fromCents(totalAlvoCents),
    total_acumulado: fromCents(totalAcumuladoCents),
    total_restante: fromCents(totalRestanteCents),
    percentual_geral: percentualGeral,
    aporte_mensal_planejado_total: fromCents(aporteMensalTotalCents),
    contagem: {
      total: itens.length,
      ativos,
      concluidos,
      pausados,
    },
  };
}

module.exports = {
  CATEGORIAS_OBJETIVO,
  PRIORIDADES_OBJETIVO,
  STATUS_OBJETIVO,
  addMonthsToISO,
  monthsUntilISO,
  enrichObjetivo,
  calcularResumoObjetivos,
};
