const pool = require("../config/db");
const { todayISO, enrichContaCompetencia } = require("../utils/contasFixas");
const { monthDateBounds, enrichOrcamento } = require("../utils/orcamentos");
const { calcularFatura } = require("../utils/cartoes");
const { enrichObjetivo } = require("../utils/objetivos");
const { withDefaults } = require("../utils/preferencias");
const { gerarLembretesFinanceiros } = require("../utils/notificacoes");

const isISODate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

exports.listarLembretes = async (req, res, next) => {
  const userId = req.user.userId;
  const refDate = isISODate(req.query?.refDate) ? req.query.refDate : todayISO();
  const [ano, mes] = refDate.split("-").map(Number);
  const { start, endExclusive } = monthDateBounds(ano, mes);

  try {
    const [
      prefRes,
      contasRes,
      orcRes,
      cartoesRes,
      lancCartaoRes,
      pagCartaoRes,
      objRes,
    ] = await Promise.all([
      pool.query("SELECT preferences FROM user_preferences WHERE user_id = $1", [userId]),
      pool.query(
        `SELECT gf.id, gf.descricao, gf.valor, gf.dia_vencimento, gf.categoria_id, gf.tipo,
                gf.is_assinatura, gf.ativo, gf.gerar_automatico,
                gfp.id AS pagamento_id, gfp.valor_pago, gfp.data_pagamento, gfp.transacao_id
         FROM gastos_fixos gf
         LEFT JOIN gastos_fixos_pagamentos gfp
           ON gfp.gasto_fixo_id = gf.id
          AND gfp.competencia_ano = $2
          AND gfp.competencia_mes = $3
         WHERE gf.usuario_id = $1 AND gf.ativo = TRUE`,
        [userId, ano, mes],
      ),
      pool.query(
        `SELECT o.id, o.categoria_id, o.valor_limite, o.alerta_percentual, o.ativo,
                c.nome AS categoria_nome, c.cor AS categoria_cor,
                COALESCE(g.total_gasto, 0) AS gasto_realizado
         FROM orcamentos o
         JOIN categorias c ON o.categoria_id = c.id
         LEFT JOIN (
           SELECT categoria_id, SUM(valor) AS total_gasto
           FROM transacoes
           WHERE user_id = $1
             AND tipo = 'despesa'
             AND data >= $2::date
             AND data < $3::date
             AND categoria_id IS NOT NULL
           GROUP BY categoria_id
         ) g ON g.categoria_id = o.categoria_id
         WHERE o.user_id = $1 AND o.ativo = TRUE`,
        [userId, start, endExclusive],
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
      pool.query(
        `SELECT o.*,
                p.nome AS patrimonio_nome,
                p.rendimento_tipo AS patrimonio_rendimento_tipo,
                p.rendimento_valor AS patrimonio_rendimento_valor,
                p.cdi_referencia AS patrimonio_cdi_referencia
         FROM objetivos o
         LEFT JOIN patrimonio_itens p ON o.patrimonio_id = p.id AND p.user_id = o.user_id
         WHERE o.user_id = $1 AND o.status = 'ativo'`,
        [userId],
      ),
    ]);

    const userPrefs = withDefaults(prefRes.rows[0]?.preferences);
    const notifPrefs = userPrefs.notifications;

    const contas = contasRes.rows.map((r) => enrichContaCompetencia(r, ano, mes, refDate));
    const orcamentos = orcRes.rows.map((r) => enrichOrcamento(r, ano, mes));
    const objetivos = objRes.rows.map((r) => enrichObjetivo(r, refDate));

    const cartoesFaturas = cartoesRes.rows.map((c) => {
      const lancs = lancCartaoRes.rows.filter((l) => l.cartao_id === c.id);
      const pag = pagCartaoRes.rows.find(
        (p) =>
          p.cartao_id === c.id &&
          Number(p.competencia_ano) === ano &&
          Number(p.competencia_mes) === mes,
      );
      const f = calcularFatura(c, lancs, ano, mes, pag || null, refDate);
      return { ...f, cartao_id: c.id, cartao_nome: c.nome };
    });

    const { resumo, lembretes } = gerarLembretesFinanceiros({
      contas,
      cartoesFaturas,
      orcamentos,
      objetivos,
      prefs: notifPrefs,
      refTodayISO: refDate,
    });

    res.set("Cache-Control", "no-store");
    res.json({
      resumo,
      lembretes,
      preferencias: notifPrefs,
    });
  } catch (err) {
    next(err);
  }
};
