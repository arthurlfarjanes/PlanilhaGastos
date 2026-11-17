const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const adminController = require("../controllers/adminController");
const authenticateToken = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

const adminMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas ações administrativas em sequência. Aguarde alguns minutos.",
  },
});

// Todas as rotas de admin exigem token válido E role de admin
router.use(authenticateToken);
router.use(adminMiddleware);

router.get("/overview", adminController.getOverview);
router.get("/health", adminController.getHealth);
router.get("/ai-metrics", adminController.getAiMetrics);
router.get("/audit", adminController.getAuditLogs);

router.get("/users", adminController.listarUsuarios);
router.get("/users/:id/summary", adminController.obterResumoUsuario);
router.post("/users", adminMutationLimiter, adminController.criarUsuario);
router.put("/users/:id", adminMutationLimiter, adminController.editarUsuario);
router.delete("/users/:id", adminMutationLimiter, adminController.deletarUsuario);
router.patch("/users/:id/status", adminMutationLimiter, adminController.toggleStatusUsuario);
router.post("/users/:id/reset-password", adminMutationLimiter, adminController.resetSenha);

router.get("/logs", adminController.getSystemLogs);

module.exports = router;
