const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const c = require("../controllers/inteligenciaController");

router.use(authenticateToken);

router.get("/diagnosticos", c.obterDiagnosticos);

router.get("/classificacao", c.obterClassificacao);
router.post("/classificacao/sugerir", c.sugerirClassificacao);
router.post("/classificacao/aplicar", c.aplicarClassificacao);

router.post("/classificacao/regras", c.criarRegra);
router.put("/classificacao/regras/:id", c.atualizarRegra);
router.delete("/classificacao/regras/:id", c.deletarRegra);

module.exports = router;
