const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authenticateToken = require("../middlewares/authMiddleware");
const iaController = require("../controllers/iaController");

const iaChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas perguntas em sequência. Aguarde alguns segundos antes de tentar novamente.",
  },
});

router.use(authenticateToken);
router.get("/status", iaController.obterStatusIA);
router.get("/historico", iaController.listarHistoricoIA);
router.delete("/historico", iaController.limparHistoricoIA);
router.post("/chat", iaChatLimiter, iaController.enviarMensagemIA);

module.exports = router;
