const { logSystemEvent } = require("../utils/logger");

/**
 * Middleware central de tratamento de erros.
 * Captura qualquer erro lançado pelos controllers ou bibliotecas e formata uma
 * resposta segura e amigável para o frontend, além de registrar no banco (se necessário).
 */
const errorHandler = async (err, req, res, next) => {
  const isCORS = err.message === "Bloqueado pela política de CORS";
  const statusCode = err.status || (isCORS ? 403 : 500);

  const errorData = {
    message: err.message || "Erro desconhecido",
    stack: err.stack,
    route: req.originalUrl,
    userId: req.user ? req.user.userId : null,
    level: statusCode >= 500 ? "error" : "warning",
  };

  // Registra no console para desenvolvimento
  console.error(`[${errorData.level.toUpperCase()} - ${statusCode}] ${errorData.route}:`, errorData.message);

  // Registra erros do servidor no banco de dados
  if (statusCode >= 500) {
    await logSystemEvent(errorData);
  }

  // Nunca expor stack traces ou detalhes internos nas respostas HTTP
  const responseMsg = statusCode >= 500
    ? "Ocorreu um erro interno no servidor. Nossa equipe técnica já foi notificada."
    : err.message; // Para erros 400, 401, 403, exibe apenas mensagem controlada

  res.status(statusCode).json({
    status: "error",
    error: isCORS ? "Origem não permitida pela política de CORS." : responseMsg,
  });
};

module.exports = errorHandler;
