const pool = require("../config/db");

// 1. Criar um novo gasto fixo
exports.criarGastoFixo = async (req, res) => {
  const { descricao, valor, dia_vencimento, categoria_id } = req.body;
  const userId = req.user.userId;

  // Validação simples de campos obrigatórios
  if (!descricao || !valor || !dia_vencimento) {
    return res.status(400).json({
      error: "Descrição, valor e dia de vencimento são obrigatórios.",
    });
  }

  try {
    const query = `
      INSERT INTO gastos_fixos (usuario_id, descricao, valor, dia_vencimento, categoria_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const valores = [
      userId,
      descricao,
      parseFloat(valor),
      parseInt(dia_vencimento),
      categoria_id || null,
    ];

    const result = await pool.query(query, valores);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar gasto fixo:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao criar gasto fixo." });
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
    console.error("Erro ao buscar gastos fixos:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao buscar gastos fixos." });
  }
};

// 3. Deletar um gasto fixo
exports.deletarGastoFixo = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      "DELETE FROM gastos_fixos WHERE id = $1 AND usuario_id = $2 RETURNING id",
      [id, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Gasto fixo não encontrado ou sem permissão para excluir.",
      });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Erro ao deletar gasto fixo:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao deletar gasto fixo." });
  }
};

// 4. Atualizar um gasto fixo
exports.atualizarGastoFixo = async (req, res) => {
  const { id } = req.params;
  const { descricao, valor, dia_vencimento, categoria_id } = req.body;
  const userId = req.user.userId;

  // Validação simples de campos obrigatórios
  if (!descricao || !valor || !dia_vencimento) {
    return res.status(400).json({
      error: "Descrição, valor e dia de vencimento são obrigatórios.",
    });
  }

  try {
    const query = `
      UPDATE gastos_fixos 
      SET descricao = $1, valor = $2, dia_vencimento = $3, categoria_id = $4
      WHERE id = $5 AND usuario_id = $6
      RETURNING *;
    `;
    const valores = [
      descricao,
      parseFloat(valor),
      parseInt(dia_vencimento),
      categoria_id || null,
      id,
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
    console.error("Erro ao atualizar gasto fixo:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao atualizar gasto fixo." });
  }
};
