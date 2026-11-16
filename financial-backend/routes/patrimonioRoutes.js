const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const patrimonioController = require("../controllers/patrimonioController");

router.use(authenticateToken);

router.get("/", patrimonioController.listarPatrimonio);
router.post("/", patrimonioController.criarPatrimonio);
router.put("/:id", patrimonioController.atualizarPatrimonio);
router.delete("/:id", patrimonioController.deletarPatrimonio);

router.get("/:id/movimentacoes", patrimonioController.listarMovimentacoes);
router.post("/:id/movimentar", patrimonioController.registrarMovimentacao);
router.delete("/:id/movimentacoes/:movId", patrimonioController.estornarMovimentacao);

module.exports = router;
