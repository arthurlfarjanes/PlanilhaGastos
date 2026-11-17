/**
 * Verifica no Neon dev:
 * 1. Relatórios Inteligentes (`buildUserFinancialReport`, CSV e PDF Buffer)
 * 2. Aba Privacidade (`getPrivacySummary`, `exportUserDataBundle` sanitizado e `deleteOwnAccount` com reautenticação)
 */
require("dotenv").config();
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { buildUserFinancialReport } = require("../services/relatoriosService");
const { buildRelatorioCsv, gerarRelatorioPdfBuffer } = require("../utils/relatorios");
const {
  getPrivacySummary,
  exportUserDataBundle,
  deleteOwnAccount,
} = require("../services/privacidadeService");

(async () => {
  const client = await pool.connect();
  let userId = null;
  const username = `verify_rel_priv_${Date.now()}`;
  const rawPass = "SenhaForte@2026";

  try {
    const hash = await bcrypt.hash(rawPass, 10);
    const uRes = await client.query(
      `INSERT INTO usuarios (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [username, `${username}@example.com`, hash],
    );
    userId = uRes.rows[0].id;

    const catRes = await client.query(
      `INSERT INTO categorias (user_id, nome, cor) VALUES ($1, 'Moradia', '#059669') RETURNING id`,
      [userId],
    );
    const catId = catRes.rows[0].id;

    await client.query(
      `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
       VALUES
         ($1, 'Salário Novembro', 7000.00, 'receita', '2026-11-05', NULL),
         ($1, 'Aluguel Novembro', 2100.00, 'despesa', '2026-11-10', $2)`,
      [userId, catId],
    );

    await client.query(
      `INSERT INTO orcamentos (user_id, categoria_id, valor_limite, alerta_percentual, ativo)
       VALUES ($1, $2, 2500.00, 80, TRUE)`,
      [userId, catId],
    );

    const report = await buildUserFinancialReport(userId, {
      dataInicio: "2026-11-01",
      dataFim: "2026-11-30",
      refDate: "2026-11-17",
      incluirTransacoes: true,
    });

    assert.equal(report.resumo_periodo.receitas, 7000);
    assert.equal(report.resumo_periodo.despesas, 2100);
    assert.equal(report.resumo_periodo.economia, 4900);
    assert.ok(report.saude_financeira.score >= 0 && report.saude_financeira.score <= 100);

    const csvExec = buildRelatorioCsv("executivo", report);
    assert.ok(csvExec.includes("7.000,00"));
    const csvTx = buildRelatorioCsv("transacoes", report);
    assert.ok(csvTx.includes("7000,00"));
    const pdfBuf = await gerarRelatorioPdfBuffer(report);
    assert.equal(pdfBuf.subarray(0, 5).toString("ascii"), "%PDF-");

    const privSummary = await getPrivacySummary(userId);
    assert.equal(privSummary.conta.username, username);
    assert.equal(privSummary.conta.hasLocalPassword, true);
    assert.equal(privSummary.contagens.transacoes, 2);
    assert.equal(privSummary.contagens.orcamentos, 1);

    const bundle = await exportUserDataBundle(userId);
    assert.equal(bundle.usuario.password_hash, undefined);
    assert.equal(bundle.usuario.token_version, undefined);
    assert.equal(bundle.dados.transacoes.length, 2);

    const wrongPass = await deleteOwnAccount(userId, {
      password: "Errada!",
      confirmUsername: username,
      confirmPhrase: "EXCLUIR",
    });
    assert.equal(wrongPass.ok, false);
    assert.equal(wrongPass.status, 403);

    const deleted = await deleteOwnAccount(userId, {
      password: rawPass,
      confirmUsername: username,
      confirmPhrase: "EXCLUIR",
    });
    assert.equal(deleted.ok, true);

    const checkUser = await client.query("SELECT id FROM usuarios WHERE id = $1", [userId]);
    assert.equal(checkUser.rows.length, 0);
    userId = null;

    console.log("OK: Relatórios inteligentes (PDF/CSV) e Privacidade (Exportar/Excluir) verificados no Neon.");
  } finally {
    if (userId) {
      await client.query("UPDATE system_logs SET user_id = NULL WHERE user_id = $1", [userId]).catch(() => {});
      await client.query("DELETE FROM transacoes WHERE user_id = $1", [userId]).catch(() => {});
      await client.query("DELETE FROM usuarios WHERE id = $1", [userId]).catch(() => {});
    }
    client.release();
    await pool.end();
  }
})();
