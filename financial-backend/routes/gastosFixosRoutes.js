const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const gastosFixosController = require("../controllers/gastosFixosController");

// Todas as rotas abaixo requerem que o usuário esteja logado (token válido)
router.use(authenticateToken);

// GET /gastos-fixos
router.get("/", gastosFixosController.listarGastosFixos);

// POST /gastos-fixos
router.post("/", gastosFixosController.criarGastoFixo);

// DELETE /gastos-fixos/:id
router.delete("/:id", gastosFixosController.deletarGastoFixo);

// PUT /gastos-fixos/:id
router.put("/:id", gastosFixosController.atualizarGastoFixo);

module.exports = router;
