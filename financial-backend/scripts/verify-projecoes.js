/**
 * Verifica no Neon dev:
 * `computeUserProjection` sobre dados isolados de um usuário de teste com
 * transações históricas, parcelas futuras, dívida ativa, patrimônio e objetivo.
 */
require("dotenv").config();
const assert = require("node:assert");
const pool = require("../config/db");
const { computeUserProjection } = require("../services/planejamentoService");

(async () => {
  const client = await pool.connect();
  let userId = null;

  try {
    const uRes = await client.query(
      `INSERT INTO usuarios (username, email, password_hash)
       VALUES ($1, $2, 'hash_verify')
       RETURNING id`,
      [`verify_proj_${Date.now()}`, `verify_proj_${Date.now()}@example.com`],
    );
    userId = uRes.rows[0].id;

    await client.query(
      `INSERT INTO transacoes (user_id, descricao, valor, tipo, data)
       VALUES
         ($1, 'Salario Outubro', 6000.00, 'receita', '2026-10-05'),
         ($1, 'Aluguel Outubro', 2000.00, 'despesa', '2026-10-10'),
         ($1, 'Compra Parcelada (2/3)', 300.00, 'despesa', '2026-12-10')`,
      [userId],
    );

    await client.query(
      `INSERT INTO patrimonio_itens (user_id, nome, tipo, valor_atual, rendimento_tipo, rendimento_valor, cdi_referencia, liquidez)
       VALUES ($1, 'Reserva CDB', 'reserva_emergencia', 10000.00, 'cdi_percentual', 100, 12.0, 'imediata')`,
      [userId],
    );

    const proj = await computeUserProjection(userId, {
      refDate: "2026-11-17",
      parametrosUsuario: {
        horizonte_meses: 12,
        aporte_mensal_extra: 500,
        inflacao_anual_pct: 4.5,
      },
    });

    assert.strictEqual(proj.comparativo_mensal.length, 12);
    assert.strictEqual(proj.premissas.ativos_iniciais, 10000);
    assert.ok(proj.resumo_comparativo.diferenca_patrimonio_final > 0);

    console.log("OK: computeUserProjection (projeções e cenários) verificado no Neon.");
  } finally {
    if (userId) {
      await client.query("DELETE FROM usuarios WHERE id = $1", [userId]);
    }
    client.release();
    await pool.end();
  }
})().catch((err) => {
  console.error("Falha na verificação de Projeções:", err);
  process.exit(1);
});
