const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;

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

// Exporta o 'pool' para que outros arquivos possam usá-lo para fazer consultas no banco
module.exports = pool;
