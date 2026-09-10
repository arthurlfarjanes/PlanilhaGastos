const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const transacaoController = require("../controllers/transacaoController");

router.use(authenticateToken);

router.get("/", transacaoController.listarTransacoes);
router.post("/", transacaoController.criarTransacao);
router.post("/parcelada", transacaoController.criarTransacaoParcelada);
router.get("/comparativo", transacaoController.obterComparativo);
router.put("/:id", transacaoController.editarTransacao);
router.delete("/:id", transacaoController.deletarTransacao);

module.exports = router;
