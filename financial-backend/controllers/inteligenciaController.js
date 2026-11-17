const pool = require("../config/db");
const { todayISO } = require("../utils/contasFixas");
const { parseStrictPositiveInt } = require("../utils/validation");
const {
  MATCH_TIPOS,
  buildHistoricoCategorias,
  classificarDescricao,
  gerarSugestoesRevisao,
} = require("../utils/classificacao");
const { computeUserDiagnostics } = require("../services/diagnosticosService");
const { obterCartao, faturaPaga } = require("./cartoesController");

const isISODate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

async function fetchRegrasCategoriasUsuario(userId) {
  const [regrasRes, catRes] = await Promise.all([
    pool.query(
      `SELECT r.*, c.nome AS categoria_nome, c.cor AS categoria_cor
       FROM classificacao_regras r
       JOIN categorias c ON r.categoria_id = c.id AND c.user_id = r.user_id
       WHERE r.user_id = $1
       ORDER BY r.ativo DESC, r.prioridade DESC, r.id DESC`,
      [userId],
    ),
    pool.query(
      "SELECT id, nome, cor FROM categorias WHERE user_id = $1 ORDER BY nome ASC",
      [userId],
    ),
  ]);
  return { regras: regrasRes.rows, categorias: catRes.rows };
}

exports.obterDiagnosticos = async (req, res, next) => {
  const userId = req.user.userId;
  const refDate = isISODate(req.query?.refDate) ? req.query.refDate : todayISO();

  try {
    const data = await computeUserDiagnostics(userId, refDate);
    res.set("Cache-Control", "no-store");
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.obterClassificacao = async (req, res, next) => {
  const userId = req.user.userId;

  try {
    const [{ regras, categorias }, txRes] = await Promise.all([
      fetchRegrasCategoriasUsuario(userId),
      pool.query(
        `SELECT t.id, t.descricao, t.valor, t.tipo, t.data::text AS data,
                t.categoria_id, c.nome AS categoria_nome, c.cor AS categoria_cor
         FROM transacoes t
         LEFT JOIN categorias c ON t.categoria_id = c.id AND c.user_id = t.user_id
         WHERE t.user_id = $1 AND t.tipo = 'despesa'
         ORDER BY t.data DESC, t.id DESC
         LIMIT 400`,
        [userId],
      ),
    ]);

    const { sugestoes, total_sugestoes, estatisticas } = gerarSugestoesRevisao({
      transacoes: txRes.rows,
      regras,
      categorias,
      limit: 40,
    });

    res.set("Cache-Control", "no-store");
    res.json({
      regras,
      categorias,
      sugestoes,
      total_sugestoes,
      estatisticas,
    });
  } catch (err) {
    next(err);
  }
};

exports.sugerirClassificacao = async (req, res, next) => {
  const userId = req.user.userId;
  const descricao = typeof req.body?.descricao === "string" ? req.body.descricao.trim() : "";
  const tipo = req.body?.tipo || "despesa";

  if (tipo !== "despesa" || descricao.length < 2) {
    return res.json({ sugestao: null });
  }

  try {
    const [{ regras, categorias }, histRes] = await Promise.all([
      fetchRegrasCategoriasUsuario(userId),
      pool.query(
        `SELECT t.descricao, t.tipo, t.categoria_id,
                c.nome AS categoria_nome, c.cor AS categoria_cor
         FROM transacoes t
         LEFT JOIN categorias c ON t.categoria_id = c.id AND c.user_id = t.user_id
         WHERE t.user_id = $1 AND t.tipo = 'despesa' AND t.categoria_id IS NOT NULL
         ORDER BY t.data DESC, t.id DESC
         LIMIT 250`,
        [userId],
      ),
    ]);

    const historico = buildHistoricoCategorias(histRes.rows);
    const sugestao = classificarDescricao({
      descricao,
      regras,
      categorias,
      historicoPorDescricao: historico,
    });

    res.json({ sugestao });
  } catch (err) {
    next(err);
  }
};

exports.criarRegra = async (req, res, next) => {
  const userId = req.user.userId;
  const {
    padrao,
    tipo_match = "contains",
    categoria_id,
    prioridade = 10,
    ativo = true,
  } = req.body || {};

  const cleanPadrao = typeof padrao === "string" ? padrao.trim() : "";
  if (cleanPadrao.length < 2 || cleanPadrao.length > 100) {
    return res.status(400).json({ error: "O padrão da regra deve ter entre 2 e 100 caracteres." });
  }
  if (!MATCH_TIPOS.includes(tipo_match)) {
    return res.status(400).json({ error: "Tipo de correspondência inválido." });
  }
  const catId = parseStrictPositiveInt(categoria_id);
  if (!catId) {
    return res.status(400).json({ error: "Selecione uma categoria válida." });
  }
  const prioNum = Number.isInteger(Number(prioridade)) ? Number(prioridade) : 10;
  if (prioNum < -100 || prioNum > 1000) {
    return res.status(400).json({ error: "A prioridade deve estar entre -100 e 1000." });
  }

  try {
    const catCheck = await pool.query(
      "SELECT id, nome, cor FROM categorias WHERE id = $1 AND user_id = $2",
      [catId, userId],
    );
    if (catCheck.rowCount === 0) {
      return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
    }

    const ins = await pool.query(
      `INSERT INTO classificacao_regras (user_id, padrao, tipo_match, categoria_id, prioridade, ativo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, cleanPadrao, tipo_match, catId, prioNum, Boolean(ativo)],
    );

    res.status(201).json({
      ...ins.rows[0],
      categoria_nome: catCheck.rows[0].nome,
      categoria_cor: catCheck.rows[0].cor,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Já existe uma regra igual com este padrão e critério." });
    }
    next(err);
  }
};

exports.atualizarRegra = async (req, res, next) => {
  const userId = req.user.userId;
  const regraId = parseStrictPositiveInt(req.params.id);
  if (!regraId) return res.status(400).json({ error: "ID de regra inválido." });

  const { padrao, tipo_match, categoria_id, prioridade, ativo } = req.body || {};

  try {
    const prevRes = await pool.query(
      "SELECT * FROM classificacao_regras WHERE id = $1 AND user_id = $2",
      [regraId, userId],
    );
    if (prevRes.rowCount === 0) {
      return res.status(404).json({ error: "Regra não encontrada." });
    }
    const prev = prevRes.rows[0];

    const cleanPadrao =
      padrao !== undefined ? String(padrao).trim() : prev.padrao;
    if (cleanPadrao.length < 2 || cleanPadrao.length > 100) {
      return res.status(400).json({ error: "O padrão da regra deve ter entre 2 e 100 caracteres." });
    }

    const nextMatch = tipo_match !== undefined ? tipo_match : prev.tipo_match;
    if (!MATCH_TIPOS.includes(nextMatch)) {
      return res.status(400).json({ error: "Tipo de correspondência inválido." });
    }

    let nextCatId = prev.categoria_id;
    if (categoria_id !== undefined) {
      const parsedCat = parseStrictPositiveInt(categoria_id);
      if (!parsedCat) return res.status(400).json({ error: "Categoria inválida." });
      const catCheck = await pool.query(
        "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
        [parsedCat, userId],
      );
      if (catCheck.rowCount === 0) {
        return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
      }
      nextCatId = parsedCat;
    }

    const nextPrio =
      prioridade !== undefined ? parseInt(prioridade, 10) : prev.prioridade;
    if (!Number.isInteger(nextPrio) || nextPrio < -100 || nextPrio > 1000) {
      return res.status(400).json({ error: "Prioridade inválida." });
    }

    const nextAtivo = ativo !== undefined ? Boolean(ativo) : prev.ativo;

    const upd = await pool.query(
      `UPDATE classificacao_regras
       SET padrao = $1, tipo_match = $2, categoria_id = $3, prioridade = $4, ativo = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [cleanPadrao, nextMatch, nextCatId, nextPrio, nextAtivo, regraId, userId],
    );

    const catRow = await pool.query(
      "SELECT nome, cor FROM categorias WHERE id = $1 AND user_id = $2",
      [nextCatId, userId],
    );

    res.json({
      ...upd.rows[0],
      categoria_nome: catRow.rows[0]?.nome || "",
      categoria_cor: catRow.rows[0]?.cor || "#10b981",
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Já existe outra regra com este padrão e critério." });
    }
    next(err);
  }
};

exports.deletarRegra = async (req, res, next) => {
  const userId = req.user.userId;
  const regraId = parseStrictPositiveInt(req.params.id);
  if (!regraId) return res.status(400).json({ error: "ID de regra inválido." });

  try {
    const del = await pool.query(
      "DELETE FROM classificacao_regras WHERE id = $1 AND user_id = $2 RETURNING id",
      [regraId, userId],
    );
    if (del.rowCount === 0) {
      return res.status(404).json({ error: "Regra não encontrada." });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

/**
 * Aplica reclassificações explicitamente aprovadas pelo usuário em lote (1..100).
 * Respeita proteção de fatura paga de cartão e isolamento por userId.
 */
exports.aplicarClassificacao = async (req, res, next) => {
  const userId = req.user.userId;
  const { aplicacoes } = req.body || {};

  if (!Array.isArray(aplicacoes) || aplicacoes.length === 0 || aplicacoes.length > 100) {
    return res.status(400).json({
      error: "Envie entre 1 e 100 sugestões aprovadas para aplicar.",
    });
  }

  const normalized = [];
  for (const item of aplicacoes) {
    const txId = parseStrictPositiveInt(item?.transacao_id);
    const catId = parseStrictPositiveInt(item?.categoria_id);
    const regraId = item?.regra_id ? parseStrictPositiveInt(item.regra_id) : null;
    if (!txId || !catId) {
      return res.status(400).json({ error: "Item de aplicação com ID inválido." });
    }
    normalized.push({ transacao_id: txId, categoria_id: catId, regra_id: regraId });
  }

  const catIds = [...new Set(normalized.map((i) => i.categoria_id))];
  const txIds = [...new Set(normalized.map((i) => i.transacao_id))];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Garante que todas as categorias pertencem ao usuário autenticado
    const catsRes = await client.query(
      "SELECT id FROM categorias WHERE id = ANY($1::int[]) AND user_id = $2",
      [catIds, userId],
    );
    const allowedCats = new Set(catsRes.rows.map((r) => r.id));
    if (allowedCats.size !== catIds.length) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Uma ou mais categorias não pertencem à sua conta." });
    }

    // Busca todas as transações válidas do usuário
    const txRes = await client.query(
      `SELECT id, tipo, data::text AS data, cartao_id
       FROM transacoes
       WHERE id = ANY($1::int[]) AND user_id = $2 AND tipo = 'despesa'
       FOR UPDATE`,
      [txIds, userId],
    );
    const txMap = new Map(txRes.rows.map((r) => [r.id, r]));

    let atualizadas = 0;
    let ignoradasFaturaPaga = 0;
    const ruleHits = new Map();

    for (const item of normalized) {
      const tx = txMap.get(item.transacao_id);
      if (!tx) continue;

      if (tx.cartao_id) {
        const cartao = await obterCartao(tx.cartao_id, userId, client);
        if (cartao && (await faturaPaga(client, userId, cartao, tx.data))) {
          ignoradasFaturaPaga += 1;
          continue;
        }
      }

      const upd = await client.query(
        "UPDATE transacoes SET categoria_id = $1 WHERE id = $2 AND user_id = $3",
        [item.categoria_id, tx.id, userId],
      );
      if (upd.rowCount > 0) {
        atualizadas += 1;
        if (item.regra_id) {
          ruleHits.set(item.regra_id, (ruleHits.get(item.regra_id) || 0) + 1);
        }
      }
    }

    for (const [regraId, count] of ruleHits.entries()) {
      await client.query(
        `UPDATE classificacao_regras
         SET acertos = acertos + $1
         WHERE id = $2 AND user_id = $3`,
        [count, regraId, userId],
      );
    }

    await client.query("COMMIT");
    res.json({
      atualizadas,
      ignoradas_fatura_paga: ignoradasFaturaPaga,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};
