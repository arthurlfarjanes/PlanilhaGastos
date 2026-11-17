const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authenticateToken = require("../middlewares/authMiddleware");
const privacidadeController = require("../controllers/privacidadeController");

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.",
  },
});

const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas exportações em sequência. Aguarde alguns minutos e tente novamente.",
  },
});

router.use(authenticateToken);

router.get("/resumo", privacidadeController.obterResumo);
router.get("/exportar", exportLimiter, privacidadeController.exportarDados);
router.delete("/conta", sensitiveLimiter, privacidadeController.excluirConta);

module.exports = router;
