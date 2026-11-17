/**
 * Serviço de Privacidade e Portabilidade (LGPD):
 * - Resumo de armazenamento na conta autenticada
 * - Exportação completa em JSON sanitizado (sem secrets/hashes)
 * - Exclusão permanente e atômica da própria conta com reautenticação
 */
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { logSystemEvent } = require("../utils/logger");

async function getPrivacySummary(userId) {
  const [
    userRes,
    txCount,
    catCount,
    fixasCount,
    orcCount,
    cartoesCount,
    divCount,
    patCount,
    objCount,
    regrasCount,
    aiMsgCount,
  ] = await Promise.all([
    pool.query(
      "SELECT id, username, email, role, (password_hash IS NOT NULL) AS has_local_password FROM usuarios WHERE id = $1",
      [userId],
    ),
    pool.query("SELECT COUNT(*)::int AS total FROM transacoes WHERE user_id = $1", [userId]),
    pool.query("SELECT COUNT(*)::int AS total FROM categorias WHERE user_id = $1", [userId]),
    pool.query("SELECT COUNT(*)::int AS total FROM gastos_fixos WHERE usuario_id = $1", [userId]),
    pool.query("SELECT COUNT(*)::int AS total FROM orcamentos WHERE user_id = $1", [userId]),
    pool.query("SELECT COUNT(*)::int AS total FROM cartoes WHERE user_id = $1", [userId]),
    pool.query("SELECT COUNT(*)::int AS total FROM dividas WHERE user_id = $1", [userId]),
    pool.query("SELECT COUNT(*)::int AS total FROM patrimonio_itens WHERE user_id = $1", [userId]),
    pool.query("SELECT COUNT(*)::int AS total FROM objetivos WHERE user_id = $1", [userId]),
    pool.query("SELECT COUNT(*)::int AS total FROM classificacao_regras WHERE user_id = $1", [userId]),
    pool.query("SELECT COUNT(*)::int AS total FROM ai_messages WHERE user_id = $1", [userId]),
  ]);

  if (userRes.rows.length === 0) {
    const err = new Error("Usuário não encontrado.");
    err.status = 404;
    throw err;
  }

  const u = userRes.rows[0];
  return {
    conta: {
      id: u.id,
      username: u.username,
      email: u.email || null,
      role: u.role,
      hasLocalPassword: Boolean(u.has_local_password),
    },
    contagens: {
      transacoes: txCount.rows[0].total,
      categorias: catCount.rows[0].total,
      gastos_fixos: fixasCount.rows[0].total,
      orcamentos: orcCount.rows[0].total,
      cartoes: cartoesCount.rows[0].total,
      dividas: divCount.rows[0].total,
      patrimonio_itens: patCount.rows[0].total,
      objetivos: objCount.rows[0].total,
      classificacao_regras: regrasCount.rows[0].total,
      ai_messages: aiMsgCount.rows[0].total,
    },
  };
}

