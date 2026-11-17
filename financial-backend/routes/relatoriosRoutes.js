const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authenticateToken = require("../middlewares/authMiddleware");
const relatoriosController = require("../controllers/relatoriosController");

const exportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas exportações em sequência. Aguarde alguns instantes e tente novamente.",
  },
});

router.use(authenticateToken);

router.get("/resumo", relatoriosController.obterResumoRelatorio);
router.get("/exportar/csv", exportLimiter, relatoriosController.exportarCsv);
router.get("/exportar/pdf", exportLimiter, relatoriosController.exportarPdf);

module.exports = router;
