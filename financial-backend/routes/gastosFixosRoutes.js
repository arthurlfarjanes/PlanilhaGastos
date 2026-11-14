const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const gastosFixosController = require("../controllers/gastosFixosController");

// Todas as rotas abaixo requerem que o usuário esteja logado (token válido)
router.use(authenticateToken);

// GET /gastos-fixos/resumo?mes=MM&ano=YYYY
router.get("/resumo", gastosFixosController.resumoGastosFixos);

// GET /gastos-fixos?mes=MM&ano=YYYY
router.get("/", gastosFixosController.listarGastosFixos);

// POST /gastos-fixos
router.post("/", gastosFixosController.criarGastoFixo);

// POST /gastos-fixos/:id/pagar
router.post("/:id/pagar", gastosFixosController.marcarComoPago);

// DELETE /gastos-fixos/:id/pagar?mes=MM&ano=YYYY
router.delete("/:id/pagar", gastosFixosController.desfazerPagamento);

// DELETE /gastos-fixos/:id
router.delete("/:id", gastosFixosController.deletarGastoFixo);

// PUT /gastos-fixos/:id
router.put("/:id", gastosFixosController.atualizarGastoFixo);

module.exports = router;
