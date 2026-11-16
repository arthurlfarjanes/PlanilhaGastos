const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const objetivosController = require("../controllers/objetivosController");

router.use(authenticateToken);

router.get("/", objetivosController.listarObjetivos);
router.post("/", objetivosController.criarObjetivo);
router.put("/:id", objetivosController.atualizarObjetivo);
router.patch("/:id/status", objetivosController.alterarStatusObjetivo);
router.delete("/:id", objetivosController.deletarObjetivo);

router.get("/:id/contribuicoes", objetivosController.listarContribuicoes);
router.post("/:id/contribuir", objetivosController.registrarContribuicao);
router.delete("/:id/contribuicoes/:contribId", objetivosController.estornarContribuicao);

module.exports = router;
