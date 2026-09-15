const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authenticateToken = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// Todas as rotas de admin exigem token válido E role de admin
router.use(authenticateToken);
router.use(adminMiddleware);

router.get("/users", adminController.listarUsuarios);
router.post("/users", adminController.criarUsuario);
router.put("/users/:id", adminController.editarUsuario);
router.delete("/users/:id", adminController.deletarUsuario);
router.patch("/users/:id/status", adminController.toggleStatusUsuario);
router.post("/users/:id/reset-password", adminController.resetSenha);
router.get("/users/:id/transactions", adminController.relatorioUsuario);
router.get("/logs", adminController.getSystemLogs);

module.exports = router;
