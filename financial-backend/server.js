require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");
const { iniciarAgendador } = require("./services/agendador");

const port = process.env.PORT || 3001;

// Inicia o serviço agendado de gastos fixos
iniciarAgendador();

const server = app.listen(port, () => {
  console.log(`Backend seguro rodando em http://localhost:${port}`);
});

// Encerramento gracioso: para de aceitar requisições e fecha o pool do PostgreSQL
const shutdown = (signal) => {
  console.log(`${signal} recebido. Encerrando...`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
