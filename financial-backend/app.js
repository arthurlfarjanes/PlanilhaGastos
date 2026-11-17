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
const preferenciasRoutes = require("./routes/preferenciasRoutes");
const orcamentosRoutes = require("./routes/orcamentosRoutes");
const dividasRoutes = require("./routes/dividasRoutes");
const cartoesRoutes = require("./routes/cartoesRoutes");
const patrimonioRoutes = require("./routes/patrimonioRoutes");
const objetivosRoutes = require("./routes/objetivosRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificacoesRoutes = require("./routes/notificacoesRoutes");
const iaRoutes = require("./routes/iaRoutes");
const inteligenciaRoutes = require("./routes/inteligenciaRoutes");
const planejamentoRoutes = require("./routes/planejamentoRoutes");
const relatoriosRoutes = require("./routes/relatoriosRoutes");
const privacidadeRoutes = require("./routes/privacidadeRoutes");

// Importação Middleware de Erro Centralizado
const errorHandler = require("./middlewares/errorHandler");

const app = express();

if (!process.env.JWT_SECRET) {
  console.error("ALERTA CRÍTICO: JWT_SECRET não está definido nas variáveis de ambiente.");
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

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
app.use("/", authRoutes); // Registra /register, /login, /auth/google, /me
app.use("/categorias", categoriaRoutes);
app.use("/transacoes", transacaoRoutes);
app.use("/gastos-fixos", gastosFixosRoutes);
app.use("/admin", adminRoutes);
app.use("/preferencias", preferenciasRoutes);
app.use("/orcamentos", orcamentosRoutes);
app.use("/dividas", dividasRoutes);
app.use("/cartoes", cartoesRoutes);
app.use("/patrimonio", patrimonioRoutes);
app.use("/objetivos", objetivosRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/notificacoes", notificacoesRoutes);
app.use("/ia", iaRoutes);
app.use("/inteligencia", inteligenciaRoutes);
app.use("/planejamento", planejamentoRoutes);
app.use("/relatorios", relatoriosRoutes);
app.use("/privacidade", privacidadeRoutes);

// 5. Middleware global de tratamento de erros
app.use(errorHandler);

module.exports = app;
