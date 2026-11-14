const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const orcamentosController = require("../controllers/orcamentosController");

router.use(authenticateToken);

router.get("/", orcamentosController.listarOrcamentos);
router.post("/", orcamentosController.criarOrcamento);
router.put("/:id", orcamentosController.atualizarOrcamento);
router.delete("/:id", orcamentosController.deletarOrcamento);

module.exports = router;

