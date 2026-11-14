const pool = require("../config/db");
const { parseCompetencia } = require("../utils/contasFixas");
const {
  monthDateBounds,
  enrichOrcamento,
  calcularResumoOrcamentos,
} = require("../utils/orcamentos");

exports.listarOrcamentos = async (req, res, next) => {
  const userId = req.user.userId;
  const { ano, mes } = parseCompetencia(req.query);
  const { start, endExclusive } = monthDateBounds(ano, mes);

  try {
    const query = `
      SELECT o.id, o.categoria_id, o.valor_limite, o.alerta_percentual, o.ativo,
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
      WHERE o.user_id = $1
      ORDER BY o.ativo DESC, c.nome ASC;
    `;

    const result = await pool.query(query, [userId, start, endExclusive]);
    const itens = result.rows.map((row) => enrichOrcamento(row, ano, mes));
    const resumo = calcularResumoOrcamentos(itens);

    res.json({
      competencia_ano: ano,
      competencia_mes: mes,
      resumo,
      itens,
    });
  } catch (err) {
    next(err);
  }
};

exports.criarOrcamento = async (req, res, next) => {
  const userId = req.user.userId;
  const { categoria_id, valor_limite, alerta_percentual = 80, ativo = true } = req.body;

  const catIdNum = parseInt(categoria_id, 10);
  if (isNaN(catIdNum)) {
    return res.status(400).json({ error: "Selecione uma categoria válida." });
  }

  const numValor = parseFloat(valor_limite);
  if (isNaN(numValor) || numValor <= 0) {
    return res.status(400).json({ error: "O valor limite deve ser positivo." });
  }

  const alertaPct = parseInt(alerta_percentual, 10);
  if (isNaN(alertaPct) || alertaPct < 1 || alertaPct > 100) {
    return res.status(400).json({ error: "O percentual de alerta deve estar entre 1 e 100." });
  }

  try {
    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
    }

    const result = await pool.query(
      `INSERT INTO orcamentos (user_id, categoria_id, valor_limite, alerta_percentual, ativo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, catIdNum, Number(numValor.toFixed(2)), alertaPct, Boolean(ativo)],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "Já existe um orçamento configurado para esta categoria.",
      });
    }
    next(err);
  }
};

exports.atualizarOrcamento = async (req, res, next) => {
  const userId = req.user.userId;
  const orcId = parseInt(req.params.id, 10);
  if (isNaN(orcId)) {
    return res.status(400).json({ error: "ID de orçamento inválido." });
  }

  const { valor_limite, alerta_percentual, ativo } = req.body;

  const numValor = parseFloat(valor_limite);
  if (isNaN(numValor) || numValor <= 0) {
    return res.status(400).json({ error: "O valor limite deve ser positivo." });
  }

  const alertaPct =
    alerta_percentual !== undefined ? parseInt(alerta_percentual, 10) : null;
  if (alertaPct !== null && (isNaN(alertaPct) || alertaPct < 1 || alertaPct > 100)) {
    return res.status(400).json({ error: "O percentual de alerta deve estar entre 1 e 100." });
  }

  try {
    const result = await pool.query(
      `UPDATE orcamentos
       SET valor_limite = $1,
           alerta_percentual = COALESCE($2, alerta_percentual),
           ativo = COALESCE($3, ativo),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [
        Number(numValor.toFixed(2)),
        alertaPct,
        typeof ativo === "boolean" ? ativo : null,
        orcId,
        userId,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Orçamento não encontrado." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deletarOrcamento = async (req, res, next) => {
  const userId = req.user.userId;
  const orcId = parseInt(req.params.id, 10);
  if (isNaN(orcId)) {
    return res.status(400).json({ error: "ID de orçamento inválido." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM orcamentos WHERE id = $1 AND user_id = $2 RETURNING id",
      [orcId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Orçamento não encontrado." });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

