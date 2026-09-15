const pool = require("../config/db");

/**
 * Função responsável por registrar eventos do sistema e erros no banco de dados.
 * 
 * @param {Object} param0 Objeto contendo os dados do evento
 * @param {string} param0.message Mensagem principal do evento
 * @param {string} [param0.stack] Stack trace (pilha de execução) se houver erro
 * @param {string} [param0.route] Rota, endpoint ou módulo onde ocorreu
 * @param {number|null} [param0.userId] ID do usuário relacionado (se houver)
 * @param {string} [param0.level] Nível do evento ('info', 'error', 'warning', 'critical')
 */
const logSystemEvent = async ({ message, stack = null, route = null, userId = null, level = "info" }) => {
  try {
    await pool.query(
      `INSERT INTO system_logs (level, message, stack, route, user_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      [level, message, stack, route, userId]
    );
  } catch (dbError) {
    // Fallback: se o banco estiver fora, logamos no console para não perder o erro
    console.error("[FATAL] Falha ao registrar log no banco de dados:", dbError.message);
    console.error("[EVENTO ORIGINAL]:", message, stack);
  }
};

module.exports = { logSystemEvent };
