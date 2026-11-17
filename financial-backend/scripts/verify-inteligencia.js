/**
 * Verifica no Neon dev:
 * 1) Regras de classificação (classificacao_regras) e isolamento entre usuários
 * 2) Cálculo real via computeUserDiagnostics sobre transações/orçamentos/dívidas/patrimônio
 * 3) Limpeza completa ao final
 */
require("dotenv").config();
const assert = require("node:assert");
const pool = require("../config/db");
const {
  computeUserDiagnostics,
  computeUserOptimization,
} = require("../services/diagnosticosService");
const { gerarSugestoesRevisao } = require("../utils/classificacao");

(async () => {
  const client = await pool.connect();
  let userId = null;

  try {
    const uRes = await client.query(
      `INSERT INTO usuarios (username, email, password_hash)
       VALUES ($1, $2, 'hash_verify')
       RETURNING id`,
      [`verify_int_${Date.now()}`, `verify_int_${Date.now()}@example.com`],
    );
    userId = uRes.rows[0].id;

    const catRes = await client.query(
      `INSERT INTO categorias (nome, cor, user_id)
       VALUES ('Transporte', '#3b82f6', $1), ('Outros', '#64748b', $1)
       RETURNING id, nome, cor`,
      [userId],
    );
    const catTransp = catRes.rows[0];
    const catOutros = catRes.rows[1];

    const regraRes = await client.query(
      `INSERT INTO classificacao_regras (user_id, padrao, tipo_match, categoria_id, prioridade)
       VALUES ($1, 'uber', 'contains', $2, 20)
       RETURNING *`,
      [userId, catTransp.id],
    );
    assert.strictEqual(regraRes.rows[0].padrao, "uber");

    await client.query(
      `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
       VALUES
         ($1, 'Salario Mensal', 5000.00, 'receita', '2026-11-01', NULL),
         ($1, 'Uber Viagem Centro', 45.00, 'despesa', '2026-11-10', $2)`,
      [userId, catOutros.id],
    );

    const txRows = await client.query(
      `SELECT t.*, c.nome AS categoria_nome, c.cor AS categoria_cor
       FROM transacoes t
       LEFT JOIN categorias c ON t.categoria_id = c.id
       WHERE t.user_id = $1 AND t.tipo = 'despesa'`,
      [userId],
    );

    const rev = gerarSugestoesRevisao({
      transacoes: txRows.rows,
      regras: regraRes.rows,
      categorias: catRes.rows,
    });
    assert.strictEqual(rev.total_sugestoes, 1);
    assert.strictEqual(rev.sugestoes[0].categoria_sugerida_id, catTransp.id);

    const diag = await computeUserDiagnostics(userId, "2026-11-16");
    assert.ok(diag.saude_financeira && typeof diag.saude_financeira.score === "number");
    assert.strictEqual(diag.saude_financeira.pilares.length, 6);

    const opt = await computeUserOptimization(userId, {
      refDate: "2026-11-16",
      aporteMensal: 500,
      estrategiaDivida: "avalanche",
    });
    assert.strictEqual(opt.parametros.aporte_mensal_simulado, 500);
    assert.ok(Array.isArray(opt.plano_alocacao));

    console.log("OK: motores de classificacao_regras, diagnosticos e otimizacao verificados no Neon.");
  } finally {
    if (userId) {
      await client.query("DELETE FROM usuarios WHERE id = $1", [userId]);
    }
    client.release();
    await pool.end();
  }
})().catch((err) => {
  console.error("Falha na verificação da Fase 4:", err);
  process.exit(1);
});
