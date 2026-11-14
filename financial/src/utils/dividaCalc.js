/**
 * Cálculo inteligente para cadastro e edição de dívidas (Sistema Price / parcelado).
 * Todas as funções são puras e não sobrescrevem campos preenchidos manualmente pelo usuário.
 */

const SMART_FIELDS = [
  "valor_original",
  "saldo_devedor",
  "taxa_juros_mensal",
  "valor_parcela",
  "total_parcelas",
];

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parsePos(val) {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNonNeg(val) {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseIntPos(val) {
  if (val === "" || val === null || val === undefined) return null;
  const n = parseInt(val, 10);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function parseIntNonNeg(val) {
  if (val === "" || val === null || val === undefined) return null;
  const n = parseInt(val, 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function calcularValorParcelaPrice(principal, taxaMensalPct, n) {
  if (!(principal > 0) || !(n >= 1)) return null;
  const r = (taxaMensalPct || 0) / 100;
  if (r <= 0) return round2(principal / n);
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -n));
  return Number.isFinite(pmt) ? round2(pmt) : null;
}

export function calcularTaxaJurosPrice(principal, valorParcela, n) {
  if (!(principal > 0) || !(valorParcela > 0) || !(n >= 1)) return null;
  if (valorParcela * n <= principal + 1e-6) return 0;
  if (n === 1) return round2(((valorParcela - principal) / principal) * 100);

  const pmtForRate = (r) => (principal * r) / (1 - Math.pow(1 + r, -n));
  let lo = 0;
  let hi = 0.5; // 50% a.m.
  while (pmtForRate(hi) < valorParcela && hi < 100) {
    hi *= 2;
  }
  if (pmtForRate(hi) < valorParcela) return null;

  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    if (pmtForRate(mid) < valorParcela) lo = mid;
    else hi = mid;
  }
  return round2(((lo + hi) / 2) * 100);
}

export function calcularTotalParcelasPrice(principal, valorParcela, taxaMensalPct = 0) {
  if (!(principal > 0) || !(valorParcela > 0)) return null;
  const r = (taxaMensalPct || 0) / 100;
  if (r <= 0) return Math.max(1, Math.ceil(principal / valorParcela - 1e-9));
  if (valorParcela <= principal * r) return null;
  const n = -Math.log(1 - (principal * r) / valorParcela) / Math.log(1 + r);
  return Number.isFinite(n) ? Math.max(1, Math.ceil(n - 1e-9)) : null;
}

export function calcularValorPresentePrice(valorParcela, taxaMensalPct, n) {
  if (!(valorParcela > 0) || !(n >= 1)) return null;
  const r = (taxaMensalPct || 0) / 100;
  if (r <= 0) return round2(valorParcela * n);
  const pv = (valorParcela * (1 - Math.pow(1 + r, -n))) / r;
  return Number.isFinite(pv) ? round2(pv) : null;
}

export function buildInitialManualMap(form) {
  const map = {};
  for (const f of [...SMART_FIELDS, "parcelas_pagas"]) {
    if (form[f] !== "" && form[f] !== null && form[f] !== undefined) {
      map[f] = true;
    }
  }
  return map;
}

function runDerivation(nextForm, nextManual, skipField = null) {
  let vo = nextManual.valor_original ? parsePos(nextForm.valor_original) : null;
  const sd = nextManual.saldo_devedor ? parseNonNeg(nextForm.saldo_devedor) : null;
  let tot = nextManual.total_parcelas ? parseIntPos(nextForm.total_parcelas) : null;
  const pagas = parseIntNonNeg(nextForm.parcelas_pagas) ?? 0;
  let taxa = nextManual.taxa_juros_mensal ? parseNonNeg(nextForm.taxa_juros_mensal) : null;
  let pmt = nextManual.valor_parcela ? parsePos(nextForm.valor_parcela) : null;

  const autoFields = {};
  const canAuto = (f) => !nextManual[f] && f !== skipField;
  let P = sd != null && sd > 0 ? sd : vo;

  // 1. Se usuário preencheu parcela + total_parcelas (+ taxa opcional) mas não valor_original nem saldo_devedor
  if (canAuto("valor_original") && !nextManual.saldo_devedor && pmt != null && tot != null) {
    const voCalc = calcularValorPresentePrice(pmt, taxa ?? 0, tot);
    if (voCalc != null) {
      nextForm.valor_original = String(voCalc);
      autoFields.valor_original = true;
      vo = voCalc;
      P = voCalc;
      if (canAuto("taxa_juros_mensal")) {
        nextForm.taxa_juros_mensal = "0";
        autoFields.taxa_juros_mensal = true;
        taxa = 0;
      }
    }
  }

  // 2. Temos principal (valor_original ou saldo_devedor) + total_parcelas com parcelas restantes > 0
  const nRem = tot != null && tot > pagas ? tot - pagas : null;
  if (P != null && nRem != null) {
    if (taxa != null && canAuto("valor_parcela")) {
      const pmtCalc = calcularValorParcelaPrice(P, taxa, nRem);
      if (pmtCalc != null) {
        nextForm.valor_parcela = String(pmtCalc);
        autoFields.valor_parcela = true;
        pmt = pmtCalc;
      }
    } else if (pmt != null && canAuto("taxa_juros_mensal")) {
      const taxaCalc = calcularTaxaJurosPrice(P, pmt, nRem);
      if (taxaCalc != null) {
        nextForm.taxa_juros_mensal = String(taxaCalc);
        autoFields.taxa_juros_mensal = true;
        taxa = taxaCalc;
      }
    } else if (taxa == null && pmt == null) {
      if (canAuto("taxa_juros_mensal")) {
        nextForm.taxa_juros_mensal = "0";
        autoFields.taxa_juros_mensal = true;
        taxa = 0;
      }
      if (canAuto("valor_parcela")) {
        const pmtCalc = calcularValorParcelaPrice(P, 0, nRem);
        if (pmtCalc != null) {
          nextForm.valor_parcela = String(pmtCalc);
          autoFields.valor_parcela = true;
          pmt = pmtCalc;
        }
      }
    }
  } else if (P != null && pmt != null && canAuto("total_parcelas")) {
    // 3. Temos principal + valor_parcela (+ taxa opcional) -> calcular total_parcelas
    const rPct = taxa ?? 0;
    const nCalc = calcularTotalParcelasPrice(P, pmt, rPct);
    if (nCalc != null) {
      tot = pagas + nCalc;
      nextForm.total_parcelas = String(tot);
      autoFields.total_parcelas = true;
      if (canAuto("taxa_juros_mensal")) {
        nextForm.taxa_juros_mensal = "0";
        autoFields.taxa_juros_mensal = true;
        taxa = 0;
      }
    }
  }

  // 4. Se parcelas já pagas > 0 e saldo_devedor não foi preenchido manualmente, estima saldo restante
  if (canAuto("saldo_devedor") && vo != null && tot != null && pagas > 0 && pagas < tot) {
    const rest = tot - pagas;
    const effTaxa = parseNonNeg(nextForm.taxa_juros_mensal) ?? 0;
    const effPmt = parsePos(nextForm.valor_parcela);
    const sdCalc =
      effPmt != null && effTaxa > 0
        ? calcularValorPresentePrice(effPmt, effTaxa, rest)
        : round2((vo * rest) / tot);
    if (sdCalc != null) {
      nextForm.saldo_devedor = String(sdCalc);
      autoFields.saldo_devedor = true;
    }
  }

  // Limpa campos automáticos que perderam os insumos necessários
  for (const f of SMART_FIELDS) {
    if (!nextManual[f] && !autoFields[f]) {
      nextForm[f] = "";
    }
  }

  return { form: nextForm, manual: nextManual, autoFields };
}

/**
 * Atualiza um campo do formulário e recalcula automaticamente apenas os campos
 * numéricos que não foram preenchidos manualmente pelo usuário.
 */
export function applySmartDebtChange(prevForm, prevManual, field, rawValue) {
  const strValue =
    rawValue === "" || rawValue === null || rawValue === undefined ? "" : String(rawValue);

  const nextForm = { ...prevForm, [field]: strValue };
  const nextManual = { ...(prevManual || {}) };

  let skipField = null;
  if (strValue === "") {
    delete nextManual[field];
    skipField = field;
  } else {
    nextManual[field] = true;
  }

  return runDerivation(nextForm, nextManual, skipField);
}

/**
 * Recalcula campos vazios / não-manuais (ex.: ao sair do campo com onBlur).
 */
export function recomputeSmartDebt(prevForm, prevManual) {
  return runDerivation({ ...prevForm }, { ...(prevManual || {}) }, null);
}
