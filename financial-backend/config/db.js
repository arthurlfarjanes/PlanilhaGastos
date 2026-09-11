const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ALERTA CRÍTICO: A variável de ambiente DATABASE_URL não está configurada.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20, // Limite máximo de conexões simultâneas no pool
  idleTimeoutMillis: 30000, // Fecha conexões inativas após 30 segundos
  connectionTimeoutMillis: 5000, // Timeout de 5 segundos para tentar obter conexão
});

// Tratamento de erros inesperados em conexões ociosas do pool para evitar que o Node quebre
pool.on("error", (err) => {
  console.error("Erro inesperado no cliente ocioso do PostgreSQL:", err.message);
});

// Teste inicial de conexão
pool
  .connect()
  .then((client) => {
    console.log("Conectado ao PostgreSQL (Neon) com sucesso!");
    client.release();
  })
  .catch((err) => {
    console.error("Erro ao conectar ao PostgreSQL:", err.message || err);
    process.exit(1);
  });

module.exports = pool;

