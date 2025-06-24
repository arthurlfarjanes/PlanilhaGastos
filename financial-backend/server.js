// controle-gastos-backend/server.js
require('dotenv').config(); // Carrega as variáveis de ambiente do .env
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs'); // Importa bcryptjs
const jwt = require('jsonwebtoken'); // Importa jsonwebtoken

const app = express();
const port = process.env.PORT || 3001;

// Variáveis de ambiente importantes
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_padrao_muito_segura'; // Use uma chave forte em produção!
const DATABASE_URL = process.env.DATABASE_URL;

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Testar a conexão com o banco de dados
pool.connect()
  .then(client => {
    console.log("Conectado ao PostgreSQL!");
    client.release();
  })
  .catch(err => {
    console.error("Erro ao conectar ao PostgreSQL:", err.message || err);
    process.exit(1); // Encerra a aplicação se não conseguir conectar ao DB
  });

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Middleware de Autenticação JWT ---
// Esta função será usada para proteger as rotas que exigem login
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Espera "Bearer TOKEN"

  if (token == null) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Erro ao verificar token:", err.message);
      return res.status(403).json({ error: 'Token de autenticação inválido ou expirado.' });
    }
    req.user = user; // Adiciona as informações do usuário (ID) ao objeto de requisição
    next(); // Continua para a próxima função da rota
  });
};

// --- Rotas de Autenticação ---

// Rota de Registro de Usuário
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Criptografa a senha
    const result = await pool.query(
      'INSERT INTO usuarios (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );
    res.status(201).json({ message: 'Usuário registrado com sucesso!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // Código para violação de chave única (username já existe)
      return res.status(409).json({ error: 'Nome de usuário já existe.' });
    }
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor ao registrar usuário.' });
  }
});

// Rota de Login de Usuário
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    // Se as credenciais forem válidas, gera um JWT
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login bem-sucedido!', token });
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).json({ error: 'Erro interno do servidor ao fazer login.' });
  }
});

// --- Rotas de Transações (Protegidas) ---
// Todas as rotas abaixo usarão o middleware authenticateToken
app.use('/transacoes', authenticateToken); // Protege todas as rotas que começam com /transacoes

// 1. Obter todas as transações (receitas e despesas) do usuário logado
app.get('/transacoes', async (req, res) => {
  const userId = req.user.userId; // Obtém o ID do usuário do token
  try {
    const result = await pool.query(
      'SELECT id, descricao, valor, tipo, data::text FROM transacoes WHERE user_id = $1 ORDER BY data DESC, id DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar transações:', err);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar transações.' });
  }
});

// 2. Adicionar uma nova transação (receita ou despesa)
app.post('/transacoes', async (req, res) => {
  const { descricao, valor, tipo, data } = req.body; // 'tipo' pode ser 'receita' ou 'despesa'
  const userId = req.user.userId;

  if (!descricao || !valor || !tipo || !data) {
    return res.status(400).json({ error: 'Todos os campos (descrição, valor, tipo, data) são obrigatórios.' });
  }
  if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
    return res.status(400).json({ error: 'O valor deve ser um número positivo.' });
  }
  if (!['receita', 'despesa'].includes(tipo)) {
    return res.status(400).json({ error: 'O tipo deve ser "receita" ou "despesa".' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO transacoes (user_id, descricao, valor, tipo, data) VALUES ($1, $2, $3, $4, $5) RETURNING id, descricao, valor, tipo, data::text',
      [userId, descricao, parseFloat(valor), tipo, data]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao adicionar transação:', err);
    res.status(500).json({ error: 'Erro interno do servidor ao adicionar transação.' });
  }
});

// 3. Deletar uma transação
app.delete('/transacoes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    // Garante que o usuário só pode deletar suas próprias transações
    const result = await pool.query('DELETE FROM transacoes WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transação não encontrada ou você não tem permissão para deletá-la.' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar transação:', err);
    res.status(500).json({ error: 'Erro interno do servidor ao deletar transação.' });
  }
});

// 4. Obter o comparativo de receitas e despesas por usuário
app.get('/transacoes/comparativo', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const receitasResult = await pool.query(
            'SELECT SUM(valor) AS total_receitas FROM transacoes WHERE user_id = $1 AND tipo = \'receita\'',
            [userId]
        );
        const despesasResult = await pool.query(
            'SELECT SUM(valor) AS total_despesas FROM transacoes WHERE user_id = $1 AND tipo = \'despesa\'',
            [userId]
        );

        const totalReceitas = parseFloat(receitasResult.rows[0].total_receitas || 0);
        const totalDespesas = parseFloat(despesasResult.rows[0].total_despesas || 0);
        const balanco = totalReceitas - totalDespesas;

        res.json({
            totalReceitas: totalReceitas.toFixed(2),
            totalDespesas: totalDespesas.toFixed(2),
            balanco: balanco.toFixed(2)
        });
    } catch (err) {
        console.error('Erro ao obter comparativo:', err);
        res.status(500).json({ error: 'Erro interno do servidor ao obter comparativo.' });
    }
});


// --- Iniciar o Servidor ---
app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});