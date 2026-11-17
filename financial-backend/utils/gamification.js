/**
 * Motor determinístico de Gamificação do Teco (Subfase 3.5).
 * Calcula XP, níveis de maestria, badges por tour, certificados por trilha,
 * missões práticas de organização financeira e bônus de consultas diárias no Assistente.
 */

const { withDefaults } = require("./preferencias");

const TOUR_DEFS = Object.freeze([
  { id: "primeiros-passos", title: "Primeiros Passos", xp: 100, trackId: "explorador" },
  { id: "comparativo", title: "Dashboard", xp: 50, trackId: "gestao" },
  { id: "dashboard", title: "Transações", xp: 50, trackId: "gestao" },
  { id: "gastos-fixos", title: "Transações Fixas", xp: 50, trackId: "gestao" },
  { id: "cartoes", title: "Cartões de Crédito", xp: 50, trackId: "gestao" },
  { id: "dividas", title: "Dívidas", xp: 50, trackId: "gestao" },
  { id: "patrimonio", title: "Patrimônio", xp: 50, trackId: "gestao" },
  { id: "orcamentos", title: "Orçamentos", xp: 50, trackId: "planejamento" },
  { id: "objetivos", title: "Objetivos", xp: 50, trackId: "planejamento" },
  { id: "projecoes", title: "Projeções", xp: 50, trackId: "planejamento" },
  { id: "diagnosticos", title: "Diagnósticos", xp: 50, trackId: "inteligencia" },
  { id: "classificacao", title: "Classificação", xp: 50, trackId: "inteligencia" },
  { id: "otimizacao", title: "Otimização", xp: 50, trackId: "inteligencia" },
  { id: "relatorios", title: "Relatórios", xp: 50, trackId: "inteligencia" },
  { id: "configuracoes", title: "Configurações & LGPD", xp: 50, trackId: "sistema" },
]);

const TOUR_ID_SET = new Set(TOUR_DEFS.map((t) => t.id));

const TRACK_DEFS = Object.freeze([
  {
    id: "explorador",
    title: "Explorador Inicial",
    description: "Concluiu o tour guiado multi-rota Primeiros Passos.",
    tourIds: ["primeiros-passos"],
    aiBonusRequests: 2,
  },
  {
    id: "gestao",
    title: "Domínio da Gestão",
    description: "Dominou Dashboard, Transações, Fixas, Cartões, Dívidas e Patrimônio.",
    tourIds: ["comparativo", "dashboard", "gastos-fixos", "cartoes", "dividas", "patrimonio"],
    aiBonusRequests: 2,
  },
  {
    id: "planejamento",
    title: "Mestre do Planejamento",
    description: "Concluiu os tours de Orçamentos, Objetivos e Projeções.",
    tourIds: ["orcamentos", "objetivos", "projecoes"],
    aiBonusRequests: 2,
  },
  {
    id: "inteligencia",
    title: "Analista Inteligente",
    description: "Explorou Diagnósticos, Classificação, Otimização e Relatórios.",
    tourIds: ["diagnosticos", "classificacao", "otimizacao", "relatorios"],
    aiBonusRequests: 2,
  },
  {
    id: "sistema",
    title: "Guardião & Preferências",
    description: "Personalizou fuso horário, acessibilidade e privacidade LGPD.",
    tourIds: ["configuracoes"],
    aiBonusRequests: 1,
  },
]);

const MISSION_DEFS = Object.freeze([
  {
    id: "primeira_transacao",
    title: "Primeiro lançamento",
    description: "Registre ao menos 1 receita ou despesa no extrato.",
    xp: 40,
    route: "/dashboard",
  },
  {
    id: "primeira_fixa",
    title: "Rotina automatizada",
    description: "Cadastre ao menos 1 conta fixa ou assinatura.",
    xp: 40,
    route: "/gastos-fixos",
  },
  {
    id: "primeiro_orcamento",
    title: "Limite saudável",
    description: "Ative ao menos 1 orçamento mensal por categoria.",
    xp: 40,
    route: "/orcamentos",
  },
  {
    id: "primeiro_objetivo",
    title: "Meta no horizonte",
    description: "Defina ao menos 1 objetivo financeiro.",
    xp: 40,
    route: "/objetivos",
  },
  {
    id: "primeiro_patrimonio_ou_cartao",
    title: "Controle patrimonial",
    description: "Cadastre um ativo de patrimônio ou cartão para acompanhar.",
    xp: 40,
    route: "/patrimonio",
  },
]);

const LEVELS = Object.freeze([
  { level: 1, name: "Aprendiz", minXp: 0 },
  { level: 2, name: "Organizado", minXp: 150 },
  { level: 3, name: "Estrategista", minXp: 350 },
  { level: 4, name: "Especialista", minXp: 600 },
  { level: 5, name: "Mestre MeFinance", minXp: 850 },
]);

const MAX_XP =
  TOUR_DEFS.reduce((acc, t) => acc + t.xp, 0) +
  MISSION_DEFS.reduce((acc, m) => acc + m.xp, 0);

const MAX_AI_BONUS_REQUESTS = 10;

function resolveLevel(xp) {
  let current = LEVELS[0];
  let next = LEVELS[1] || null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }
  const progressInLevelPct = next
    ? Math.min(100, Math.round(((xp - current.minXp) * 100) / (next.minXp - current.minXp)))
    : 100;
  return {
    level: current.level,
    name: current.name,
    minXp: current.minXp,
    nextLevel: next
      ? { level: next.level, name: next.name, minXp: next.minXp, xpMissing: Math.max(0, next.minXp - xp) }
      : null,
    progressInLevelPct,
  };
}

