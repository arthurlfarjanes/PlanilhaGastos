// Verificação de integração contra o banco do .env (use SOMENTE em branch dev).
// Cria 2 usuários temporários, exercita o controller real e remove tudo no final.
require("dotenv").config();
const assert = require("node:assert");
const pool = require("../config/db");
const c = require("../controllers/preferenciasController");

const call = (fn, req) =>
  new Promise((resolve, reject) => {
    const res = { statusCode: 200, status(s) { this.statusCode = s; return this; }, json(b) { resolve({ status: this.statusCode, body: b }); } };
    fn(req, res, reject);
  });

(async () => {
  const tag = `tmp_pref_${Date.now()}`;
  const ids = [];
  try {
    const before = await pool.query("SELECT COUNT(*)::int AS n FROM usuarios");
    for (const s of ["a", "b"]) {
      const r = await pool.query("INSERT INTO usuarios (username, password_hash) VALUES ($1, 'x') RETURNING id", [`${tag}_${s}`]);
      ids.push(r.rows[0].id);
    }
    const [A, B] = ids;
    await call(c.atualizarPreferencias, { user: { userId: A }, body: { appearance: { theme: "light" } } });
    await call(c.atualizarPreferencias, { user: { userId: A }, body: { appearance: { accent: "rose" }, financial: { currency: "USD" } } });
    await call(c.atualizarPreferencias, { user: { userId: B }, body: { appearance: { theme: "auto" } } });
    const a = (await call(c.obterPreferencias, { user: { userId: A } })).body;
    const b = (await call(c.obterPreferencias, { user: { userId: B } })).body;
    assert.strictEqual(a.appearance.theme, "light");
    assert.strictEqual(a.appearance.accent, "rose");
    assert.strictEqual(a.financial.currency, "USD");
    assert.strictEqual(b.appearance.theme, "auto");
    assert.strictEqual(b.appearance.accent, "emerald");
    assert.strictEqual(b.financial.currency, "BRL");
    // concorrência: patches simultâneos em seções distintas não se perdem
    await Promise.all([
      call(c.atualizarPreferencias, { user: { userId: A }, body: { dashboard: { defaultPeriod: "last_30_days" } } }),
      call(c.atualizarPreferencias, { user: { userId: A }, body: { financial: { periodStartDay: 10 } } }),
    ]);
    const a2 = (await call(c.obterPreferencias, { user: { userId: A } })).body;
    assert.strictEqual(a2.dashboard.defaultPeriod, "last_30_days");
    assert.strictEqual(a2.financial.periodStartDay, 10);
    assert.strictEqual(a2.appearance.accent, "rose");
    await call(c.restaurarPadroes, { user: { userId: A } });
    assert.strictEqual((await call(c.obterPreferencias, { user: { userId: A } })).body.appearance.theme, "dark");
    assert.strictEqual((await call(c.obterPreferencias, { user: { userId: B } })).body.appearance.theme, "auto");
    // cascade na exclusão do usuário
    await pool.query("DELETE FROM usuarios WHERE id = $1", [B]);
    ids.pop();
    const left = await pool.query("SELECT 1 FROM user_preferences WHERE user_id = $1", [B]);
    assert.strictEqual(left.rowCount, 0);
    console.log("OK: persistência, merge, concorrência, isolamento, reset e CASCADE verificados no Neon.");
    const after = await pool.query("SELECT COUNT(*)::int AS n FROM usuarios");
    console.log(`usuarios antes=${before.rows[0].n}, durante/depois (antes da limpeza)=${after.rows[0].n}`);
  } finally {
    if (ids.length) await pool.query("DELETE FROM usuarios WHERE id = ANY($1)", [ids]);
    const final = await pool.query("SELECT COUNT(*)::int AS n FROM usuarios");
    console.log(`usuarios após limpeza=${final.rows[0].n}`);
    await pool.end();
  }
})().catch((e) => {
  console.error("FALHA:", e.message);
  process.exit(1);
});

