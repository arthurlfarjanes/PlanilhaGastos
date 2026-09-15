const pool = require("../config/db");

// Validador de cor hexadecimal (#RGB ou #RRGGBB)
const isValidHexColor = (color) => {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
};

exports.listarCategorias = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, nome, cor FROM categorias WHERE user_id = $1 ORDER BY nome ASC",
      [req.user.userId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.criarCategoria = async (req, res, next) => {
  const { nome, cor } = req.body;

  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ error: "O nome da categoria é obrigatório." });
  }

  const cleanNome = nome.trim().substring(0, 50);
  const cleanCor = cor && isValidHexColor(cor) ? cor : "#10b981";

  try {
    const result = await pool.query(
      "INSERT INTO categorias (nome, cor, user_id) VALUES ($1, $2, $3) RETURNING id, nome, cor",
      [cleanNome, cleanCor, req.user.userId],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.editarCategoria = async (req, res, next) => {
  const { id } = req.params;
  const { nome, cor } = req.body;

  const catId = parseInt(id);
  if (isNaN(catId)) {
    return res.status(400).json({ error: "ID de categoria inválido." });
  }

  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ error: "O nome da categoria é obrigatório." });
  }

  const cleanNome = nome.trim().substring(0, 50);
  const cleanCor = cor && isValidHexColor(cor) ? cor : "#10b981";

  try {
    const result = await pool.query(
      "UPDATE categorias SET nome = $1, cor = $2 WHERE id = $3 AND user_id = $4 RETURNING id, nome, cor",
      [cleanNome, cleanCor, catId, req.user.userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Categoria não encontrada ou não autorizada." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deletarCategoria = async (req, res, next) => {
  const { id } = req.params;

  const catId = parseInt(id);
  if (isNaN(catId)) {
    return res.status(400).json({ error: "ID de categoria inválido." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM categorias WHERE id = $1 AND user_id = $2 RETURNING id",
      [catId, req.user.userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Categoria não encontrada ou não autorizada." });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
