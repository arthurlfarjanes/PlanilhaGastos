const cron = require("node-cron");
const pool = require("../config/db");

const processarGastosFixos = async () => {
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const dataTransacao = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-${String(diaAtual).padStart(2, "0")}`;

  try {
    const queryGastos = `
      SELECT * FROM gastos_fixos 
      WHERE dia_vencimento = $1
    `;
    const { rows: gastos } = await pool.query(queryGastos, [diaAtual]);

    for (const gasto of gastos) {
      const queryVerificacao = `
        SELECT id FROM transacoes 
        WHERE user_id = $1 
          AND descricao = $2 
          AND valor = $3 
          AND tipo = $4
          AND EXTRACT(MONTH FROM data) = $5 
          AND EXTRACT(YEAR FROM data) = $6
      `;

      const tipoTransacao = gasto.tipo || "despesa";

      const jaExiste = await pool.query(queryVerificacao, [
        gasto.usuario_id,
        gasto.descricao,
        gasto.valor,
        tipoTransacao,
        mesAtual,
        anoAtual,
      ]);

      if (jaExiste.rows.length === 0) {
        await pool.query(
          `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            gasto.usuario_id,
            gasto.descricao,
            gasto.valor,
            tipoTransacao,
            dataTransacao,
            gasto.categoria_id,
          ],
        );
        console.log(
          `[AUTOMAÇÃO] Transação fixa (${tipoTransacao}) gerada: "${gasto.descricao}" para o usuário ID ${gasto.usuario_id}`,
        );
      }
    }
  } catch (error) {
    console.error("[AUTOMAÇÃO] Erro ao processar transações fixas:", error);
  }
};

const iniciarAgendador = () => {
  cron.schedule("0 1 * * *", () => {
    console.log(
      "[AUTOMAÇÃO] Rodando verificação diária de transações fixas...",
    );
    processarGastosFixos();
  });
};

module.exports = { iniciarAgendador, processarGastosFixos };
