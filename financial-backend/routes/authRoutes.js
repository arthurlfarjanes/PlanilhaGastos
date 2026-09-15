const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const authenticateToken = require("../middlewares/authMiddleware");

// Limitador de taxa estrito para prevenção de força bruta e DoS de CPU (Bcrypt)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo de 10 tentativas por IP a cada 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas de autenticação a partir deste IP. Tente novamente após 15 minutos." },
});

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/auth/google", authLimiter, authController.googleAuth);
router.post("/change-password", authenticateToken, authLimiter, authController.changePassword);

module.exports = router;

