/**
 * Serviço de contabilização de uso e controle de limites gratuitos no Postgres.
 * Diferencia explicitamente o limite individual definido pela aplicação
 * da franquia global gratuita do provedor (sem inventar conversões).
 */
const pool = require("../config/db");
const { listFreeProviders } = require("./providers");

const DEFAULT_USER_DAILY_LIMIT = 20;

function getUserDailyLimit() {
  const raw = Number(process.env.AI_USER_DAILY_LIMIT);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_USER_DAILY_LIMIT;
}

function currentUtcDateISO(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

async function getUsageSummary(userId, provider, db = pool, refDateUTC = currentUtcDateISO()) {
  const userDailyLimit = getUserDailyLimit();

  const [userRes, globalRes, quotaRes] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'ok')::int AS requests_ok_today,
         COUNT(*) FILTER (WHERE status = 'erro' OR status = 'indisponivel')::int AS requests_failed_today,
         COALESCE(SUM(total_tokens) FILTER (WHERE status = 'ok'), 0)::int AS tokens_recorded_today
       FROM ai_usage_logs
       WHERE user_id = $1 AND usage_date_utc = $2::date`,
      [userId, refDateUTC],
    ),
    db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'ok')::int AS global_requests_ok_today,
         COALESCE(SUM(neurons), 0)::int AS global_neurons_recorded_today,
         COALESCE(SUM(total_tokens) FILTER (WHERE status = 'ok'), 0)::int AS global_tokens_recorded_today
       FROM ai_usage_logs
       WHERE provider = $1 AND usage_date_utc = $2::date`,
      [provider.id, refDateUTC],
    ),
    db.query(
      `SELECT 1 FROM ai_usage_logs
       WHERE provider = $1 AND usage_date_utc = $2::date AND status = 'quota_excedida'
       LIMIT 1`,
      [provider.id, refDateUTC],
    ),
  ]);

  const userUsed = Number(userRes.rows[0]?.requests_ok_today || 0);
  const globalNeuronsRecorded = Number(globalRes.rows[0]?.global_neurons_recorded_today || 0);
  const providerDailyNeuronsLimit = provider?.freeTierInfo?.dailyNeuronsLimit ?? null;
  const providerQuotaExhausted = quotaRes.rowCount > 0;

  return {
    utcDate: refDateUTC,
    applicationIndividualLimit: {
      dailyRequestsLimit: userDailyLimit,
      requestsUsedToday: userUsed,
      requestsRemainingToday: Math.max(0, userDailyLimit - userUsed),
      tokensRecordedToday: Number(userRes.rows[0]?.tokens_recorded_today || 0),
      scopeLabel: "Limite individual por usuário (definido pelo MeFinance)",
    },
    providerFreeTier: {
      providerId: provider.id,
      providerName: provider.name,
      model: provider.model,
      requiresCard: Boolean(provider?.freeTierInfo?.requiresCard === false ? false : false),
      resetSchedule: provider?.freeTierInfo?.resetSchedule || "00:00 UTC",
      summary: provider?.freeTierInfo?.summary || "",
      dailyNeuronsLimit: providerDailyNeuronsLimit,
      neuronsRecordedByAppToday: providerDailyNeuronsLimit !== null ? globalNeuronsRecorded : null,
      tokensRecordedByAppToday: Number(globalRes.rows[0]?.global_tokens_recorded_today || 0),
      requestsRecordedByAppToday: Number(globalRes.rows[0]?.global_requests_ok_today || 0),
      quotaExhaustedToday: providerQuotaExhausted,
      scopeLabel: "Franquia global gratuita do provedor (compartilhada pela aplicação)",
    },
  };
}

async function recordUsage(
  {
    userId,
    provider,
    model,
    status,
    promptTokens = null,
    completionTokens = null,
    totalTokens = null,
    neurons = null,
    latencyMs = null,
  },
  db = pool,
  refDateUTC = currentUtcDateISO(),
) {
  await db.query(
    `INSERT INTO ai_usage_logs
       (user_id, provider, model, status, prompt_tokens, completion_tokens, total_tokens, neurons, latency_ms, usage_date_utc)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::date)`,
    [
      userId,
      provider,
      model || "none",
      status,
      promptTokens,
      completionTokens,
      totalTokens,
      neurons,
      latencyMs,
      refDateUTC,
    ],
  );
}

async function getProvidersAvailability(activeProviderId, db = pool, refDateUTC = currentUtcDateISO(), envConfigs = {}) {
  const all = listFreeProviders(envConfigs);
  const quotaRows = await db.query(
    `SELECT DISTINCT provider
     FROM ai_usage_logs
     WHERE usage_date_utc = $1::date AND status = 'quota_excedida'`,
    [refDateUTC],
  );
  const exhaustedSet = new Set(quotaRows.rows.map((r) => r.provider));

  const availableProviders = all.map((p) => ({
    id: p.id,
    name: p.name,
    model: p.model,
    configured: p.configured,
    quotaExhaustedToday: exhaustedSet.has(p.id),
    summary: p.freeTierInfo?.summary || "",
  }));

  const suggestedAlternativeProvider =
    availableProviders.find(
      (p) => p.id !== activeProviderId && p.configured && !p.quotaExhaustedToday,
    ) || null;

  return {
    availableProviders,
    suggestedAlternativeProvider,
  };
}

module.exports = {
  DEFAULT_USER_DAILY_LIMIT,
  getUserDailyLimit,
  currentUtcDateISO,
  getUsageSummary,
  getProvidersAvailability,
  recordUsage,
};
