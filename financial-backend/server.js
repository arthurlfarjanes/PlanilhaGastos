require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Importação das Rotas
const authRoutes = require("./routes/authRoutes");
const categoriaRoutes = require("./routes/categoriaRoutes");
const transacaoRoutes = require("./routes/transacaoRoutes");
const gastosFixosRoutes = require("./routes/gastosFixosRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Importação Cron
const { iniciarAgendador } = require("./services/agendador");

// Importação Middleware de Erro Centralizado
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const port = process.env.PORT || 3001;

// 0. Configura o Express para ler o IP real atrás do Proxy
app.set("trust proxy", 1);

// 1. Oculta cabeçalho de tecnologia e adiciona cabeçalhos defensivos (Helmet)
app.disable("x-powered-by");
app.use(helmet());

// 2. Limitador de taxa global para prevenção contra DoS e scraping abusivo
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // máximo de 300 requisições por IP a cada 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas requisições deste IP. Tente novamente mais tarde.",
  },
});
app.use(apiLimiter);

// 3. Limite no tamanho do Body JSON (Evita memory exhaustion / DoS por payloads massivos)
app.use(express.json({ limit: "20kb" }));

// 4. Configuração segura de CORS
const FRONTEND_DEV_URL = process.env.FRONTEND_DEV_URL;
const FRONTEND_PROD_URL = process.env.FRONTEND_PROD_URL;
const allowedOrigins = [FRONTEND_DEV_URL, FRONTEND_PROD_URL].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Bloqueado pela política de CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Rota Raiz (Healthcheck)
app.get("/", (req, res) => {
  res.json({ message: "API MeFinance está online e segura!" });
});

// Registro de Rotas da Aplicação
app.use("/", authRoutes); // Registra /register, /login, /auth/google
app.use("/categorias", categoriaRoutes);
app.use("/transacoes", transacaoRoutes);
app.use("/gastos-fixos", gastosFixosRoutes);
app.use("/admin", adminRoutes);

// 5. Middleware global de tratamento de erros 
app.use(errorHandler);

// Inicia o serviço agendado de gastos fixos
iniciarAgendador();

app.listen(port, () => {
  console.log(`Backend seguro rodando em http://localhost:${port}`);
});
