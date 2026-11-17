const crypto = require("crypto");
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { logSystemEvent } = require("../utils/logger");
const { recordAdminAudit, sanitizeLogMessage } = require("../utils/adminAudit");
const { listFreeProviders } = require("../ai/providers");
const { getUserDailyLimit } = require("../ai/usageService");
const { MAX_AI_BONUS_REQUESTS } = require("../utils/gamification");
const {
  DEFAULT_TIMEZONE,
  parseStrictPositiveInt,
  isValidUsername,
  isValidEmail,
  isValidPassword,
  isValidRole,
  isISODate,
  isValidTimezone,
} = require("../utils/validation");

function parsePagination(query = {}, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const rawPage = parseInt(query.page, 10);
  const rawLimit = parseInt(query.limit, 10);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? Math.min(rawPage, 1000) : 1;
  const limit =
    Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, maxLimit) : defaultLimit;
  return { page, limit, offset: (page - 1) * limit };
}

function resolveTimezoneParam(rawTz) {
  if (rawTz === undefined || String(rawTz).trim() === "") {
    return { timezone: DEFAULT_TIMEZONE };
  }
  const tz = String(rawTz).trim();
  if (!isValidTimezone(tz)) {
    return { error: "Parâmetro timezone inválido (use IANA, ex.: America/Sao_Paulo)." };
  }
  return { timezone: tz };
}

async function verifyAdminConfirmation(adminUserId, adminPassword, db = pool) {
  if (!adminPassword || typeof adminPassword !== "string") {
    return { ok: false, status: 400, error: "Senha do administrador é obrigatória para esta ação." };
  }
  const currentUser = await db.query(
    "SELECT password_hash FROM usuarios WHERE id = $1",
    [adminUserId],
  );
  const currentHash = currentUser.rows[0]?.password_hash;
  if (!currentHash) {
    return {
      ok: false,
      status: 403,
      error:
        "Sua conta não possui uma senha configurada (Login via Google). Crie uma senha antes de realizar ações de segurança.",
    };
  }
  const isPasswordValid = await bcrypt.compare(adminPassword, currentHash);
  if (!isPasswordValid) {
    return { ok: false, status: 403, error: "Senha de administrador incorreta." };
  }
  return { ok: true };
}

async function ensureRemainingActiveAdmin(targetUser, { nextRole, nextActive }, db = pool) {
  const wasActiveAdmin = targetUser.role === "admin" && targetUser.is_active !== false;
  if (!wasActiveAdmin) return { ok: true };
  const staysActiveAdmin = nextRole === "admin" && nextActive !== false;
  if (staysActiveAdmin) return { ok: true };

  const others = await db.query(
    "SELECT COUNT(*)::int AS cnt FROM usuarios WHERE role = 'admin' AND is_active = TRUE AND id <> $1",
    [targetUser.id],
  );
  if (Number(others.rows[0]?.cnt || 0) === 0) {
    return {
      ok: false,
      status: 409,
      error: "Não é possível remover, desativar ou rebaixar o último administrador ativo do sistema.",
    };
  }
  return { ok: true };
}

function toISO(val) {
  return val instanceof Date ? val.toISOString() : val || null;
}

