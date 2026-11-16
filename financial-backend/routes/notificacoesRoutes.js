const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const notificacoesController = require("../controllers/notificacoesController");

router.use(authenticateToken);
router.get("/", notificacoesController.listarLembretes);

module.exports = router;
