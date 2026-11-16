const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../config/db");
const { logSystemEvent } = require("../utils/logger");
const { isValidUsername, isValidPassword } = require("../utils/validation");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("ALERTA CRÍTICO: JWT_SECRET não está definido nas variáveis de ambiente.");
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Hash fictício pré-calculado com custo 12 para mitigar timing attacks no login
const DUMMY_HASH = "$2a$12$e8Y5t1P5cKzE9nKxN4nNhe0d2gA.N9Fp8rE9a4qP5e5d1gA2b3c4e";

function signUserToken(user) {
  if (!JWT_SECRET) {
    const err = new Error("Serviço de autenticação indisponível.");
    err.status = 503;
    throw err;
  }
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.token_version ?? 1,
    },
    JWT_SECRET,
    { expiresIn: "2h" },
  );
}

exports.me = async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    userId: req.user.userId,
    username: req.user.username,
    role: req.user.role,
  });
};

exports.register = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Nome de usuário é obrigatório." });
  }

  const trimmedUsername = username.trim();
  if (!isValidUsername(trimmedUsername)) {
    return res.status(400).json({
      error: "O nome de usuário deve ter entre 3 e 30 caracteres (apenas letras, números, '_' ou '-').",
    });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Senha é obrigatória." });
  }

  // Proteção contra DoS no Bcrypt e imposição de complexidade mínima
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: "A senha deve ter entre 8 e 72 caracteres." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO usuarios (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [trimmedUsername, hashedPassword],
    );
    res.status(201).json({
      message: "Usuário registrado com sucesso!",
      user: result.rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Nome de usuário já existe." });
    }
    next(err); // Repassa erro para o errorHandler
  }
};

exports.login = async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password || typeof username !== "string" || typeof password !== "string" || password.length > 72) {
    return res.status(400).json({ error: "Credenciais inválidas." });
  }

  const trimmedUsername = username.trim();

  try {
    const result = await pool.query(
      "SELECT id, username, password_hash, role, is_active, token_version FROM usuarios WHERE username = $1",
      [trimmedUsername],
    );
    const user = result.rows[0];

    // Mitigação contra Timing Attacks (enumeração de contas válidas via tempo de resposta)
    if (!user || !user.password_hash) {
      await bcrypt.compare("fake_pass", DUMMY_HASH);
      await logSystemEvent({
        message: `Tentativa de login falha (Usuário não existe): ${trimmedUsername}`,
        route: "/login",
        level: "warning",
      });
      return res.status(400).json({ error: "Credenciais inválidas." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await logSystemEvent({
        message: `Tentativa de login falha (Senha incorreta): ${user.username}`,
        route: "/login",
        userId: user.id,
        level: "warning",
      });
      return res.status(400).json({ error: "Credenciais inválidas." });
    }

    if (!user.is_active) {
      await logSystemEvent({
        message: `Tentativa de login em conta desativada: ${user.username}`,
        route: "/login",
        userId: user.id,
        level: "warning",
      });
      return res.status(403).json({ error: "Esta conta está desativada. Entre em contato com o suporte." });
    }

    const token = signUserToken(user);

    res.json({
      message: "Login bem-sucedido!",
      token,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
};

exports.googleAuth = async (req, res, next) => {
  const { token } = req.body;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token de autenticação é obrigatório." });
  }

  if (!googleClient) {
    console.error("Autenticação Google indisponível: GOOGLE_CLIENT_ID não configurado.");
    return res.status(503).json({ error: "Autenticação via Google temporariamente indisponível." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Verificação estrita de e-mail verificado pelo Google (evita Account Takeover)
    if (!payload.email_verified) {
      return res.status(403).json({ error: "O endereço de e-mail do Google não foi verificado." });
    }

    const email = payload.email;
    const picture = payload.picture;
    const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 20) || "usuario";

    let userResult = await pool.query(
      "SELECT id, username, email, role, is_active, token_version FROM usuarios WHERE email = $1",
      [email],
    );
    let user = userResult.rows[0];

    if (!user) {
      // Se já existir alguém com esse username base, adiciona sufixo CSPRNG para evitar colisão
      let finalUsername = baseUsername;
      const existingUser = await pool.query("SELECT id FROM usuarios WHERE username = $1", [finalUsername]);
      if (existingUser.rows.length > 0) {
        finalUsername = `${baseUsername}_${crypto.randomInt(1000, 10000)}`;
      }

      const insertResult = await pool.query(
        "INSERT INTO usuarios (username, email) VALUES ($1, $2) RETURNING id, username, email, role, is_active, token_version",
        [finalUsername, email],
      );
      user = insertResult.rows[0];
    }

    if (!user.is_active) {
      await logSystemEvent({
        message: `Tentativa de login Google em conta desativada: ${user.email}`,
        route: "/auth/google",
        userId: user.id,
        level: "warning",
      });
      return res.status(403).json({ error: "Esta conta está desativada. Entre em contato com o suporte." });
    }

    const appToken = signUserToken(user);

    res.json({
      message: "Login com Google bem-sucedido!",
      token: appToken,
      username: user.username,
      picture: picture,
      role: user.role,
    });
  } catch (err) {
    console.error("Falha na verificação do token Google:", err.message);
    return res.status(401).json({ error: "Falha ao autenticar com o Google." });
  }
};

// Trocar senha (usuário logado) — incrementa token_version para revogar sessões antigas
exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: "A nova senha deve ter entre 8 e 72 caracteres." });
  }

  try {
    const result = await pool.query(
      "SELECT id, username, role, password_hash FROM usuarios WHERE id = $1",
      [userId],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado." });
    const currentUser = result.rows[0];

    // Só exige e verifica a senha atual se o usuário já tiver uma configurada
    if (currentUser.password_hash) {
      if (!currentPassword || typeof currentPassword !== "string") {
        return res.status(400).json({ error: "A senha atual é obrigatória." });
      }
      const isMatch = await bcrypt.compare(currentPassword, currentUser.password_hash);
      if (!isMatch) return res.status(403).json({ error: "Senha atual incorreta." });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    const upd = await pool.query(
      `UPDATE usuarios
       SET password_hash = $1, token_version = token_version + 1
       WHERE id = $2
       RETURNING id, username, role, token_version`,
      [hashedNewPassword, userId],
    );

    const newToken = signUserToken(upd.rows[0]);
    res.json({ message: "Senha alterada com sucesso.", token: newToken });
  } catch (err) {
    next(err);
  }
};
