const pool = require("../config/db");
const { validatePatch, withDefaults } = require("../utils/preferencias");

// O user_id vem SEMPRE do JWT (req.user.userId), nunca do corpo/URL.

exports.obterPreferencias = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT preferences FROM user_preferences WHERE user_id = $1",
      [req.user.userId],
    );
    res.json(withDefaults(result.rows[0]?.preferences));
  } catch (err) {
    next(err);
  }
};

exports.atualizarPreferencias = async (req, res, next) => {
  const { error, value } = validatePatch(req.body);
  if (error) return res.status(400).json({ error });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Garante a linha e a trava para o merge por seção (evita perda de updates concorrentes).
    await client.query(
      "INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
      [req.user.userId],
    );
    const current = await client.query(
      "SELECT preferences FROM user_preferences WHERE user_id = $1 FOR UPDATE",
      [req.user.userId],
    );
    const stored = current.rows[0].preferences || {};
    const merged = { ...stored };
    for (const [section, fields] of Object.entries(value)) {
      merged[section] = { ...(stored[section] || {}), ...fields };
    }
    await client.query(
      "UPDATE user_preferences SET preferences = $2::jsonb, updated_at = NOW() WHERE user_id = $1",
      [req.user.userId, JSON.stringify(merged)],
    );
    await client.query("COMMIT");
    res.json(withDefaults(merged));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

exports.restaurarPadroes = async (req, res, next) => {
  try {
    await pool.query("DELETE FROM user_preferences WHERE user_id = $1", [req.user.userId]);
    res.json(withDefaults(null));
  } catch (err) {
    next(err);
  }
};