function computeGamificationState({ completedTours = [], missionFlags = {}, sinceAt = null } = {}) {
  const validTours = new Set(
    (Array.isArray(completedTours) ? completedTours : []).filter((id) => TOUR_ID_SET.has(id)),
  );

  const tourBadges = TOUR_DEFS.map((t) => ({
    id: t.id,
    title: t.title,
    xp: t.xp,
    trackId: t.trackId,
    unlocked: validTours.has(t.id),
  }));

  const tracks = TRACK_DEFS.map((tr) => {
    const completedCount = tr.tourIds.filter((id) => validTours.has(id)).length;
    const totalCount = tr.tourIds.length;
    const unlocked = completedCount === totalCount;
    return {
      id: tr.id,
      title: tr.title,
      description: tr.description,
      completedCount,
      totalCount,
      aiBonusRequests: tr.aiBonusRequests,
      unlocked,
    };
  });

  const missions = MISSION_DEFS.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    xp: m.xp,
    route: m.route,
    completed: Boolean(missionFlags[m.id]),
  }));

  const toursCompletedCount = tourBadges.filter((b) => b.unlocked).length;
  const missionsCompletedCount = missions.filter((m) => m.completed).length;
  const allToursCompleted = toursCompletedCount === TOUR_DEFS.length;
  const allMissionsCompleted = missionsCompletedCount === MISSION_DEFS.length;

  const tourXp = tourBadges.reduce((acc, b) => acc + (b.unlocked ? b.xp : 0), 0);
  const missionXp = missions.reduce((acc, m) => acc + (m.completed ? m.xp : 0), 0);
  const xp = tourXp + missionXp;

  const trackBonus = tracks.reduce((acc, tr) => acc + (tr.unlocked ? tr.aiBonusRequests : 0), 0);
  const missionBonus = allMissionsCompleted ? 1 : 0;
  const aiQuotaBonus = Math.min(MAX_AI_BONUS_REQUESTS, trackBonus + missionBonus);

  const levelInfo = resolveLevel(xp);

  return {
    sinceAt,
    xp,
    maxXp: MAX_XP,
    overallProgressPct: Math.min(100, Math.round((xp * 100) / MAX_XP)),
    toursCompletedCount,
    toursTotalCount: TOUR_DEFS.length,
    missionsCompletedCount,
    missionsTotalCount: MISSION_DEFS.length,
    level: levelInfo,
    goldCertificate: {
      id: "certificado-ouro-mefinance",
      title: "Certificado Ouro MeFinance",
      description: "Todos os 15 tours guiados concluídos.",
      unlocked: allToursCompleted,
    },
    aiQuotaBonus,
    maxAiQuotaBonus: MAX_AI_BONUS_REQUESTS,
    tracks,
    tourBadges,
    missions,
  };
}

async function getUserGamification(userId, db) {
  const conn = db || require("../config/db");
  const result = await conn.query(
    `WITH epoch AS (
       SELECT COALESCE(
         (SELECT activated_at FROM app_feature_epochs WHERE feature_key = 'teco_gamification_v1'),
         NOW()
       ) AS since_at
     )
     SELECT
       (SELECT since_at FROM epoch) AS since_at,
       (SELECT preferences FROM user_preferences WHERE user_id = $1) AS preferences,
       EXISTS(SELECT 1 FROM transacoes, epoch WHERE user_id = $1 AND created_at >= epoch.since_at) AS primeira_transacao,
       EXISTS(SELECT 1 FROM gastos_fixos, epoch WHERE usuario_id = $1 AND (criado_em AT TIME ZONE 'UTC') >= epoch.since_at) AS primeira_fixa,
       EXISTS(SELECT 1 FROM orcamentos, epoch WHERE user_id = $1 AND ativo = TRUE AND created_at >= epoch.since_at) AS primeiro_orcamento,
       EXISTS(SELECT 1 FROM objetivos, epoch WHERE user_id = $1 AND created_at >= epoch.since_at) AS primeiro_objetivo,
       (
         EXISTS(SELECT 1 FROM patrimonio_itens, epoch WHERE user_id = $1 AND ativo = TRUE AND created_at >= epoch.since_at)
         OR EXISTS(SELECT 1 FROM cartoes, epoch WHERE user_id = $1 AND ativo = TRUE AND created_at >= epoch.since_at)
       ) AS primeiro_patrimonio_ou_cartao`,
    [userId],
  );

  const row = result.rows[0] || {};
  const prefs = withDefaults(row.preferences);
  const completedTours = prefs.help?.completedTours || [];

  return computeGamificationState({
    sinceAt: row.since_at instanceof Date ? row.since_at.toISOString() : row.since_at || null,
    completedTours,
    missionFlags: {
      primeira_transacao: row.primeira_transacao,
      primeira_fixa: row.primeira_fixa,
      primeiro_orcamento: row.primeiro_orcamento,
      primeiro_objetivo: row.primeiro_objetivo,
      primeiro_patrimonio_ou_cartao: row.primeiro_patrimonio_ou_cartao,
    },
  });
}

module.exports = {
  TOUR_DEFS,
  TRACK_DEFS,
  MISSION_DEFS,
  LEVELS,
  MAX_XP,
  MAX_AI_BONUS_REQUESTS,
  computeGamificationState,
  getUserGamification,
};
