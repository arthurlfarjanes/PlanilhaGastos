const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const dividasController = require("../controllers/dividasController");

router.use(authenticateToken);

router.get("/", dividasController.listarDividas);
router.post("/", dividasController.criarDivida);
router.put("/:id", dividasController.atualizarDivida);
router.delete("/:id", dividasController.deletarDivida);

router.get("/:id/amortizacoes", dividasController.listarAmortizacoes);
router.post("/:id/amortizar", dividasController.registrarAmortizacao);
router.delete("/:id/amortizacoes/:amortId", dividasController.estornarAmortizacao);
router.post("/:id/simular", dividasController.simularAmortizacaoDivida);

module.exports = router;

