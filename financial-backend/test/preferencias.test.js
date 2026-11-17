const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

const { validatePatch, withDefaults, DEFAULTS } = require("../utils/preferencias");

test("validatePatch aceita patch parcial válido", () => {
  const r = validatePatch({
    appearance: { theme: "auto", accent: "blue", navLayout: "sidebar" },
    financial: { periodStartDay: 5 },
    notifications: { enabled: false, daysAhead: 10, remindGoals: false },
  });
  assert.ok(r.value);
  assert.strictEqual(r.value.appearance.theme, "auto");
  assert.strictEqual(r.value.appearance.navLayout, "sidebar");
  assert.strictEqual(r.value.notifications.daysAhead, 10);
});

test("validatePatch rejeita seção/chave/valor inválidos", () => {
  assert.ok(validatePatch({ foo: {} }).error);
  assert.ok(validatePatch({ appearance: { nope: 1 } }).error);
  assert.ok(validatePatch({ appearance: { theme: "neon" } }).error);
  assert.ok(validatePatch({ appearance: { navLayout: "top" } }).error);
  assert.ok(validatePatch({ financial: { periodStartDay: 31 } }).error);
  assert.ok(validatePatch({ financial: { timezone: "Marte/Olimpo" } }).error);
  assert.ok(validatePatch({ notifications: { daysAhead: 90 } }).error);
  assert.ok(validatePatch({ notifications: { enabled: "sim" } }).error);
  assert.ok(validatePatch({ dashboard: { cardOrder: ["saldo"] } }).error);
  assert.ok(validatePatch({ dashboard: { hiddenCards: ["x"] } }).error);
  assert.ok(validatePatch(null).error);
  assert.ok(validatePatch([]).error);
});

test("withDefaults preenche faltantes e ignora valores inválidos salvos", () => {
  const r = withDefaults({ appearance: { theme: "light", accent: "invalido" }, lixo: {} });
  assert.strictEqual(r.appearance.theme, "light");
  assert.strictEqual(r.appearance.accent, DEFAULTS.appearance.accent);
  assert.strictEqual(r.financial.currency, "BRL");
  assert.strictEqual(r.lixo, undefined);
});

// ---- Controller com pool simulado em memória (isolamento por usuário) ----
function makeFakePool() {
  const rows = new Map(); // user_id -> preferences
  const handle = async (sql, params = []) => {
    if (/^BEGIN|^COMMIT|^ROLLBACK/.test(sql)) return { rows: [] };
    if (/INSERT INTO user_preferences/.test(sql)) {
      if (!rows.has(params[0])) rows.set(params[0], {});
      return { rows: [] };
    }
    if (/SELECT preferences/.test(sql)) {
      return { rows: rows.has(params[0]) ? [{ preferences: rows.get(params[0]) }] : [] };
    }
    if (/UPDATE user_preferences/.test(sql)) {
      rows.set(params[0], JSON.parse(params[1]));
      return { rows: [] };
    }
    if (/DELETE FROM user_preferences/.test(sql)) {
      rows.delete(params[0]);
      return { rows: [] };
    }
    throw new Error("SQL inesperado: " + sql);
  };
  return { query: handle, connect: async () => ({ query: handle, release() {} }), rows };
}

function loadController(fake) {
  const dbPath = require.resolve("../config/db");
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fake };
  const ctrlPath = require.resolve("../controllers/preferenciasController");
  delete require.cache[ctrlPath];
  return require(ctrlPath);
}

const call = (fn, req) =>
  new Promise((resolve, reject) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { resolve({ status: this.statusCode, body: b }); } };
    fn(req, res, reject);
  });

test("persistência e isolamento entre usuários", async () => {
  const fake = makeFakePool();
  const c = loadController(fake);

  await call(c.atualizarPreferencias, { user: { userId: 1 }, body: { appearance: { theme: "light" } } });
  await call(c.atualizarPreferencias, { user: { userId: 1 }, body: { appearance: { accent: "rose" } } });
  await call(c.atualizarPreferencias, { user: { userId: 2 }, body: { appearance: { theme: "auto" } } });

  const u1 = await call(c.obterPreferencias, { user: { userId: 1 } });
  const u2 = await call(c.obterPreferencias, { user: { userId: 2 } });
  const u3 = await call(c.obterPreferencias, { user: { userId: 3 } });

  assert.strictEqual(u1.body.appearance.theme, "light");
  assert.strictEqual(u1.body.appearance.accent, "rose"); // merge preservou o patch anterior
  assert.strictEqual(u2.body.appearance.theme, "auto");
  assert.strictEqual(u2.body.appearance.accent, "emerald");
  assert.deepStrictEqual(u3.body, withDefaults(null));

  // userId do corpo é ignorado (rejeitado como seção desconhecida)
  const bad = await call(c.atualizarPreferencias, { user: { userId: 1 }, body: { user_id: 2 } });
  assert.strictEqual(bad.status, 400);

  await call(c.restaurarPadroes, { user: { userId: 1 } });
  assert.strictEqual(fake.rows.has(1), false);
  assert.strictEqual(fake.rows.has(2), true);
});

test("validatePatch valida seção help (Teco Ajuda) e rejeita valores inválidos", () => {
  const valid = validatePatch({
    help: {
      completedTours: ["primeiros-passos", "comparativo"],
      activeTour: { id: "orcamentos", step: 2, version: 1 },
      dismissedHints: ["hint-comparativo-saldo"],
      tipsEnabled: false,
      tourVersion: { "primeiros-passos": 1, comparativo: 2 },
    },
  });
  assert.ok(valid.value);
  assert.deepStrictEqual(valid.value.help.completedTours, ["primeiros-passos", "comparativo"]);
  assert.strictEqual(valid.value.help.activeTour.step, 2);
  assert.strictEqual(valid.value.help.tipsEnabled, false);

  const clearActive = validatePatch({ help: { activeTour: null } });
  assert.ok(clearActive.value);
  assert.strictEqual(clearActive.value.help.activeTour, null);

  assert.ok(validatePatch({ help: { completedTours: ["Inválido!"] } }).error);
  assert.ok(validatePatch({ help: { completedTours: ["dup", "dup"] } }).error);
  assert.ok(validatePatch({ help: { activeTour: { id: "ok", step: -1, version: 1 } } }).error);
  assert.ok(validatePatch({ help: { activeTour: { id: "ok", step: 0, version: 0 } } }).error);
  assert.ok(validatePatch({ help: { activeTour: { id: "ok", step: 0, version: 1, extra: true } } }).error);
  assert.ok(validatePatch({ help: { tipsEnabled: "sim" } }).error);
  assert.ok(validatePatch({ help: { tourVersion: { ok: "1" } } }).error);
});

