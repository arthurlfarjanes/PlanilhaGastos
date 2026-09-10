require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Importação das Rotas
const authRoutes = require("./routes/authRoutes");
const categoriaRoutes = require("./routes/categoriaRoutes");
const transacaoRoutes = require("./routes/transacaoRoutes");
const gastosFixosRoutes = require("./routes/gastosFixosRoutes");

// Importação Cron
const { iniciarAgendador } = require("./services/agendador");

const app = express();
const port = process.env.PORT || 3001;

const FRONTEND_DEV_URL = process.env.FRONTEND_DEV_URL;
const FRONTEND_PROD_URL = process.env.FRONTEND_PROD_URL;

// Configuração CORS
const allowedOrigins = [FRONTEND_DEV_URL, FRONTEND_PROD_URL].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Bloqueado pela política de CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// Rota Raiz (Healthcheck)
app.get("/", (req, res) => {
  res.json({ message: "API MeFinance está online e funcionando!" });
});

// Registro de Rotas da Aplicação
app.use("/", authRoutes); // Registra /register, /login, /auth/google
app.use("/categorias", categoriaRoutes);
app.use("/transacoes", transacaoRoutes);
app.use("/gastos-fixos", gastosFixosRoutes);

// Inicia o serviço agendado de gastos fixos
iniciarAgendador();

app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
