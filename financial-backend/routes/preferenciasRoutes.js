const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const controller = require("../controllers/preferenciasController");

router.use(authenticateToken);

router.get("/", controller.obterPreferencias);
router.put("/", controller.atualizarPreferencias);
router.delete("/", controller.restaurarPadroes);

module.exports = router;

