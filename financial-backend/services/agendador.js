const cron = require("node-cron");
const pool = require("../config/db");

// Função principal que verifica e insere os gastos
const processarGastosFixos = async () => {
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const mesAtual = hoje.getMonth() + 1; // No JavaScript, janeiro é 0, então soma 1
  const anoAtual = hoje.getFullYear();

  // Formata a data atual para o padrão SQL: AAAA-MM-DD
  const dataTransacao = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-${String(diaAtual).padStart(2, "0")}`;

  try {
    // 1. Busca todos os moldes de gastos fixos configurados para o dia de hoje
    const queryGastos = `
      SELECT * FROM gastos_fixos 
      WHERE dia_vencimento = $1
    `;
    const { rows: gastos } = await pool.query(queryGastos, [diaAtual]);

    // Loop por cada gasto fixo encontrado para o dia de hoje
    for (const gasto of gastos) {
      // 2. Trava anti-duplicação: verifica se já gerou essa transação este mês
      const queryVerificacao = `
        SELECT id FROM transacoes 
        WHERE user_id = $1 
          AND descricao = $2 
          AND valor = $3 
          AND EXTRACT(MONTH FROM data) = $4 
          AND EXTRACT(YEAR FROM data) = $5
      `;

      const jaExiste = await pool.query(queryVerificacao, [
        gasto.usuario_id,
        gasto.descricao,
        gasto.valor,
        mesAtual,
        anoAtual,
      ]);

      // 3. Se não existir registro no mês, insere na tabela de transações reais
      if (jaExiste.rows.length === 0) {
        await pool.query(
          `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
           VALUES ($1, $2, $3, 'despesa', $4, $5)`,
          [
            gasto.usuario_id,
            gasto.descricao,
            gasto.valor,
            dataTransacao,
            gasto.categoria_id,
          ],
        );
        console.log(
          `[AUTOMAÇÃO] Gasto fixo gerado: "${gasto.descricao}" para o usuário ID ${gasto.usuario_id}`,
        );
      }
    }
  } catch (error) {
    console.error("[AUTOMAÇÃO] Erro ao processar gastos fixos:", error);
  }
};

// Função de inicialização do Cron
const iniciarAgendador = () => {
  // A sintaxe "0 1 * * *" significa: minuto 0, hora 1 (01:00 AM), todos os dias do mês, todos os meses, todos os dias da semana.
  cron.schedule("0 1 * * *", () => {
    console.log("[AUTOMAÇÃO] Rodando verificação diária de gastos fixos...");
    processarGastosFixos();
  });
};

module.exports = { iniciarAgendador, processarGastosFixos };
