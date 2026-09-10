const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res
      .status(401)
      .json({ error: "Token de autenticação não fornecido." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Erro ao verificar token:", err.message);
      return res
        .status(403)
        .json({ error: "Token de autenticação inválido ou expirado." });
    }
    req.user = user;
    next(); // O next() avisa o Express: "Pode continuar para a rota principal!"
  });
};

module.exports = authenticateToken;
