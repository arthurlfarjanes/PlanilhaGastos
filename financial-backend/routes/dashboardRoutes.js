const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

router.use(authenticateToken);
router.get("/indicadores", dashboardController.obterIndicadores);

module.exports = router;