// Visão geral agregada (sem dados financeiros individuais)
exports.getOverview = async (req, res, next) => {
  try {
    const [usersRes, logsRes, auditRes, aiRes, helpRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active,
          COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive,
          COUNT(*) FILTER (WHERE role = 'admin' AND is_active = TRUE)::int AS admins,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS new_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_30d
        FROM usuarios
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE level IN ('error', 'critical') AND created_at >= NOW() - INTERVAL '24 hours')::int AS errors_24h,
          COUNT(*) FILTER (WHERE level IN ('error', 'critical') AND created_at >= NOW() - INTERVAL '7 days')::int AS errors_7d,
          COUNT(*) FILTER (WHERE level = 'warning' AND created_at >= NOW() - INTERVAL '7 days')::int AS warnings_7d
        FROM system_logs
      `),
      pool.query(`
        SELECT COUNT(*)::int AS actions_7d
        FROM admin_audit_logs
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `).catch(() => ({ rows: [{ actions_7d: 0 }] })),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS requests_24h,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS requests_7d,
          COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS unique_users_7d,
          COUNT(*) FILTER (WHERE status = 'quota_excedida' AND created_at >= NOW() - INTERVAL '24 hours')::int AS quota_24h,
          COUNT(*) FILTER (WHERE status IN ('erro', 'indisponivel') AND created_at >= NOW() - INTERVAL '24 hours')::int AS failed_24h
        FROM ai_usage_logs
      `),
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM help_feedback) AS feedback_total,
          (SELECT COUNT(*)::int FROM help_feedback WHERE helpful = TRUE) AS feedback_helpful,
          (SELECT COUNT(*)::int FROM help_feedback WHERE reason = 'outdated') AS feedback_outdated,
          (
            SELECT COUNT(*)::int
            FROM user_preferences
            WHERE jsonb_array_length(COALESCE(preferences->'help'->'completedTours', '[]'::jsonb)) > 0
          ) AS users_with_tours
      `).catch(() => ({
        rows: [{ feedback_total: 0, feedback_helpful: 0, feedback_outdated: 0, users_with_tours: 0 }],
      })),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      generatedAt: new Date().toISOString(),
      users: usersRes.rows[0],
      logs: logsRes.rows[0],
      audit: auditRes.rows[0],
      ai: aiRes.rows[0],
      tecoHelp: helpRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// Saúde operacional da API, banco Neon e provedores gratuitos (sem segredos)
exports.getHealth = async (req, res, next) => {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    const dbLatencyMs = Date.now() - start;

    let migrationsCount = 0;
    let lastMigrationAt = null;
    try {
      const mig = await pool.query(
        "SELECT COUNT(*)::int AS cnt, MAX(applied_at) AS last_at FROM schema_migrations",
      );
      migrationsCount = mig.rows[0]?.cnt || 0;
      lastMigrationAt = toISO(mig.rows[0]?.last_at);
    } catch {
      migrationsCount = 0;
    }

    const providers = listFreeProviders();

    res.set("Cache-Control", "no-store");
    res.json({
      status: "ok",
      checkedAt: new Date().toISOString(),
      api: {
        status: "ok",
        uptimeSeconds: Math.round(process.uptime()),
        nodeEnv: process.env.NODE_ENV || "development",
      },
      database: {
        status: "ok",
        provider: "PostgreSQL (Neon)",
        latencyMs: dbLatencyMs,
        migrationsCount,
        lastMigrationAt,
      },
      aiProviders: providers.map((p) => ({
        id: p.id,
        name: p.name,
        model: p.model,
        configured: Boolean(p.configured),
        requiresCard: false,
        resetSchedule: p.resetSchedule,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// Observabilidade agregada do Teco/IA (NUNCA lê ai_messages nem dados financeiros pessoais)
exports.getAiMetrics = async (req, res, next) => {
  const rawDays = parseInt(req.query.days, 10);
  const days = [1, 7, 30].includes(rawDays) ? rawDays : 7;

  try {
    const [summaryRes, byProviderRes, byDayRes, feedbackRes] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS total_requests,
           COUNT(*) FILTER (WHERE status = 'ok')::int AS ok_requests,
           COUNT(*) FILTER (WHERE status IN ('erro', 'indisponivel'))::int AS failed_requests,
           COUNT(*) FILTER (WHERE status = 'quota_excedida')::int AS quota_exceeded_count,
           COUNT(DISTINCT user_id)::int AS unique_users,
           COALESCE(ROUND(AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL))::int, 0) AS avg_latency_ms,
           COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE latency_ms IS NOT NULL))::int, 0) AS p95_latency_ms,
           COALESCE(SUM(total_tokens) FILTER (WHERE status = 'ok'), 0)::bigint AS total_tokens,
           COALESCE(SUM(neurons) FILTER (WHERE neurons IS NOT NULL), 0)::bigint AS total_neurons
         FROM ai_usage_logs
         WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')`,
        [days],
      ),
      pool.query(
        `SELECT
           provider,
           MAX(model) AS model,
           COUNT(*) FILTER (WHERE status = 'ok')::int AS ok_requests,
           COUNT(*) FILTER (WHERE status IN ('erro', 'indisponivel'))::int AS failed_requests,
           COUNT(*) FILTER (WHERE status = 'quota_excedida')::int AS quota_exceeded_count,
           COALESCE(ROUND(AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL))::int, 0) AS avg_latency_ms,
           COALESCE(SUM(total_tokens) FILTER (WHERE status = 'ok'), 0)::bigint AS total_tokens,
           COALESCE(SUM(neurons) FILTER (WHERE neurons IS NOT NULL), 0)::bigint AS total_neurons
         FROM ai_usage_logs
         WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
         GROUP BY provider
         ORDER BY ok_requests DESC`,
        [days],
      ),
      pool.query(
        `SELECT
           usage_date_utc::text AS date,
           COUNT(*) FILTER (WHERE status = 'ok')::int AS ok_requests,
           COUNT(*) FILTER (WHERE status IN ('erro', 'indisponivel'))::int AS failed_requests,
           COUNT(*) FILTER (WHERE status = 'quota_excedida')::int AS quota_exceeded_count,
           COALESCE(SUM(total_tokens) FILTER (WHERE status = 'ok'), 0)::bigint AS total_tokens,
           COALESCE(SUM(neurons) FILTER (WHERE neurons IS NOT NULL), 0)::bigint AS total_neurons
         FROM ai_usage_logs
         WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
         GROUP BY usage_date_utc
         ORDER BY usage_date_utc ASC`,
        [days],
      ),
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE helpful = TRUE)::int AS helpful,
           COUNT(*) FILTER (WHERE helpful = FALSE)::int AS not_helpful,
           COUNT(*) FILTER (WHERE reason = 'outdated')::int AS outdated
         FROM help_feedback
         WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')`,
        [days],
      ).catch(() => ({ rows: [{ total: 0, helpful: 0, not_helpful: 0, outdated: 0 }] })),
    ]);

    let recentOutdated = [];
    try {
      const outRes = await pool.query(
        `SELECT id, topic_id, route, note, created_at
         FROM help_feedback
         WHERE reason = 'outdated'
         ORDER BY created_at DESC
         LIMIT 10`,
      );
      recentOutdated = outRes.rows.map((r) => ({
        ...r,
        note: r.note ? sanitizeLogMessage(r.note) : null,
        created_at: toISO(r.created_at),
      }));
    } catch {
      recentOutdated = [];
    }

    const s = summaryRes.rows[0] || {};
    const baseDaily = getUserDailyLimit();

    res.set("Cache-Control", "no-store");
    res.json({
      days,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRequests: Number(s.total_requests || 0),
        okRequests: Number(s.ok_requests || 0),
        failedRequests: Number(s.failed_requests || 0),
        quotaExceededCount: Number(s.quota_exceeded_count || 0),
        uniqueUsers: Number(s.unique_users || 0),
        avgLatencyMs: Number(s.avg_latency_ms || 0),
        p95LatencyMs: Number(s.p95_latency_ms || 0),
        totalTokens: Number(s.total_tokens || 0),
        totalNeurons: Number(s.total_neurons || 0),
      },
      byProvider: byProviderRes.rows.map((r) => ({
        ...r,
        total_tokens: Number(r.total_tokens || 0),
        total_neurons: Number(r.total_neurons || 0),
      })),
      byDay: byDayRes.rows.map((r) => ({
        ...r,
        total_tokens: Number(r.total_tokens || 0),
        total_neurons: Number(r.total_neurons || 0),
      })),
      providersStatus: listFreeProviders(),
      quotaPolicy: {
        baseUserDailyLimit: baseDaily,
        maxUserBonusDailyRequests: MAX_AI_BONUS_REQUESTS,
        maxUserTotalDailyLimit: baseDaily + MAX_AI_BONUS_REQUESTS,
      },
      helpTelemetry: {
        ...(feedbackRes.rows[0] || { total: 0, helpful: 0, not_helpful: 0, outdated: 0 }),
        recentOutdated,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Listar usuários com busca, filtros e paginação server-side
exports.listarUsuarios = async (req, res, next) => {
  const { search = "", role = "", status = "" } = req.query;
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });

  if (role && role !== "all" && !isValidRole(role)) {
    return res.status(400).json({ error: "Filtro role inválido." });
  }
  if (status && !["all", "active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "Filtro status inválido." });
  }

  try {
    const conditions = ["1=1"];
    const params = [];

    const q = String(search || "").trim();
    if (q) {
      params.push(`%${q.slice(0, 80)}%`);
      conditions.push(`(username ILIKE $${params.length} OR COALESCE(email, '') ILIKE $${params.length})`);
    }
    if (role && role !== "all") {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    if (status === "active") {
      conditions.push("is_active = TRUE");
    } else if (status === "inactive") {
      conditions.push("is_active = FALSE");
    }

    const whereClause = conditions.join(" AND ");
    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM usuarios WHERE ${whereClause}`, params);
    const total = Number(countRes.rows[0]?.total || 0);

    const listParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT id, username, email, role, is_active, created_at
       FROM usuarios
       WHERE ${whereClause}
       ORDER BY id ASC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );

    res.set("Cache-Control", "no-store");
    res.json({
      items: result.rows.map((u) => ({ ...u, created_at: toISO(u.created_at) })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Detalhe administrativo mínimo (ZERO transações, saldos, patrimônio ou conversas privadas)
exports.obterResumoUsuario = async (req, res, next) => {
  const targetId = parseStrictPositiveInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }

  try {
    const userRes = await pool.query(
      `SELECT id, username, email, role, is_active, token_version, created_at, (password_hash IS NOT NULL) AS has_local_password
       FROM usuarios
       WHERE id = $1`,
      [targetId],
    );
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const [aiStatsRes, prefRes, fbRes] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS ai_requests_total,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS ai_requests_30d,
           MAX(created_at) AS last_ai_request_at
         FROM ai_usage_logs
         WHERE user_id = $1`,
        [targetId],
      ),
      pool.query("SELECT preferences->'help' AS help FROM user_preferences WHERE user_id = $1", [targetId]),
      pool.query("SELECT COUNT(*)::int AS feedback_count FROM help_feedback WHERE user_id = $1", [targetId]).catch(() => ({
        rows: [{ feedback_count: 0 }],
      })),
    ]);

    const u = userRes.rows[0];
    const helpData = prefRes.rows[0]?.help || {};
    const completedTours = Array.isArray(helpData.completedTours) ? helpData.completedTours.length : 0;

    res.set("Cache-Control", "no-store");
    res.json({
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        is_active: u.is_active,
        token_version: u.token_version,
        hasLocalPassword: Boolean(u.has_local_password),
        created_at: toISO(u.created_at),
      },
      activity: {
        aiRequestsTotal: aiStatsRes.rows[0]?.ai_requests_total || 0,
        aiRequests30d: aiStatsRes.rows[0]?.ai_requests_30d || 0,
        lastAiRequestAt: toISO(aiStatsRes.rows[0]?.last_ai_request_at),
        completedToursCount: completedTours,
        helpFeedbackCount: fbRes.rows[0]?.feedback_count || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Criar novo usuário (Admin) — exige senha de admin se role='admin'
exports.criarUsuario = async (req, res, next) => {
  const { username, email, password, role = "user", adminPassword } = req.body || {};
  if (!isValidUsername(username)) {
    return res.status(400).json({
      error: "Username inválido. Use entre 3 e 30 caracteres (letras, números, '_' ou '-').",
    });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Email inválido." });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: "A senha deve ter entre 8 e 72 caracteres." });
  }
  if (!isValidRole(role)) {
    return res.status(400).json({ error: "Função (role) inválida. Use 'user' ou 'admin'." });
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();

  try {
    if (role === "admin") {
      const check = await verifyAdminConfirmation(req.user.userId, adminPassword);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
    }

    const userExists = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1 OR username = $2",
      [cleanEmail, cleanUsername],
    );
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: "Username ou email já está em uso." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO usuarios (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, is_active, created_at",
      [cleanUsername, cleanEmail, hashedPassword, role],
    );

    const created = result.rows[0];
    await Promise.all([
      recordAdminAudit({
        actorUserId: req.user.userId,
        action: "user.create",
        targetType: "user",
        targetId: created.id,
        metadata: { role: created.role },
        req,
      }),
      logSystemEvent({
        message: `Admin criou usuário ID ${created.id} (${created.role}).`,
        route: "/admin/users",
        userId: req.user.userId,
        level: "info",
      }),
    ]);

    res.status(201).json({
      message: "Usuário criado com sucesso",
      user: { ...created, created_at: toISO(created.created_at) },
    });
  } catch (err) {
    next(err);
  }
};

// Editar Usuário — protege último admin ativo, bloqueia auto-rebaixamento e exige confirmação em mudança de role ou admin
exports.editarUsuario = async (req, res, next) => {
  const targetId = parseStrictPositiveInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }

  const { username, email, role, adminPassword } = req.body || {};
  if (!isValidUsername(username)) {
    return res.status(400).json({
      error: "Username inválido. Use entre 3 e 30 caracteres (letras, números, '_' ou '-').",
    });
  }
  if (!isValidRole(role)) {
    return res.status(400).json({ error: "Função (role) inválida. Use 'user' ou 'admin'." });
  }

  const cleanUsername = username.trim();
  const cleanEmail =
    email === null || email === undefined || email === "" ? null : String(email).trim().toLowerCase();
  if (cleanEmail !== null && !isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: "Email inválido." });
  }

  try {
    const existingRes = await pool.query(
      "SELECT id, role, is_active FROM usuarios WHERE id = $1",
      [targetId],
    );
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const existing = existingRes.rows[0];
    if (targetId === req.user.userId && role !== "admin") {
      return res.status(403).json({
        error: "Você não pode remover seus próprios privilégios de administrador.",
      });
    }

    const roleChanged = existing.role !== role;
    if (roleChanged || existing.role === "admin") {
      const check = await verifyAdminConfirmation(req.user.userId, adminPassword);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
    }

    const lastAdminCheck = await ensureRemainingActiveAdmin(existing, {
      nextRole: role,
      nextActive: existing.is_active,
    });
    if (!lastAdminCheck.ok) {
      return res.status(lastAdminCheck.status).json({ error: lastAdminCheck.error });
    }

    if (cleanEmail) {
      const emailUsed = await pool.query(
        "SELECT id FROM usuarios WHERE email = $1 AND id != $2",
        [cleanEmail, targetId],
      );
      if (emailUsed.rows.length > 0) {
        return res.status(409).json({ error: "Email já está em uso por outro usuário." });
      }
    }

    const usernameUsed = await pool.query(
      "SELECT id FROM usuarios WHERE username = $1 AND id != $2",
      [cleanUsername, targetId],
    );
    if (usernameUsed.rows.length > 0) {
      return res.status(409).json({ error: "Username já está em uso por outro usuário." });
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET username = $1,
           email = $2,
           role = $3,
           token_version = CASE WHEN $4::boolean THEN token_version + 1 ELSE token_version END
       WHERE id = $5
       RETURNING id, username, email, role, is_active, created_at`,
      [cleanUsername, cleanEmail, role, roleChanged, targetId],
    );

    const updated = result.rows[0];
    await Promise.all([
      recordAdminAudit({
        actorUserId: req.user.userId,
        action: roleChanged ? "user.role_change" : "user.update",
        targetType: "user",
        targetId,
        metadata: { previousRole: existing.role, newRole: role, roleChanged },
        req,
      }),
      logSystemEvent({
        message: `Admin editou usuário ID ${targetId} (role=${role}).`,
        route: `/admin/users/${targetId}`,
        userId: req.user.userId,
        level: roleChanged ? "warning" : "info",
      }),
    ]);

    res.json({
      message: "Usuário atualizado com sucesso",
      user: { ...updated, created_at: toISO(updated.created_at) },
    });
  } catch (err) {
    next(err);
  }
};

// Deletar Usuário — exige confirmação de senha do admin e protege último admin ativo
exports.deletarUsuario = async (req, res, next) => {
  const targetId = parseStrictPositiveInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }
  const { adminPassword } = req.body || {};

  if (targetId === req.user.userId) {
    return res.status(403).json({ error: "Você não pode deletar a sua própria conta." });
  }

  const client = await pool.connect();
  try {
    const targetRes = await client.query(
      "SELECT id, role, is_active FROM usuarios WHERE id = $1",
      [targetId],
    );
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    const targetUser = targetRes.rows[0];

    const check = await verifyAdminConfirmation(req.user.userId, adminPassword, client);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const lastAdminCheck = await ensureRemainingActiveAdmin(
      targetUser,
      { nextRole: "user", nextActive: false },
      client,
    );
    if (!lastAdminCheck.ok) {
      return res.status(lastAdminCheck.status).json({ error: lastAdminCheck.error });
    }

    await client.query("BEGIN");
    await client.query("DELETE FROM usuarios WHERE id = $1", [targetId]);
    await client.query("COMMIT");

    await Promise.all([
      recordAdminAudit({
        actorUserId: req.user.userId,
        action: "user.delete",
        targetType: "user",
        targetId,
        metadata: { deletedRole: targetUser.role },
        req,
      }),
      logSystemEvent({
        message: `Admin deletou usuário ID ${targetId}.`,
        route: `/admin/users/${targetId}`,
        userId: req.user.userId,
        level: "warning",
      }),
    ]);

    res.json({ message: "Usuário deletado com sucesso." });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// Ativar/Desativar usuário — exige confirmação em desativações/admins e protege último admin ativo
exports.toggleStatusUsuario = async (req, res, next) => {
  const targetId = parseStrictPositiveInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }
  const { is_active, adminPassword } = req.body || {};

  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "Status 'is_active' deve ser booleano." });
  }

  if (targetId === req.user.userId && is_active === false) {
    return res.status(403).json({ error: "Você não pode desativar a sua própria conta." });
  }

  try {
    const targetRes = await pool.query(
      "SELECT id, role, is_active FROM usuarios WHERE id = $1",
      [targetId],
    );
    if (targetRes.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    const targetUser = targetRes.rows[0];

    if (targetUser.role === "admin" || is_active === false) {
      const check = await verifyAdminConfirmation(req.user.userId, adminPassword);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
    }

    const lastAdminCheck = await ensureRemainingActiveAdmin(targetUser, {
      nextRole: targetUser.role,
      nextActive: is_active,
    });
    if (!lastAdminCheck.ok) {
      return res.status(lastAdminCheck.status).json({ error: lastAdminCheck.error });
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET is_active = $1,
           token_version = CASE WHEN $1 = FALSE THEN token_version + 1 ELSE token_version END
       WHERE id = $2
       RETURNING id, username, is_active`,
      [is_active, targetId],
    );

    await Promise.all([
      recordAdminAudit({
        actorUserId: req.user.userId,
        action: is_active ? "user.activate" : "user.deactivate",
        targetType: "user",
        targetId,
        metadata: { targetRole: targetUser.role, isActive: is_active },
        req,
      }),
      logSystemEvent({
        message: `Admin alterou status do usuário ID ${targetId} para is_active=${is_active}.`,
        route: `/admin/users/${targetId}/status`,
        userId: req.user.userId,
        level: "warning",
      }),
    ]);

    res.json({ message: "Status atualizado com sucesso", user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Reset de senha (gera senha temporária CSPRNG, revoga tokens ativos e exige confirmação de senha)
exports.resetSenha = async (req, res, next) => {
  const targetId = parseStrictPositiveInt(req.params.id);
  if (!targetId) {
    return res.status(400).json({ error: "ID de usuário inválido." });
  }
  const { adminPassword } = req.body || {};

  try {
    const targetUser = await pool.query("SELECT id, role FROM usuarios WHERE id = $1", [targetId]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const check = await verifyAdminConfirmation(req.user.userId, adminPassword);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const newPassword = crypto.randomBytes(12).toString("base64url");
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const result = await pool.query(
      `UPDATE usuarios
       SET password_hash = $1, token_version = token_version + 1
       WHERE id = $2
       RETURNING id, username`,
      [hashedPassword, targetId],
    );

    await Promise.all([
      recordAdminAudit({
        actorUserId: req.user.userId,
        action: "user.reset_password",
        targetType: "user",
        targetId,
        metadata: { targetRole: targetUser.rows[0].role },
        req,
      }),
      logSystemEvent({
        message: `Admin resetou a senha do usuário ID ${targetId}.`,
        route: `/admin/users/${targetId}/reset-password`,
        userId: req.user.userId,
        level: "warning",
      }),
    ]);

    res.json({
      message: "Senha redefinida com sucesso.",
      tempPassword: newPassword,
      user: result.rows[0].username,
    });
  } catch (err) {
    next(err);
  }
};

// Trilha de auditoria administrativa paginada e filtrada no timezone IANA
exports.getAuditLogs = async (req, res, next) => {
  const { action = "", actorUserId = "", startDate = "", endDate = "", timezone } = req.query;
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 25, maxLimit: 50 });

  if (startDate && !isISODate(startDate)) {
    return res.status(400).json({ error: "Parâmetro startDate inválido." });
  }
  if (endDate && !isISODate(endDate)) {
    return res.status(400).json({ error: "Parâmetro endDate inválido." });
  }
  const tzRes = resolveTimezoneParam(timezone);
  if (tzRes.error) return res.status(400).json({ error: tzRes.error });

  let parsedActorId = null;
  if (actorUserId !== undefined && actorUserId !== "" && actorUserId !== "all") {
    parsedActorId = parseStrictPositiveInt(actorUserId);
    if (!parsedActorId) return res.status(400).json({ error: "Parâmetro actorUserId inválido." });
  }

  try {
    const conditions = ["1=1"];
    const params = [];

    if (action && action !== "all") {
      params.push(String(action).trim().slice(0, 64));
      conditions.push(`a.action = $${params.length}`);
    }
    if (parsedActorId) {
      params.push(parsedActorId);
      conditions.push(`a.actor_user_id = $${params.length}`);
    }
    if (startDate) {
      params.push(startDate.trim(), tzRes.timezone);
      conditions.push(
        `a.created_at >= ($${params.length - 1}::date::timestamp AT TIME ZONE $${params.length})`,
      );
    }
    if (endDate) {
      params.push(endDate.trim(), tzRes.timezone);
      conditions.push(
        `a.created_at < (($${params.length - 1}::date + INTERVAL '1 day')::timestamp AT TIME ZONE $${params.length})`,
      );
    }

    const whereClause = conditions.join(" AND ");
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM admin_audit_logs a WHERE ${whereClause}`,
      params,
    );
    const total = Number(countRes.rows[0]?.total || 0);

    const listParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT a.id, a.actor_user_id, u.username AS actor_username, a.action, a.target_type,
              a.target_id, a.metadata_sanitized, a.ip_hash, a.request_id, a.created_at
       FROM admin_audit_logs a
       LEFT JOIN usuarios u ON a.actor_user_id = u.id
       WHERE ${whereClause}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );

    res.set("Cache-Control", "no-store");
    res.json({
      items: result.rows.map((r) => ({ ...r, created_at: toISO(r.created_at) })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Obter os logs do sistema paginados, filtrados no timezone IANA e com redação defensiva
exports.getSystemLogs = async (req, res, next) => {
  const { startDate, endDate, userId, level = "", route = "", timezone } = req.query;
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });

  if (startDate && !isISODate(startDate)) {
    return res.status(400).json({ error: "Parâmetro startDate inválido." });
  }
  if (endDate && !isISODate(endDate)) {
    return res.status(400).json({ error: "Parâmetro endDate inválido." });
  }

  const tzRes = resolveTimezoneParam(timezone);
  if (tzRes.error) return res.status(400).json({ error: tzRes.error });

  if (level && level !== "all" && !["error", "critical", "warning", "info"].includes(level)) {
    return res.status(400).json({ error: "Parâmetro level inválido." });
  }

  let parsedUserId = null;
  if (userId !== undefined && userId !== "" && userId !== "all") {
    parsedUserId = parseStrictPositiveInt(userId);
    if (!parsedUserId) {
      return res.status(400).json({ error: "Parâmetro userId inválido." });
    }
  }

  try {
    const conditions = ["1=1"];
    const params = [];

    if (startDate) {
      params.push(startDate.trim(), tzRes.timezone);
      conditions.push(
        `l.created_at >= ($${params.length - 1}::date::timestamp AT TIME ZONE $${params.length})`,
      );
    }
    if (endDate) {
      params.push(endDate.trim(), tzRes.timezone);
      conditions.push(
        `l.created_at < (($${params.length - 1}::date + INTERVAL '1 day')::timestamp AT TIME ZONE $${params.length})`,
      );
    }
    if (parsedUserId) {
      params.push(parsedUserId);
      conditions.push(`l.user_id = $${params.length}`);
    }
    if (level && level !== "all") {
      params.push(level);
      conditions.push(`l.level = $${params.length}`);
    }
    const routeQ = String(route || "").trim();
    if (routeQ) {
      params.push(`%${routeQ.slice(0, 80)}%`);
      conditions.push(`COALESCE(l.route, '') ILIKE $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");
    const listParams = [...params, limit, offset];
    const summaryTzParam = params.length + 1;

    const [summaryRes, byDayRes, result] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE l.level IN ('error', 'critical'))::int AS total_errors,
           COUNT(*) FILTER (WHERE l.level = 'warning')::int AS total_warnings,
           COUNT(*) FILTER (WHERE l.level = 'info')::int AS total_infos
         FROM system_logs l
         WHERE ${whereClause}`,
        params,
      ),
      pool.query(
        `SELECT
           TO_CHAR(l.created_at AT TIME ZONE $${summaryTzParam}, 'YYYY-MM-DD') AS date,
           COUNT(*)::int AS count
         FROM system_logs l
         WHERE ${whereClause} AND l.level IN ('error', 'critical')
         GROUP BY 1
         ORDER BY 1 ASC
         LIMIT 60`,
        [...params, tzRes.timezone],
      ),
      pool.query(
        `SELECT l.id, l.level, l.message, l.route, l.created_at, l.user_id, u.username
         FROM system_logs l
         LEFT JOIN usuarios u ON l.user_id = u.id
         WHERE ${whereClause}
         ORDER BY l.created_at DESC, l.id DESC
         LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams,
      ),
    ]);

    const s = summaryRes.rows[0] || {};
    const total = Number(s.total || 0);

    res.set("Cache-Control", "no-store");
    res.json({
      items: result.rows.map((row) => ({
        ...row,
        message: sanitizeLogMessage(row.message),
        created_at: toISO(row.created_at),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        totalErrors: Number(s.total_errors || 0),
        totalWarnings: Number(s.total_warnings || 0),
        totalInfos: Number(s.total_infos || 0),
        errorsByDate: byDayRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};
