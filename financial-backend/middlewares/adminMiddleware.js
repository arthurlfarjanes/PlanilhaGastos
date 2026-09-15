const { logSystemEvent } = require("../utils/logger");

const adminMiddleware = async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    await logSystemEvent({
      message: "Tentativa de acesso não autorizado a área de administrador.",
      route: req.originalUrl,
      userId: req.user ? req.user.userId : null,
      level: "warning",
    });
    res.status(403).json({ error: "Acesso negado. Apenas administradores podem realizar esta ação." });
  }
};

module.exports = adminMiddleware;
