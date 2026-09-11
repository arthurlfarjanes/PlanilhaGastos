const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("ALERTA CRÍTICO: JWT_SECRET não está definido nas variáveis de ambiente.");
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Hash fictício pré-calculado com custo 12 para mitigar timing attacks no login
const DUMMY_HASH = "$2a$12$e8Y5t1P5cKzE9nKxN4nNhe0d2gA.N9Fp8rE9a4qP5e5d1gA2b3c4e";

exports.register = async (req, res) => {
  const { username, password } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Nome de usuário é obrigatório." });
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
    return res.status(400).json({ error: "O nome de usuário deve ter entre 3 e 30 caracteres." });
  }

  // Permitir apenas caracteres seguros (evita caracteres de controle, quebras de linha ou injeções)
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
    return res.status(400).json({ error: "O nome de usuário deve conter apenas letras, números, '_' ou '-'." });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Senha é obrigatória." });
  }

  // Proteção contra DoS no Bcrypt e imposição de complexidade mínima
  if (password.length < 8 || password.length > 72) {
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
    console.error("Erro ao registrar usuário:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao registrar usuário." });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || typeof username !== "string" || typeof password !== "string" || password.length > 72) {
    return res.status(400).json({ error: "Credenciais inválidas." });
  }

  const trimmedUsername = username.trim();

  try {
    const result = await pool.query(
      "SELECT id, username, password_hash FROM usuarios WHERE username = $1",
      [trimmedUsername],
    );
    const user = result.rows[0];

    // Mitigação contra Timing Attacks (enumeração de contas válidas via tempo de resposta)
    if (!user || !user.password_hash) {
      await bcrypt.compare("fake_pass", DUMMY_HASH);
      return res.status(400).json({ error: "Credenciais inválidas." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Credenciais inválidas." });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "2h" },
    );

    res.json({
      message: "Login bem-sucedido!",
      token,
      username: user.username,
    });
  } catch (err) {
    console.error("Erro ao fazer login:", err.message);
    res.status(500).json({ error: "Erro interno do servidor ao fazer login." });
  }
};

exports.googleAuth = async (req, res) => {
  const { token } = req.body;
  if (!token) {
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
      "SELECT id, username, email FROM usuarios WHERE email = $1",
      [email],
    );
    let user = userResult.rows[0];

    if (!user) {
      // Se já existir alguém com esse username base, adiciona sufixo aleatório para evitar colisão
      let finalUsername = baseUsername;
      const existingUser = await pool.query("SELECT id FROM usuarios WHERE username = $1", [finalUsername]);
      if (existingUser.rows.length > 0) {
        finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const insertResult = await pool.query(
        "INSERT INTO usuarios (username, email) VALUES ($1, $2) RETURNING id, username, email",
        [finalUsername, email],
      );
      user = insertResult.rows[0];
    }

    const appToken = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "2h" },
    );

    res.json({
      message: "Login com Google bem-sucedido!",
      token: appToken,
      username: user.username,
      picture: picture,
    });
  } catch (err) {
    console.error("Erro na autenticação com Google:", err.message);
    res.status(401).json({ error: "Falha ao autenticar com o Google." });
  }
};

