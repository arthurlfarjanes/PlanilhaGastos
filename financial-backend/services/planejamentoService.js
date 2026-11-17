/**
 * Serviço agregador para Projeções Financeiras e Simulador de Cenários.
 */
const pool = require("../config/db");
const { todayISO } = require("../utils/contasFixas");
const { enrichDivida, calcularResumoDividas } = require("../utils/dividas");
const { enrichPatrimonioItem, calcularResumoPatrimonio } = require("../utils/patrimonio");
const { enrichObjetivo } = require("../utils/objetivos");
const {
  derivarPremissasIniciais,
  gerarProjecaoECenarios,
} = require("../utils/projecoes");

function shiftMonthsStartISO(ano, mes, deltaMonths) {
  const d = new Date(Date.UTC(ano, mes - 1 + deltaMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function computeUserProjection(
  userId,
  { refDate = todayISO(), parametrosUsuario = {} } = {},
) {
  const [ano, mes] = refDate.split("-").map(Number);
  const histStart = shiftMonthsStartISO(ano, mes, -3);

  const [txHistRes, txFutRes, fixasRes, divRes, patRes, objRes] = await Promise.all([
    pool.query(
      `SELECT id, descricao, valor, tipo, data::text AS data
       FROM transacoes
       WHERE user_id = $1 AND data >= $2::date AND data <= $3::date`,
      [userId, histStart, refDate],
    ),
    pool.query(
      `SELECT id, descricao, valor, tipo, data::text AS data
       FROM transacoes
       WHERE user_id = $1 AND tipo = 'despesa' AND data > $2::date
       ORDER BY data ASC`,
      [userId, refDate],
    ),
    pool.query("SELECT * FROM gastos_fixos WHERE usuario_id = $1 AND ativo = TRUE", [userId]),
    pool.query("SELECT * FROM dividas WHERE user_id = $1", [userId]),
    pool.query("SELECT * FROM patrimonio_itens WHERE user_id = $1", [userId]),
    pool.query(
      `SELECT o.*, p.nome AS patrimonio_nome,
              p.rendimento_tipo AS patrimonio_rendimento_tipo,
              p.rendimento_valor AS patrimonio_rendimento_valor,
              p.cdi_referencia AS patrimonio_cdi_referencia
       FROM objetivos o
       LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
       WHERE o.user_id = $1`,
      [userId],
    ),
  ]);

  const dividasItens = divRes.rows.map(enrichDivida);
  const dividasResumo = calcularResumoDividas(dividasItens);
  const patrimonioItens = patRes.rows.map(enrichPatrimonioItem);
  const patrimonioResumo = calcularResumoPatrimonio(
    patrimonioItens,
    dividasResumo.total_saldo_devedor,
  );
  const objetivosItens = objRes.rows.map((r) => enrichObjetivo(r, refDate));

  const premissasIniciais = derivarPremissasIniciais({
    refDate,
    transacoesRecentes: txHistRes.rows,
    gastosFixos: fixasRes.rows,
    patrimonioItens,
  });

  return gerarProjecaoECenarios({
    refDate,
    premissasIniciais,
    parametrosUsuario,
    patrimonioResumo,
    dividasItens,
    objetivosItens,
    transacoesFuturas: txFutRes.rows,
  });
}

module.exports = {
  computeUserProjection,
};
