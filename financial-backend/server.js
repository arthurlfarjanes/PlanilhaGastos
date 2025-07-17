// controle-gastos-backend/server.js
require("dotenv").config(); // Carrega as variáveis de ambiente do .env
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs"); // Importa bcryptjs
const jwt = require("jsonwebtoken"); // Importa jsonwebtoken

const app = express();
const port = process.env.PORT || 3001;

// Variáveis de ambiente importantes
const JWT_SECRET =
  process.env.JWT_SECRET || "sua_chave_secreta_padrao_muito_segura"; // Use uma chave forte em produção!
const DATABASE_URL = process.env.DATABASE_URL;

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Testar a conexão com o banco de dados
pool
  .connect()
  .then((client) => {
    console.log("Conectado ao PostgreSQL!");
    client.release();
  })
  .catch((err) => {
    console.error("Erro ao conectar ao PostgreSQL:", err.message || err);
    process.exit(1); // Encerra a aplicação se não conseguir conectar ao DB
  });

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Middleware de Autenticação JWT ---
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
    next();
  });
};

// --- Rotas de Autenticação ---
app.post("/register", async (req, res) => {
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
      [username, hashedPassword]
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
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Nome de usuário e senha são obrigatórios." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE username = $1",
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "Credenciais inválidas." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Credenciais inválidas." });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
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
});

// --- Rotas de Transações (Protegidas) ---
app.use("/transacoes", authenticateToken);

app.get("/transacoes", async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      "SELECT id, descricao, valor, tipo, data::text, categoria FROM transacoes WHERE user_id = $1 ORDER BY data DESC, id DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar transações:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao buscar transações." });
  }
});

app.post("/transacoes", async (req, res) => {
  const { descricao, valor, tipo, data, categoria } = req.body;
  const userId = req.user.userId;

  if (!descricao || !valor || !tipo || !data) {
    return res.status(400).json({
      error: "Todos os campos (descrição, valor, tipo, data) são obrigatórios.",
    });
  }
  if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
    return res
      .status(400)
      .json({ error: "O valor deve ser um número positivo." });
  }
  if (!["receita", "despesa"].includes(tipo)) {
    return res
      .status(400)
      .json({ error: 'O tipo deve ser "receita" ou "despesa".' });
  }
  // Se for despesa, a categoria é obrigatória
  if (tipo === "despesa" && !categoria) {
    return res
      .status(400)
      .json({ error: "A categoria é obrigatória para despesas." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, descricao, valor, tipo, data::text, categoria",
      [
        userId,
        descricao,
        parseFloat(valor),
        tipo,
        data,
        tipo === "despesa" ? categoria : null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao adicionar transação:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao adicionar transação." });
  }
});

// Nova rota para compras parceladas
app.post("/transacoes/parcelada", async (req, res) => {
  const { descricao, valor, categoria, data, parcelas } = req.body;
  const userId = req.user.userId;

  if (!descricao || !valor || !categoria || !data || !parcelas) {
    return res.status(400).json({
      error: "Todos os campos são obrigatórios para compra parcelada.",
    });
  }
  if (isNaN(parseInt(parcelas)) || parseInt(parcelas) <= 0) {
    return res
      .status(400)
      .json({ error: "O número de parcelas deve ser um inteiro positivo." });
  }

  const valorParcela = parseFloat(valor) / parseInt(parcelas);
  const dataInicial = new Date(data + "T00:00:00Z"); // Adiciona T00:00:00Z para evitar problemas com fuso horário

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const insertedTransactions = [];
      for (let i = 1; i <= parcelas; i++) {
        const dataParcela = new Date(dataInicial);
        dataParcela.setUTCMonth(dataInicial.getUTCMonth() + (i - 1));

        const descricaoParcela = `${descricao} (${i}/${parcelas})`;

        const result = await client.query(
          "INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
          [
            userId,
            descricaoParcela,
            valorParcela.toFixed(2),
            "despesa",
            dataParcela.toISOString().split("T")[0],
            categoria,
          ]
        );
        insertedTransactions.push(result.rows[0]);
      }
      await client.query("COMMIT");
      res.status(201).json({
        message: "Compra parcelada registrada com sucesso!",
        transacoes: insertedTransactions,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Erro ao adicionar compra parcelada:", err);
    res.status(500).json({
      error: "Erro interno do servidor ao adicionar compra parcelada.",
    });
  }
});

app.delete("/transacoes/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      "DELETE FROM transacoes WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({
        error:
          "Transação não encontrada ou você não tem permissão para deletá-la.",
      });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Erro ao deletar transação:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao deletar transação." });
  }
});

app.get("/transacoes/comparativo", async (req, res) => {
  const userId = req.user.userId;
  try {
    // Balanço geral
    const receitasResult = await pool.query(
      "SELECT SUM(valor) AS total_receitas FROM transacoes WHERE user_id = $1 AND tipo = 'receita'",
      [userId]
    );
    const despesasResult = await pool.query(
      "SELECT SUM(valor) AS total_despesas FROM transacoes WHERE user_id = $1 AND tipo = 'despesa'",
      [userId]
    );

    // Dados para o gráfico de pizza
    const categoriasResult = await pool.query(
      "SELECT categoria, SUM(valor) as total FROM transacoes WHERE user_id = $1 AND tipo = 'despesa' AND categoria IS NOT NULL GROUP BY categoria",
      [userId]
    );

    const totalReceitas = parseFloat(
      receitasResult.rows[0].total_receitas || 0
    );
    const totalDespesas = parseFloat(
      despesasResult.rows[0].total_despesas || 0
    );
    const balanco = totalReceitas - totalDespesas;

    res.json({
      totalReceitas: totalReceitas.toFixed(2),
      totalDespesas: totalDespesas.toFixed(2),
      balanco: balanco.toFixed(2),
      gastosPorCategoria: categoriasResult.rows.map((row) => ({
        name: row.categoria,
        value: parseFloat(row.total),
      })),
    });
  } catch (err) {
    console.error("Erro ao obter comparativo:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao obter comparativo." });
  }
});

app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
