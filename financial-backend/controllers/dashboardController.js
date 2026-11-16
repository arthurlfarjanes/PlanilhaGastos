const pool = require("../config/db");
const { toCents, fromCents, todayISO } = require("../utils/contasFixas");
const { enrichDivida, calcularResumoDividas } = require("../utils/dividas");
const { enrichPatrimonioItem, calcularResumoPatrimonio } = require("../utils/patrimonio");
const { enrichObjetivo, calcularResumoObjetivos } = require("../utils/objetivos");
const { calcularFatura } = require("../utils/cartoes");
const { calcularIndicadoresFinanceiros } = require("../utils/indicadores");

const isISODate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

exports.obterIndicadores = async (req, res, next) => {
  const userId = req.user.userId;
  const dataInicio = isISODate(req.query?.dataInicio) ? req.query.dataInicio : null;
  const dataFim = isISODate(req.query?.dataFim) ? req.query.dataFim : null;
  const refDate = isISODate(req.query?.refDate) ? req.query.refDate : todayISO();
  const [anoRef, mesRef] = refDate.split("-").map(Number);

  try {
    let txSql = `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) AS total_receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS total_despesas
      FROM transacoes
      WHERE user_id = $1
    `;
    const txParams = [userId];
    if (dataInicio) {
      txParams.push(dataInicio);
      txSql += ` AND data >= $${txParams.length}::date`;
    }
    if (dataFim) {
      txParams.push(dataFim);
      txSql += ` AND data <= $${txParams.length}::date`;
    }

    const [
      txRes,
      fixasRes,
      dividasRes,
      patRes,
      objRes,
      cartoesRes,
      lancCartaoRes,
      pagCartaoRes,
    ] = await Promise.all([
      pool.query(txSql, txParams),
      pool.query(
        `SELECT COALESCE(SUM(valor), 0) AS total_fixas
         FROM gastos_fixos
         WHERE usuario_id = $1 AND ativo = TRUE AND tipo = 'despesa'`,
        [userId],
      ),
      pool.query("SELECT * FROM dividas WHERE user_id = $1", [userId]),
      pool.query("SELECT * FROM patrimonio_itens WHERE user_id = $1", [userId]),
      pool.query(
        `SELECT o.*,
                p.nome AS patrimonio_nome,
                p.rendimento_tipo AS patrimonio_rendimento_tipo,
                p.rendimento_valor AS patrimonio_rendimento_valor,
                p.cdi_referencia AS patrimonio_cdi_referencia
         FROM objetivos o
         LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
         WHERE o.user_id = $1`,
        [userId],
      ),
      pool.query("SELECT * FROM cartoes WHERE user_id = $1 AND ativo = TRUE", [userId]),
      pool.query(
        `SELECT id, descricao, valor, data::text AS data, categoria_id, cartao_id
         FROM transacoes
         WHERE user_id = $1 AND cartao_id IS NOT NULL AND tipo = 'despesa'`,
        [userId],
      ),
      pool.query(
        `SELECT id, cartao_id, competencia_ano, competencia_mes, valor_pago,
                to_char(data_pagamento, 'YYYY-MM-DD') AS data_pagamento
         FROM cartoes_faturas_pagas
         WHERE user_id = $1`,
        [userId],
      ),
    ]);

    const dividasEnriched = dividasRes.rows.map(enrichDivida);
    const dividasResumo = calcularResumoDividas(dividasEnriched);

    const patEnriched = patRes.rows.map(enrichPatrimonioItem);
    const patResumo = calcularResumoPatrimonio(patEnriched, dividasResumo.total_saldo_devedor);

    const objEnriched = objRes.rows.map((r) => enrichObjetivo(r, refDate));
    const objResumo = calcularResumoObjetivos(objEnriched);

    let faturasMesCents = 0;
    for (const c of cartoesRes.rows) {
      const lancs = lancCartaoRes.rows.filter((l) => l.cartao_id === c.id);
      const pag = pagCartaoRes.rows.find(
        (p) =>
          p.cartao_id === c.id &&
          Number(p.competencia_ano) === anoRef &&
          Number(p.competencia_mes) === mesRef,
      );
      const fatura = calcularFatura(c, lancs, anoRef, mesRef, pag || null, refDate);
      if (fatura.status !== "paga") {
        faturasMesCents += toCents(fatura.total);
      }
    }

    const indicadores = calcularIndicadoresFinanceiros({
      receitas: txRes.rows[0]?.total_receitas || 0,
      despesas: txRes.rows[0]?.total_despesas || 0,
      contasFixasDespesas: fixasRes.rows[0]?.total_fixas || 0,
      dividasMensais: dividasResumo.comprometimento_mensal || 0,
      faturasMesAtual: fromCents(faturasMesCents),
      patrimonioResumo: patResumo,
      objetivosResumo: objResumo,
    });

    res.set("Cache-Control", "no-store");
    res.json({
      indicadores,
      patrimonio_resumo: patResumo,
      objetivos_resumo: objResumo,
      dividas_resumo: dividasResumo,
    });
  } catch (err) {
    next(err);
  }
};
