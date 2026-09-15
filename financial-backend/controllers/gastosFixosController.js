const pool = require("../config/db");

exports.criarGastoFixo = async (req, res, next) => {
  const { descricao, valor, dia_vencimento, categoria_id, tipo } = req.body;
  const userId = req.user.userId;

  if (!descricao || valor === undefined || dia_vencimento === undefined) {
    return res.status(400).json({
      error: "Descrição, valor e dia de vencimento são obrigatórios.",
    });
  }

  const tipoTransacao = tipo === "receita" ? "receita" : "despesa";

  const numValor = parseFloat(valor);
  if (isNaN(numValor) || numValor <= 0) {
    return res
      .status(400)
      .json({ error: "O valor deve ser um número positivo." });
  }

  const diaVenc = parseInt(dia_vencimento);
  if (isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
    return res
      .status(400)
      .json({ error: "O dia de vencimento deve estar entre 1 e 31." });
  }

  let finalCategoriaId = null;
  if (categoria_id) {
    const catIdNum = parseInt(categoria_id);
    if (isNaN(catIdNum)) {
      return res.status(400).json({ error: "ID de categoria inválido." });
    }

    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Categoria inválida ou não autorizada." });
    }
    finalCategoriaId = catIdNum;
  }

  try {
    const query = `
      INSERT INTO gastos_fixos (usuario_id, descricao, valor, dia_vencimento, categoria_id, tipo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const valores = [
      userId,
      descricao.toString().trim().substring(0, 100),
      numValor,
      diaVenc,
      finalCategoriaId,
      tipoTransacao,
    ];

    const result = await pool.query(query, valores);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.listarGastosFixos = async (req, res, next) => {
  const userId = req.user.userId;

  try {
    const query = `
      SELECT gf.id, gf.descricao, gf.valor, gf.dia_vencimento, gf.categoria_id, gf.tipo,
             c.nome as categoria_nome, c.cor as categoria_cor
      FROM gastos_fixos gf
      LEFT JOIN categorias c ON gf.categoria_id = c.id
      WHERE gf.usuario_id = $1
      ORDER BY gf.dia_vencimento ASC;
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.deletarGastoFixo = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const gastoId = parseInt(id);
  if (isNaN(gastoId)) {
    return res.status(400).json({ error: "ID de transação fixa inválido." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM gastos_fixos WHERE id = $1 AND usuario_id = $2 RETURNING id",
      [gastoId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Transação fixa não encontrada ou sem permissão para excluir.",
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.atualizarGastoFixo = async (req, res, next) => {
  const { id } = req.params;
  const { descricao, valor, dia_vencimento, categoria_id, tipo } = req.body;
  const userId = req.user.userId;

  const gastoId = parseInt(id);
  if (isNaN(gastoId)) {
    return res.status(400).json({ error: "ID de transação fixa inválido." });
  }

  if (!descricao || valor === undefined || dia_vencimento === undefined) {
    return res.status(400).json({
      error: "Descrição, valor e dia de vencimento são obrigatórios.",
    });
  }

  const tipoTransacao = tipo === "receita" ? "receita" : "despesa";

  const numValor = parseFloat(valor);
  if (isNaN(numValor) || numValor <= 0) {
    return res
      .status(400)
      .json({ error: "O valor deve ser um número positivo." });
  }

  const diaVenc = parseInt(dia_vencimento);
  if (isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
    return res
      .status(400)
      .json({ error: "O dia de vencimento deve estar entre 1 e 31." });
  }

  let finalCategoriaId = null;
  if (categoria_id) {
    const catIdNum = parseInt(categoria_id);
    if (isNaN(catIdNum)) {
      return res.status(400).json({ error: "ID de categoria inválido." });
    }

    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Categoria inválida ou não autorizada." });
    }
    finalCategoriaId = catIdNum;
  }

  try {
    const query = `
      UPDATE gastos_fixos 
      SET descricao = $1, valor = $2, dia_vencimento = $3, categoria_id = $4, tipo = $5
      WHERE id = $6 AND usuario_id = $7
      RETURNING *;
    `;
    const valores = [
      descricao.toString().trim().substring(0, 100),
      numValor,
      diaVenc,
      finalCategoriaId,
      tipoTransacao,
      gastoId,
      userId,
    ];

    const result = await pool.query(query, valores);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Transação fixa não encontrada ou sem permissão para editar.",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
