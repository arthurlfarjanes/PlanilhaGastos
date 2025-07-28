// controle-gastos-backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 3001;

const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
// const FRONTEND_DEV_URL = process.env.FRONTEND_DEV_URL;
const FRONTEND_PROD_URL = process.env.FRONTEND_PROD_URL;

if (!JWT_SECRET || !DATABASE_URL || !FRONTEND_PROD_URL) {
  console.error(
    "ERRO: Variáveis de ambiente essenciais (JWT_SECRET, DATABASE_URL, FRONTEND_URL) não estão definidas."
  );
}

const corsOptions = {
  // origin: FRONTEND_DEV_URL,
  origin: FRONTEND_PROD_URL,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API MeFinance está online e funcionando!" });
});

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool
  .connect()
  .then((client) => {
    console.log("Conectado ao PostgreSQL!");
    client.release();
  })
  .catch((err) => {
    console.error("Erro ao conectar ao PostgreSQL:", err.message || err);
    process.exit(1);
  });

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

// --- Rotas de Categorias (COM ATUALIZAÇÃO) ---
app.use("/categorias", authenticateToken);

app.get("/categorias", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM categorias WHERE user_id = $1 ORDER BY nome ASC",
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar categorias:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

app.post("/categorias", async (req, res) => {
  const { nome } = req.body;
  if (!nome) {
    return res
      .status(400)
      .json({ error: "O nome da categoria é obrigatório." });
  }
  try {
    const result = await pool.query(
      "INSERT INTO categorias (nome, user_id) VALUES ($1, $2) RETURNING *",
      [nome, req.user.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao adicionar categoria:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// **NOVA ROTA PARA EDITAR CATEGORIA**
app.put("/categorias/:id", async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;
  if (!nome) {
    return res
      .status(400)
      .json({ error: "O nome da categoria é obrigatório." });
  }
  try {
    const result = await pool.query(
      "UPDATE categorias SET nome = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [nome, id, req.user.userId]
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
});

app.delete("/categorias/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM categorias WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.userId]
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
});

// --- Rotas de Transações ---
app.use("/transacoes", authenticateToken);

app.get("/transacoes", async (req, res) => {
  const userId = req.user.userId;
  const { tipo, categoriaId, dataInicio, dataFim, descricao } = req.query;

  let query = `
        SELECT t.id, t.descricao, t.valor, t.tipo, t.data::text, t.categoria_id, c.nome as categoria_nome
        FROM transacoes t
        LEFT JOIN categorias c ON t.categoria_id = c.id
        WHERE t.user_id = $1
    `;
  const params = [userId];
  let paramIndex = 2;

  if (tipo) {
    query += ` AND t.tipo = $${paramIndex++}`;
    params.push(tipo);
  }
  if (categoriaId) {
    query += ` AND t.categoria_id = $${paramIndex++}`;
    params.push(categoriaId);
  }
  if (dataInicio) {
    query += ` AND t.data >= $${paramIndex++}`;
    params.push(dataInicio);
  }
  if (dataFim) {
    query += ` AND t.data <= $${paramIndex++}`;
    params.push(dataFim);
  }
  if (descricao) {
    query += ` AND t.descricao ILIKE $${paramIndex++}`;
    params.push(`%${descricao}%`);
  }

  query += " ORDER BY t.data DESC, t.id DESC";

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar transações:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

app.post("/transacoes", async (req, res) => {
  const { descricao, valor, tipo, data, categoria_id } = req.body;
  const userId = req.user.userId;

  if (!descricao || !valor || !tipo || !data) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }
  if (tipo === "despesa" && !categoria_id) {
    return res
      .status(400)
      .json({ error: "Categoria é obrigatória para despesas." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        userId,
        descricao,
        parseFloat(valor),
        tipo,
        data,
        tipo === "despesa" ? categoria_id : null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao adicionar transação:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

app.post("/transacoes/parcelada", authenticateToken, async (req, res) => {
  const { descricao, valor, categoria_id, data, parcelas } = req.body;
  const userId = req.user.userId;

  if (!descricao || !valor || !categoria_id || !data || !parcelas) {
    return res.status(400).json({
      error: "Todos os campos são obrigatórios para compra parcelada.",
    });
  }
  if (isNaN(parseInt(parcelas)) || parseInt(parcelas) <= 1) {
    return res
      .status(400)
      .json({ error: "O número de parcelas deve ser maior que 1." });
  }

  const valorParcela = parseFloat(valor) / parseInt(parcelas);
  const dataInicial = new Date(data + "T00:00:00Z");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertedTransactions = [];
    for (let i = 1; i <= parcelas; i++) {
      const dataParcela = new Date(dataInicial);
      dataParcela.setUTCMonth(dataInicial.getUTCMonth() + (i - 1));

      const descricaoParcela = `${descricao} (${i}/${parcelas})`;

      const result = await client.query(
        "INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [
          userId,
          descricaoParcela,
          valorParcela.toFixed(2),
          "despesa",
          dataParcela.toISOString().split("T")[0],
          categoria_id,
        ]
      );
      insertedTransactions.push(result.rows[0]);
    }
    await client.query("COMMIT");
    res.status(201).json({
      message: "Compra parcelada registrada com sucesso!",
      transacoes: insertedTransactions,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao adicionar compra parcelada:", err);
    res.status(500).json({
      error: "Erro interno do servidor ao adicionar compra parcelada.",
    });
  } finally {
    client.release();
  }
});

app.put("/transacoes/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { descricao, valor, tipo, data, categoria_id } = req.body;
  const userId = req.user.userId;

  if (!descricao || !valor || !tipo || !data) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    await pool.query(
      `UPDATE transacoes SET
                descricao = $1,
                valor = $2,
                tipo = $3,
                data = $4,
                categoria_id = $5
             WHERE id = $6 AND user_id = $7`,
      [
        descricao,
        parseFloat(valor),
        tipo,
        data,
        tipo === "despesa" ? categoria_id : null,
        id,
        userId,
      ]
    );

    const updatedResult = await pool.query(
      `SELECT t.id, t.descricao, t.valor, t.tipo, t.data::text, t.categoria_id, c.nome as categoria_nome
              FROM transacoes t
              LEFT JOIN categorias c ON t.categoria_id = c.id
              WHERE t.id = $1`,
      [id]
    );

    if (updatedResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Transação não encontrada ou não autorizada." });
    }

    res.json(updatedResult.rows[0]);
  } catch (err) {
    console.error("Erro ao editar transação:", err);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao editar transação." });
  }
});

app.delete("/transacoes/:id", authenticateToken, async (req, res) => {
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

// ROTA ATUALIZADA
app.get("/transacoes/comparativo", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { dataInicio, dataFim } = req.query;

  // Monta a base da query e os parâmetros iniciais
  let queryReceitas =
    "SELECT SUM(valor) AS total_receitas FROM transacoes WHERE user_id = $1 AND tipo = 'receita'";
  let queryDespesas =
    "SELECT SUM(valor) AS total_despesas FROM transacoes WHERE user_id = $1 AND tipo = 'despesa'";
  let queryCategorias = `
        SELECT c.nome, SUM(t.valor) as total
        FROM transacoes t
        JOIN categorias c ON t.categoria_id = c.id
        WHERE t.user_id = $1 AND t.tipo = 'despesa'
    `;
  const params = [userId];
  let paramIndex = 2;

  // Adiciona o filtro de data se os parâmetros existirem
  if (dataInicio && dataFim) {
    const dateFilter = ` AND data BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    queryReceitas += dateFilter;
    queryDespesas += dateFilter;
    queryCategorias += dateFilter;
    params.push(dataInicio, dataFim);
  }

  queryCategorias += " GROUP BY c.nome";

  try {
    const receitasResult = await pool.query(queryReceitas, params);
    const despesasResult = await pool.query(queryDespesas, params);
    const categoriasResult = await pool.query(queryCategorias, params);

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
        name: row.nome,
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