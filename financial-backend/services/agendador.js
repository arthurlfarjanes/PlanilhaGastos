const cron = require("node-cron");
const pool = require("../config/db");
const { logSystemEvent } = require("../utils/logger");
const { daysInMonth } = require("../utils/contasFixas");

const processarGastosFixos = async () => {
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  const ultimoDiaMes = daysInMonth(anoAtual, mesAtual);

  const dataTransacao = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-${String(diaAtual).padStart(2, "0")}`;

  try {
    // Processa contas ativas com geração automática habilitada.
    // Se o mês atual tem menos dias que dia_vencimento (ex.: dia 31 em fevereiro), dispara no último dia do mês.
    const queryGastos = `
      SELECT * FROM gastos_fixos
      WHERE ativo = TRUE
        AND gerar_automatico = TRUE
        AND (
          dia_vencimento = $1
          OR ($1 = $2 AND dia_vencimento > $2)
        )
    `;
    const { rows: gastos } = await pool.query(queryGastos, [diaAtual, ultimoDiaMes]);

    for (const gasto of gastos) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // 1. Verifica se já foi pago/processado nesta competência (evita duplicidade se o usuário pagou antes do vencimento)
        const jaPago = await client.query(
          `SELECT id FROM gastos_fixos_pagamentos
           WHERE gasto_fixo_id = $1 AND competencia_ano = $2 AND competencia_mes = $3`,
          [gasto.id, anoAtual, mesAtual],
        );
        if (jaPago.rows.length > 0) {
          await client.query("COMMIT");
          continue;
        }

        const tipoTransacao = gasto.tipo || "despesa";

        // 2. Mantém verificação legada em transacoes para evitar duplicidade com registros anteriores à tabela de pagamentos
        const jaExiste = await client.query(
          `SELECT id FROM transacoes
           WHERE user_id = $1
             AND descricao = $2
             AND valor = $3
             AND tipo = $4
             AND EXTRACT(MONTH FROM data) = $5
             AND EXTRACT(YEAR FROM data) = $6
           LIMIT 1`,
          [gasto.usuario_id, gasto.descricao, gasto.valor, tipoTransacao, mesAtual, anoAtual],
        );

        let transacaoId;
        if (jaExiste.rows.length === 0) {
          const ins = await client.query(
            `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
              gasto.usuario_id,
              gasto.descricao,
              gasto.valor,
              tipoTransacao,
              dataTransacao,
              gasto.categoria_id,
            ],
          );
          transacaoId = ins.rows[0].id;
          console.log(
            `[AUTOMAÇÃO] Transação fixa (${tipoTransacao}) gerada: "${gasto.descricao}" para o usuário ID ${gasto.usuario_id}`,
          );
        } else {
          transacaoId = jaExiste.rows[0].id;
        }

        // 3. Registra a efetivação da competência vinculando à transação (sem duplicar)
        await client.query(
          `INSERT INTO gastos_fixos_pagamentos
             (gasto_fixo_id, usuario_id, competencia_ano, competencia_mes, valor_pago, data_pagamento, transacao_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (gasto_fixo_id, competencia_ano, competencia_mes) DO NOTHING`,
          [gasto.id, gasto.usuario_id, anoAtual, mesAtual, gasto.valor, dataTransacao, transacaoId],
        );

        await client.query("COMMIT");
      } catch (errItem) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(`[AUTOMAÇÃO] Erro no gasto fixo ID ${gasto.id}:`, errItem.message);
      } finally {
        client.release();
      }
    }

    await logSystemEvent({
      level: "info",
      route: "cron/gastos_fixos",
      message: `Verificação diária de gastos fixos concluída. ${gastos.length} gastos verificados.`,
    });
  } catch (error) {
    console.error("[AUTOMAÇÃO] Erro ao processar transações fixas:", error);
    await logSystemEvent({
      level: "error",
      route: "cron/gastos_fixos",
      message: "Erro ao processar transações fixas: " + error.message,
      stack: error.stack,
    });
  }
};

const iniciarAgendador = () => {
  cron.schedule("0 1 * * *", () => {
    console.log("[AUTOMAÇÃO] Rodando verificação diária de transações fixas...");
    processarGastosFixos();
  });
};

module.exports = { iniciarAgendador, processarGastosFixos };
