const crypto = require("crypto");
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { logSystemEvent } = require("../utils/logger");
const {
  parseStrictPositiveInt,
  isValidUsername,
  isValidEmail,
  isValidPassword,
  isValidRole,
} = require("../utils/validation");

const isISODate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());

async function verifyAdminConfirmation(adminUserId, adminPassword) {
  if (!adminPassword || typeof adminPassword !== "string") {
    return { ok: false, status: 400, error: "Senha do administrador é obrigatória para esta ação." };
  }
  const currentUser = await pool.query(
    "SELECT password_hash FROM usuarios WHERE id = $1",
    [adminUserId],
  );
  const currentHash = currentUser.rows[0]?.password_hash;
  if (!currentHash) {
    return {
      ok: false,
      status: 403,
      error: "Sua conta não possui uma senha configurada (Login via Google). Crie uma senha antes de realizar ações de segurança.",
    };
  }
  const isPasswordValid = await bcrypt.compare(adminPassword, currentHash);
  if (!isPasswordValid) {
    return { ok: false, status: 403, error: "Senha de administrador incorreta." };
  }
  return { ok: true };
}

// Listar todos os usuários
exports.listarUsuarios = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, role, is_active FROM usuarios ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// Criar novo usuário (Admin)
exports.criarUsuario = async (req, res, next) => {
  const { username, email, password, role = "user" } = req.body;
  if (!isValidUsername(username)) {
    return res.status(400).json({
      error: "Username inválido. Use entre 3 e 30 caracteres (letras, números, '_' ou '-').",
    });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Email inválido." });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: "A senha deve ter entre 8 e 72 caracteres." });
  }
  if (!isValidRole(role)) {
    return res.status(400).json({ error: "Função (role) inválida. Use 'user' ou 'admin'." });
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const userExists = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1 OR username = $2",
      [cleanEmail, cleanUsername],
    );
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: "Username ou email já está em uso." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO usuarios (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role",
      [cleanUsername, cleanEmail, hashedPassword, role],
    );

    await logSystemEvent({
      message: `Admin criou usuário ID ${result.rows[0].id} (${result.rows[0].role}).`,
      route: "/admin/users",
      userId: req.user.userId,
      level: "info",
    });

    res.status(201).json({ message: "Usuário criado com sucesso", user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Editar Usuário
exports.editarUsuario = async (req, res, next) => {
  const targetId = parseStrictPositiveInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }

  const { username, email, role } = req.body;
  if (!isValidUsername(username)) {
    return res.status(400).json({
      error: "Username inválido. Use entre 3 e 30 caracteres (letras, números, '_' ou '-').",
    });
  }
  if (!isValidRole(role)) {
    return res.status(400).json({ error: "Função (role) inválida. Use 'user' ou 'admin'." });
  }

  const cleanUsername = username.trim();
  const cleanEmail = email === null || email === undefined || email === "" ? null : String(email).trim().toLowerCase();
  if (cleanEmail !== null && !isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: "Email inválido." });
  }

  try {
    const existingRes = await pool.query(
      "SELECT id, role FROM usuarios WHERE id = $1",
      [targetId],
    );
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (cleanEmail) {
      const emailUsed = await pool.query(
        "SELECT id FROM usuarios WHERE email = $1 AND id != $2",
        [cleanEmail, targetId],
      );
      if (emailUsed.rows.length > 0) {
        return res.status(409).json({ error: "Email já está em uso por outro usuário." });
      }
    }

    const usernameUsed = await pool.query(
      "SELECT id FROM usuarios WHERE username = $1 AND id != $2",
      [cleanUsername, targetId],
    );
    if (usernameUsed.rows.length > 0) {
      return res.status(409).json({ error: "Username já está em uso por outro usuário." });
    }

    const roleChanged = existingRes.rows[0].role !== role;
    const result = await pool.query(
      `UPDATE usuarios
       SET username = $1,
           email = $2,
           role = $3,
           token_version = CASE WHEN $4::boolean THEN token_version + 1 ELSE token_version END
       WHERE id = $5
       RETURNING id, username, email, role`,
      [cleanUsername, cleanEmail, role, roleChanged, targetId],
    );

    await logSystemEvent({
      message: `Admin editou usuário ID ${targetId} (role=${role}).`,
      route: `/admin/users/${targetId}`,
      userId: req.user.userId,
      level: "info",
    });

    res.json({ message: "Usuário atualizado com sucesso", user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Deletar Usuário
exports.deletarUsuario = async (req, res, next) => {
  const targetId = parseStrictPositiveInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }
  const { adminPassword } = req.body || {};

  if (targetId === req.user.userId) {
    return res.status(403).json({ error: "Você não pode deletar a sua própria conta." });
  }

  const client = await pool.connect();
  try {
    const targetUser = await client.query("SELECT id, role FROM usuarios WHERE id = $1", [targetId]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (targetUser.rows[0].role === "admin") {
      const check = await verifyAdminConfirmation(req.user.userId, adminPassword);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
    }

    await client.query("BEGIN");
    await client.query("DELETE FROM transacoes WHERE user_id = $1", [targetId]);
    await client.query("DELETE FROM usuarios WHERE id = $1", [targetId]);
    await client.query("COMMIT");

    await logSystemEvent({
      message: `Admin deletou usuário ID ${targetId}.`,
      route: `/admin/users/${targetId}`,
      userId: req.user.userId,
      level: "warning",
    });

    res.json({ message: "Usuário deletado com sucesso." });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// Ativar/Desativar usuário
exports.toggleStatusUsuario = async (req, res, next) => {
  const targetId = parseStrictPositiveInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }
  const { is_active, adminPassword } = req.body || {};

  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "Status 'is_active' deve ser booleano." });
  }

  if (targetId === req.user.userId && is_active === false) {
    return res.status(403).json({ error: "Você não pode desativar a sua própria conta." });
  }

  try {
    const targetUser = await pool.query("SELECT id, role FROM usuarios WHERE id = $1", [targetId]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (targetUser.rows[0].role === "admin") {
      const check = await verifyAdminConfirmation(req.user.userId, adminPassword);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET is_active = $1,
           token_version = CASE WHEN $1 = FALSE THEN token_version + 1 ELSE token_version END
       WHERE id = $2
       RETURNING id, username, is_active`,
      [is_active, targetId],
    );

    await logSystemEvent({
      message: `Admin alterou status do usuário ID ${targetId} para is_active=${is_active}.`,
      route: `/admin/users/${targetId}/status`,
      userId: req.user.userId,
      level: "warning",
    });

    res.json({ message: "Status atualizado com sucesso", user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Reset de senha (gera senha temporária CSPRNG e revoga tokens ativos)
exports.resetSenha = async (req, res, next) => {
  const targetId = parseStrictPositiveInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }
  const { adminPassword } = req.body || {};

  try {
    const targetUser = await pool.query("SELECT id, role FROM usuarios WHERE id = $1", [targetId]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (targetUser.rows[0].role === "admin") {
      const check = await verifyAdminConfirmation(req.user.userId, adminPassword);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
    }

    const newPassword = crypto.randomBytes(12).toString("base64url");
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const result = await pool.query(
      `UPDATE usuarios
       SET password_hash = $1, token_version = token_version + 1
       WHERE id = $2
       RETURNING id, username`,
      [hashedPassword, targetId],
    );

    await logSystemEvent({
      message: `Admin resetou a senha do usuário ID ${targetId}.`,
      route: `/admin/users/${targetId}/reset-password`,
      userId: req.user.userId,
      level: "warning",
    });

    res.json({
      message: "Senha redefinida com sucesso.",
      tempPassword: newPassword,
      user: result.rows[0].username,
    });
  } catch (err) {
    next(err);
  }
};

// Obter transações e dados de um usuário (Relatório)
exports.relatorioUsuario = async (req, res, next) => {
  const targetId = parseStrictPositiveInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }

  try {
    const transacoes = await pool.query(
      `SELECT t.id, t.descricao, t.valor, t.tipo, t.data::text, c.nome AS categoria_nome
       FROM transacoes t
       LEFT JOIN categorias c ON t.categoria_id = c.id AND c.user_id = t.user_id
       WHERE t.user_id = $1
       ORDER BY t.data DESC`,
      [targetId],
    );

    const balanco = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as total_receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as total_despesas
       FROM transacoes WHERE user_id = $1`,
      [targetId],
    );

    res.json({
      transacoes: transacoes.rows,
      resumo: {
        totalReceitas: parseFloat(balanco.rows[0].total_receitas),
        totalDespesas: parseFloat(balanco.rows[0].total_despesas),
        saldo: parseFloat(balanco.rows[0].total_receitas) - parseFloat(balanco.rows[0].total_despesas),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Obter os logs do sistema
exports.getSystemLogs = async (req, res, next) => {
  const { startDate, endDate, userId } = req.query;

  if (startDate && !isISODate(startDate)) {
    return res.status(400).json({ error: "Parâmetro startDate inválido." });
  }
  if (endDate && !isISODate(endDate)) {
    return res.status(400).json({ error: "Parâmetro endDate inválido." });
  }

  let parsedUserId = null;
  if (userId !== undefined && userId !== "") {
    parsedUserId = parseStrictPositiveInt(userId);
    if (!parsedUserId) {
      return res.status(400).json({ error: "Parâmetro userId inválido." });
    }
  }

  try {
    let query = `
      SELECT l.id, l.level, l.message, l.route, l.created_at, l.user_id, u.username
      FROM system_logs l
      LEFT JOIN usuarios u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      params.push(startDate.trim());
      query += ` AND l.created_at >= $${params.length}::date`;
    }

    if (endDate) {
      params.push(endDate.trim());
      query += ` AND l.created_at < ($${params.length}::date + INTERVAL '1 day')`;
    }

    if (parsedUserId) {
      params.push(parsedUserId);
      query += ` AND l.user_id = $${params.length}`;
    }

    query += ` ORDER BY l.created_at DESC LIMIT 500`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};
