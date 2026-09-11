const pool = require("../config/db");

// 1. Criar um novo gasto fixo
exports.criarGastoFixo = async (req, res) => {
  const { descricao, valor, dia_vencimento, categoria_id } = req.body;
  const userId = req.user.userId;

  if (!descricao || valor === undefined || dia_vencimento === undefined) {
    return res.status(400).json({
      error: "Descrição, valor e dia de vencimento são obrigatórios.",
    });
  }

  const numValor = parseFloat(valor);
  if (isNaN(numValor) || numValor <= 0) {
    return res.status(400).json({ error: "O valor deve ser um número positivo." });
  }

  const diaVenc = parseInt(dia_vencimento);
  if (isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
    return res.status(400).json({ error: "O dia de vencimento deve estar entre 1 e 31." });
  }

  let finalCategoriaId = null;
  if (categoria_id) {
    const catIdNum = parseInt(categoria_id);
    if (isNaN(catIdNum)) {
      return res.status(400).json({ error: "ID de categoria inválido." });
    }

    // Validação de posse da categoria
    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
    }
    finalCategoriaId = catIdNum;
  }

  try {
    const query = `
      INSERT INTO gastos_fixos (usuario_id, descricao, valor, dia_vencimento, categoria_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const valores = [
      userId,
      descricao.toString().trim().substring(0, 100),
      numValor,
      diaVenc,
      finalCategoriaId,
    ];

    const result = await pool.query(query, valores);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar gasto fixo:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao criar gasto fixo." });
  }
};

// 2. Listar todos os gastos fixos do usuário logado
exports.listarGastosFixos = async (req, res) => {
  const userId = req.user.userId;

  try {
    const query = `
      SELECT gf.id, gf.descricao, gf.valor, gf.dia_vencimento, gf.categoria_id, 
             c.nome as categoria_nome, c.cor as categoria_cor
      FROM gastos_fixos gf
      LEFT JOIN categorias c ON gf.categoria_id = c.id
      WHERE gf.usuario_id = $1
      ORDER BY gf.dia_vencimento ASC;
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar gastos fixos:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao buscar gastos fixos." });
  }
};

// 3. Deletar um gasto fixo
exports.deletarGastoFixo = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const gastoId = parseInt(id);
  if (isNaN(gastoId)) {
    return res.status(400).json({ error: "ID de gasto fixo inválido." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM gastos_fixos WHERE id = $1 AND usuario_id = $2 RETURNING id",
      [gastoId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Gasto fixo não encontrado ou sem permissão para excluir.",
      });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Erro ao deletar gasto fixo:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao deletar gasto fixo." });
  }
};

// 4. Atualizar um gasto fixo
exports.atualizarGastoFixo = async (req, res) => {
  const { id } = req.params;
  const { descricao, valor, dia_vencimento, categoria_id } = req.body;
  const userId = req.user.userId;

  const gastoId = parseInt(id);
  if (isNaN(gastoId)) {
    return res.status(400).json({ error: "ID de gasto fixo inválido." });
  }

  if (!descricao || valor === undefined || dia_vencimento === undefined) {
    return res.status(400).json({
      error: "Descrição, valor e dia de vencimento são obrigatórios.",
    });
  }

  const numValor = parseFloat(valor);
  if (isNaN(numValor) || numValor <= 0) {
    return res.status(400).json({ error: "O valor deve ser um número positivo." });
  }

  const diaVenc = parseInt(dia_vencimento);
  if (isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
    return res.status(400).json({ error: "O dia de vencimento deve estar entre 1 e 31." });
  }

  let finalCategoriaId = null;
  if (categoria_id) {
    const catIdNum = parseInt(categoria_id);
    if (isNaN(catIdNum)) {
      return res.status(400).json({ error: "ID de categoria inválido." });
    }

    // Validação de posse da categoria
    const catCheck = await pool.query(
      "SELECT id FROM categorias WHERE id = $1 AND user_id = $2",
      [catIdNum, userId],
    );
    if (catCheck.rows.length === 0) {
      return res.status(403).json({ error: "Categoria inválida ou não autorizada." });
    }
    finalCategoriaId = catIdNum;
  }

  try {
    const query = `
      UPDATE gastos_fixos 
      SET descricao = $1, valor = $2, dia_vencimento = $3, categoria_id = $4
      WHERE id = $5 AND usuario_id = $6
      RETURNING *;
    `;
    const valores = [
      descricao.toString().trim().substring(0, 100),
      numValor,
      diaVenc,
      finalCategoriaId,
      gastoId,
      userId,
    ];

    const result = await pool.query(query, valores);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Gasto fixo não encontrado ou sem permissão para editar.",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar gasto fixo:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao atualizar gasto fixo." });
  }
};
