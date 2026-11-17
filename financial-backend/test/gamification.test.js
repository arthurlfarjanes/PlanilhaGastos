const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TOUR_DEFS,
  MAX_XP,
  MAX_AI_BONUS_REQUESTS,
  computeGamificationState,
  getUserGamification,
} = require("../utils/gamification");

test("computeGamificationState calcula nível inicial, XP e bônus zero sem conquistas", () => {
  const s = computeGamificationState({ completedTours: [], missionFlags: {} });
  assert.strictEqual(s.xp, 0);
  assert.strictEqual(s.maxXp, 1000);
  assert.strictEqual(s.level.level, 1);
  assert.strictEqual(s.level.name, "Aprendiz");
  assert.strictEqual(s.aiQuotaBonus, 0);
  assert.strictEqual(s.goldCertificate.unlocked, false);
});

test("computeGamificationState ignora IDs falsos/duplicados e concede bônus por trilha completa", () => {
  const s = computeGamificationState({
    completedTours: [
      "primeiros-passos",
      "primeiros-passos",
      "tour-inventado",
      "orcamentos",
      "objetivos",
      "projecoes",
    ],
    missionFlags: {
      primeira_transacao: true,
      primeiro_orcamento: true,
    },
  });

  // 100 (primeiros-passos) + 3*50 (planejamento) + 2*40 (missões) = 330 XP
  assert.strictEqual(s.xp, 330);
  assert.strictEqual(s.toursCompletedCount, 4);
  assert.strictEqual(s.missionsCompletedCount, 2);
  assert.strictEqual(s.level.level, 2);
  assert.strictEqual(s.level.name, "Organizado");
  // Trilhas explorador (+2) e planejamento (+2) = +4 consultas/dia
  assert.strictEqual(s.aiQuotaBonus, 4);
});

test("computeGamificationState atinge Mestre MeFinance, Certificado Ouro e teto de +10 consultas", () => {
  const s = computeGamificationState({
    completedTours: TOUR_DEFS.map((t) => t.id),
    missionFlags: {
      primeira_transacao: true,
      primeira_fixa: true,
      primeiro_orcamento: true,
      primeiro_objetivo: true,
      primeiro_patrimonio_ou_cartao: true,
    },
  });

  assert.strictEqual(s.xp, MAX_XP);
  assert.strictEqual(s.overallProgressPct, 100);
  assert.strictEqual(s.level.level, 5);
  assert.strictEqual(s.level.name, "Mestre MeFinance");
  assert.strictEqual(s.goldCertificate.unlocked, true);
  assert.strictEqual(s.aiQuotaBonus, MAX_AI_BONUS_REQUESTS);
});

test("getUserGamification aplica filtro temporal a partir de app_feature_epochs (teco_gamification_v1)", async () => {
  let capturedSql = "";
  const fakeDb = {
    async query(sql, params) {
      capturedSql = sql;
      assert.deepStrictEqual(params, [42]);
      return {
        rows: [
          {
            since_at: new Date("2026-11-17T17:00:00.000Z"),
            preferences: { help: { completedTours: ["primeiros-passos"] } },
            primeira_transacao: false,
            primeira_fixa: false,
            primeiro_orcamento: true,
            primeiro_objetivo: false,
            primeiro_patrimonio_ou_cartao: false,
          },
        ],
      };
    },
  };

  const s = await getUserGamification(42, fakeDb);
  assert.match(capturedSql, /app_feature_epochs/);
  assert.match(capturedSql, /created_at >= epoch\.since_at/);
  assert.strictEqual(s.sinceAt, "2026-11-17T17:00:00.000Z");
  assert.strictEqual(s.xp, 140); // 100 tour + 40 orçamento criado após o marco
  assert.strictEqual(s.missionsCompletedCount, 1);
});
