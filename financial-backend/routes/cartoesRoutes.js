const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const c = require("../controllers/cartoesController");

router.use(authenticateToken);

router.get("/", c.listarCartoes);
router.post("/", c.criarCartao);
router.put("/:id", c.atualizarCartao);
router.delete("/:id", c.deletarCartao);

router.get("/:id/fatura", c.obterFatura);
router.post("/:id/fatura/pagar", c.pagarFatura);
router.delete("/:id/fatura/:ano/:mes/pagamento", c.estornarPagamentoFatura);

module.exports = router;