async function exportUserDataBundle(userId) {
  const [
    userRes,
    prefRes,
    catRes,
    txRes,
    fixasRes,
    fixasPagRes,
    orcRes,
    cartoesRes,
    cartoesFatRes,
    divRes,
    divAmortRes,
    patRes,
    patMovRes,
    objRes,
    objContribRes,
    regrasRes,
    aiMsgsRes,
    aiUsageRes,
  ] = await Promise.all([
    pool.query(
      "SELECT id, username, email, role, is_active FROM usuarios WHERE id = $1",
      [userId],
    ),
    pool.query(
      "SELECT preferences, updated_at FROM user_preferences WHERE user_id = $1",
      [userId],
    ),
    pool.query(
      "SELECT id, nome, cor FROM categorias WHERE user_id = $1 ORDER BY id ASC",
      [userId],
    ),
    pool.query(
      `SELECT id, descricao, valor, tipo, data::text AS data, categoria_id, cartao_id, cartao_excluido_nome
       FROM transacoes WHERE user_id = $1 ORDER BY data DESC, id DESC`,
      [userId],
    ),
    pool.query("SELECT * FROM gastos_fixos WHERE usuario_id = $1 ORDER BY id ASC", [userId]),
    pool.query(
      "SELECT * FROM gastos_fixos_pagamentos WHERE usuario_id = $1 ORDER BY id ASC",
      [userId],
    ),
    pool.query("SELECT * FROM orcamentos WHERE user_id = $1 ORDER BY id ASC", [userId]),
    pool.query("SELECT * FROM cartoes WHERE user_id = $1 ORDER BY id ASC", [userId]),
    pool.query(
      "SELECT * FROM cartoes_faturas_pagas WHERE user_id = $1 ORDER BY id ASC",
      [userId],
    ),
    pool.query("SELECT * FROM dividas WHERE user_id = $1 ORDER BY id ASC", [userId]),
    pool.query(
      "SELECT * FROM dividas_amortizacoes WHERE user_id = $1 ORDER BY id ASC",
      [userId],
    ),
    pool.query("SELECT * FROM patrimonio_itens WHERE user_id = $1 ORDER BY id ASC", [userId]),
    pool.query(
      "SELECT * FROM patrimonio_movimentacoes WHERE user_id = $1 ORDER BY id ASC",
      [userId],
    ),
    pool.query("SELECT * FROM objetivos WHERE user_id = $1 ORDER BY id ASC", [userId]),
    pool.query(
      "SELECT * FROM objetivos_contribuicoes WHERE user_id = $1 ORDER BY id ASC",
      [userId],
    ),
    pool.query(
      "SELECT * FROM classificacao_regras WHERE user_id = $1 ORDER BY id ASC",
      [userId],
    ),
    pool.query(
      "SELECT id, role, content, tools_used, provider, model, created_at FROM ai_messages WHERE user_id = $1 ORDER BY created_at ASC, id ASC",
      [userId],
    ),
    pool.query(
      "SELECT id, provider, model, status, prompt_tokens, completion_tokens, total_tokens, neurons, latency_ms, usage_date_utc, created_at FROM ai_usage_logs WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    ),
  ]);

  if (userRes.rows.length === 0) {
    const err = new Error("Usuário não encontrado.");
    err.status = 404;
    throw err;
  }

  return {
    export_version: "1.0",
    exported_at: new Date().toISOString(),
    application: "MeFinance",
    usuario: userRes.rows[0],
    preferencias: prefRes.rows[0]?.preferences || null,
    preferencias_atualizadas_em: prefRes.rows[0]?.updated_at || null,
    dados: {
      categorias: catRes.rows,
      transacoes: txRes.rows,
      gastos_fixos: fixasRes.rows,
      gastos_fixos_pagamentos: fixasPagRes.rows,
      orcamentos: orcRes.rows,
      cartoes: cartoesRes.rows,
      cartoes_faturas_pagas: cartoesFatRes.rows,
      dividas: divRes.rows,
      dividas_amortizacoes: divAmortRes.rows,
      patrimonio_itens: patRes.rows,
      patrimonio_movimentacoes: patMovRes.rows,
      objetivos: objRes.rows,
      objetivos_contribuicoes: objContribRes.rows,
      classificacao_regras: regrasRes.rows,
      ai_messages: aiMsgsRes.rows,
      ai_usage_logs: aiUsageRes.rows,
    },
  };
}

async function deleteOwnAccount(userId, { password, confirmUsername, confirmPhrase } = {}) {
  const userRes = await pool.query(
    "SELECT id, username, role, password_hash FROM usuarios WHERE id = $1",
    [userId],
  );
  if (userRes.rows.length === 0) {
    return { ok: false, status: 404, error: "Conta não encontrada." };
  }
  const user = userRes.rows[0];

  if (typeof confirmUsername !== "string" || confirmUsername.trim() !== user.username) {
    return {
      ok: false,
      status: 400,
      error: "Digite exatamente o seu nome de usuário para confirmar a exclusão.",
    };
  }

  if (typeof confirmPhrase !== "string" || confirmPhrase.trim().toUpperCase() !== "EXCLUIR") {
    return {
      ok: false,
      status: 400,
      error: "Digite EXCLUIR para confirmar a remoção permanente da conta.",
    };
  }

  if (user.password_hash) {
    if (!password || typeof password !== "string") {
      return { ok: false, status: 400, error: "Sua senha atual é obrigatória para excluir a conta." };
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return { ok: false, status: 403, error: "Senha atual incorreta." };
    }
  }

  if (user.role === "admin") {
    const otherAdmins = await pool.query(
      "SELECT COUNT(*)::int AS total FROM usuarios WHERE role = 'admin' AND is_active = TRUE AND id <> $1",
      [userId],
    );
    if (otherAdmins.rows[0].total === 0) {
      return {
        ok: false,
        status: 409,
        error: "Não é possível excluir o único administrador ativo do sistema. Promova outro administrador antes.",
      };
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE system_logs SET user_id = NULL WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM transacoes WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM gastos_fixos WHERE usuario_id = $1", [userId]);
    await client.query("DELETE FROM categorias WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM usuarios WHERE id = $1", [userId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  await logSystemEvent({
    message: "Titular encerrou e removeu permanentemente a própria conta (LGPD).",
    route: "/privacidade/conta",
    userId: null,
    level: "warning",
  });

  return { ok: true };
}

module.exports = {
  getPrivacySummary,
  exportUserDataBundle,
  deleteOwnAccount,
};
