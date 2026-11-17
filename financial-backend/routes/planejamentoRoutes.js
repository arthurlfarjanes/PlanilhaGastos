const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const c = require("../controllers/planejamentoController");

router.use(authenticateToken);

router.get("/projecoes", c.obterProjecoes);
router.post("/simular", c.simularCenario);

module.exports = router;
