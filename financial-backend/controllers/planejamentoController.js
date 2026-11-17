const { todayISO } = require("../utils/contasFixas");
const { HORIZONTES_VALIDOS } = require("../utils/projecoes");
const { computeUserProjection } = require("../services/planejamentoService");

const isISODate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

function parseNumberOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

exports.obterProjecoes = async (req, res, next) => {
  const userId = req.user.userId;
  const refDate = isISODate(req.query?.refDate) ? req.query.refDate : todayISO();
  const horizonteRaw = req.query?.horizonte ? parseInt(req.query.horizonte, 10) : 12;

  if (req.query?.horizonte && !HORIZONTES_VALIDOS.includes(horizonteRaw)) {
    return res.status(400).json({ error: "Horizonte inválido. Use 6, 12, 24, 36 ou 60 meses." });
  }

  try {
    const data = await computeUserProjection(userId, {
      refDate,
      parametrosUsuario: { horizonte_meses: horizonteRaw },
    });
    res.set("Cache-Control", "no-store");
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.simularCenario = async (req, res, next) => {
  const userId = req.user.userId;
  const body = req.body || {};
  const refDate = isISODate(body.refDate) ? body.refDate : todayISO();

  const horizonte = body.horizonte_meses !== undefined ? parseInt(body.horizonte_meses, 10) : 12;
  if (!HORIZONTES_VALIDOS.includes(horizonte)) {
    return res.status(400).json({ error: "Horizonte inválido. Use 6, 12, 24, 36 ou 60 meses." });
  }

  const receitaBase = parseNumberOrNull(body.receita_mensal_base);
  const despesaBase = parseNumberOrNull(body.despesa_mensal_base);
  const varRenda = parseNumberOrNull(body.variacao_renda_pct);
  const varDespesa = parseNumberOrNull(body.variacao_despesa_pct);
  const aporteExtra = parseNumberOrNull(body.aporte_mensal_extra);
  const taxaRend = parseNumberOrNull(body.taxa_rendimento_anual_pct);
  const inflacao = parseNumberOrNull(body.inflacao_anual_pct);

  const nums = [receitaBase, despesaBase, varRenda, varDespesa, aporteExtra, taxaRend, inflacao];
  if (nums.some((n) => Number.isNaN(n))) {
    return res.status(400).json({ error: "Um ou mais parâmetros numéricos da simulação são inválidos." });
  }
  if ((receitaBase !== null && receitaBase < 0) || (despesaBase !== null && despesaBase < 0) || (aporteExtra !== null && aporteExtra < 0)) {
    return res.status(400).json({ error: "Valores monetários não podem ser negativos." });
  }

  let eventoUnico = null;
  if (body.evento_unico && body.evento_unico.valor !== undefined && body.evento_unico.valor !== "" && Number(body.evento_unico.valor) > 0) {
    const valEvt = Number(body.evento_unico.valor);
    const mesEvt = parseInt(body.evento_unico.mes || 1, 10);
    if (!Number.isFinite(valEvt) || valEvt < 0 || !Number.isInteger(mesEvt) || mesEvt < 1 || mesEvt > horizonte) {
      return res.status(400).json({ error: "Evento pontual inválido para o horizonte selecionado." });
    }
    eventoUnico = {
      mes: mesEvt,
      tipo: body.evento_unico.tipo === "receita" ? "receita" : "despesa",
      valor: valEvt,
      descricao: body.evento_unico.descricao || "",
    };
  }

  try {
    const data = await computeUserProjection(userId, {
      refDate,
      parametrosUsuario: {
        horizonte_meses: horizonte,
        receita_mensal_base: receitaBase,
        despesa_mensal_base: despesaBase,
        variacao_renda_pct: varRenda ?? 0,
        variacao_despesa_pct: varDespesa ?? 0,
        aporte_mensal_extra: aporteExtra ?? 0,
        taxa_rendimento_anual_pct: taxaRend,
        inflacao_anual_pct: inflacao ?? 0,
        evento_unico: eventoUnico,
      },
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};
