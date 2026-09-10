const pool = require("../config/db");

exports.listarCategorias = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM categorias WHERE user_id = $1 ORDER BY nome ASC",
      [req.user.userId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar categorias:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

exports.criarCategoria = async (req, res) => {
  const { nome, cor } = req.body;
  if (!nome) {
    return res
      .status(400)
      .json({ error: "O nome da categoria é obrigatório." });
  }
  try {
    const result = await pool.query(
      "INSERT INTO categorias (nome, cor, user_id) VALUES ($1, $2, $3) RETURNING *",
      [nome, cor || "#10b981", req.user.userId],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao adicionar categoria:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

exports.editarCategoria = async (req, res) => {
  const { id } = req.params;
  const { nome, cor } = req.body;
  if (!nome) {
    return res
      .status(400)
      .json({ error: "O nome da categoria é obrigatório." });
  }
  try {
    const result = await pool.query(
      "UPDATE categorias SET nome = $1, cor = $2 WHERE id = $3 AND user_id = $4 RETURNING *",
      [nome, cor || "#10b981", id, req.user.userId],
    );
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Categoria não encontrada ou não autorizada." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao editar categoria:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

exports.deletarCategoria = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM categorias WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.userId],
    );
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Categoria não encontrada ou não autorizada." });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Erro ao deletar categoria:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};
