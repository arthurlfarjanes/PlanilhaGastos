const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "965555033994-1q87unq29eedk92ru9coqhrduu4febpe.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Nome de usuário e senha são obrigatórios." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO usuarios (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword],
    );
    res.status(201).json({
      message: "Usuário registrado com sucesso!",
      user: result.rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Nome de usuário já existe." });
    }
    console.error("Erro ao registrar usuário:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao registrar usuário." });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Nome de usuário e senha são obrigatórios." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE username = $1",
      [username],
    );
    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return res.status(400).json({ error: "Credenciais inválidas." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Credenciais inválidas." });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    res.json({
      message: "Login bem-sucedido!",
      token,
      username: user.username,
    });
  } catch (err) {
    console.error("Erro ao fazer login:", err);
    res.status(500).json({ error: "Erro interno do servidor ao fazer login." });
  }
};

exports.googleAuth = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const picture = payload.picture;
    const baseUsername = email.split("@")[0];

    let userResult = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email],
    );
    let user = userResult.rows[0];

    if (!user) {
      const insertResult = await pool.query(
        "INSERT INTO usuarios (username, email) VALUES ($1, $2) RETURNING id, username, email",
        [baseUsername, email],
      );
      user = insertResult.rows[0];
    }

    const appToken = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" },
    );

    res.json({
      message: "Login com Google bem-sucedido!",
      token: appToken,
      username: user.username,
      picture: picture,
    });
  } catch (err) {
    console.error("Erro na autenticação com Google:", err);
    res.status(401).json({ error: "Falha ao autenticar com o Google." });
  }
};
