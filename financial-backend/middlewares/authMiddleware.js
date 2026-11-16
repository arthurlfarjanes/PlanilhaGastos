const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { logSystemEvent } = require("../utils/logger");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = async (req, res, next) => {
  if (!JWT_SECRET) {
    return res.status(503).json({ error: "Serviço de autenticação indisponível." });
  }

  const authHeader = req.headers["authorization"];
  const bearerMatch =
    typeof authHeader === "string" ? authHeader.match(/^Bearer\s+(\S+)$/i) : null;
  const token = bearerMatch ? bearerMatch[1] : null;

  if (!token) {
    await logSystemEvent({
      message: "Tentativa de acesso negada: Token não fornecido.",
      route: req.originalUrl,
      level: "warning",
    });
    return res
      .status(401)
      .json({ error: "Token de autenticação não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRes = await pool.query(
      "SELECT id, username, role, is_active, token_version FROM usuarios WHERE id = $1",
      [decoded.userId],
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: "Sessão inválida ou expirada." });
    }

    const dbUser = userRes.rows[0];
    if (!dbUser.is_active) {
      return res.status(403).json({ error: "Esta conta está desativada." });
    }

    const tokenVersionClaim = decoded.tokenVersion ?? 1;
    if (tokenVersionClaim !== dbUser.token_version) {
      return res.status(401).json({ error: "Sessão revogada ou expirada. Faça login novamente." });
    }

    // Usa sempre identidade e role autoritativas do banco (nunca claims obsoletas)
    req.user = {
      userId: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      tokenVersion: dbUser.token_version,
    };
    next();
  } catch (err) {
    console.error("Erro ao verificar token:", err.message);
    await logSystemEvent({
      message: "Tentativa de acesso negada: Token inválido ou expirado.",
      route: req.originalUrl,
      level: "warning",
    });
    return res
      .status(403)
      .json({ error: "Token de autenticação inválido ou expirado." });
  }
};

module.exports = authenticateToken;
