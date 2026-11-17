const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config();

const { sanitizeLogMessage, hashClientIp } = require("../utils/adminAudit");

const hasDbAndJwt = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe("Admin Audit & Sanitização (unitário)", () => {
  it("sanitizeLogMessage redige Bearer tokens, JWTs e secrets", () => {
    const raw =
      "Falha auth Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjF9.signature123 password=Segredo123!";
    const clean = sanitizeLogMessage(raw);
    assert.equal(clean.includes("signature123"), false);
    assert.equal(clean.includes("Segredo123!"), false);
    assert.match(clean, /\[REDACTED\]/);
  });

  it("hashClientIp gera hash irreversível estável e retorna null sem IP", () => {
    assert.equal(hashClientIp(null), null);
    const h1 = hashClientIp("187.10.20.30");
    const h2 = hashClientIp("187.10.20.30");
    assert.ok(h1 && h1.length === 24);
    assert.equal(h1, h2);
    assert.equal(h1.includes("187.10.20.30"), false);
  });
});

describe("Admin Segurança, Privacidade, Paginação e Auditoria (HTTP)", { skip: !hasDbAndJwt }, () => {
  let server;
  let baseUrl;
  let pool;
  const createdUserIds = [];

  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const regularCreds = { username: `adm_sec_u_${unique}`, password: "UserPass@2026" };
  const adminCreds = { username: `adm_sec_a_${unique}`, password: "AdminPass@2026" };
  let regularToken = "";
  let adminToken = "";
  let regularId = null;
  let adminId = null;

  async function api(path, { method = "GET", token = null, body = undefined } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    return { status: res.status, body: json };
  }

  before(async () => {
    const app = require("../app");
    pool = require("../config/db");
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });

    const regReg = await api("/register", { method: "POST", body: regularCreds });
    assert.equal(regReg.status, 201);
    regularId = regReg.body.user.id;
    createdUserIds.push(regularId);
    const regLogin = await api("/login", { method: "POST", body: regularCreds });
    assert.equal(regLogin.status, 200);
    regularToken = regLogin.body.token;

    const regAdm = await api("/register", { method: "POST", body: adminCreds });
    assert.equal(regAdm.status, 201);
    adminId = regAdm.body.user.id;
    createdUserIds.push(adminId);

    await pool.query("UPDATE usuarios SET role = 'admin' WHERE id = $1", [adminId]);
    const admLogin = await api("/login", { method: "POST", body: adminCreds });
    assert.equal(admLogin.status, 200);
    adminToken = admLogin.body.token;
  });

  after(async () => {
    if (pool && createdUserIds.length > 0) {
      await pool
        .query("DELETE FROM admin_audit_logs WHERE actor_user_id = ANY($1) OR target_id = ANY($1)", [
          createdUserIds,
        ])
        .catch(() => {});
      await pool
        .query("UPDATE system_logs SET user_id = NULL WHERE user_id = ANY($1)", [createdUserIds])
        .catch(() => {});
      await pool.query("DELETE FROM usuarios WHERE id = ANY($1)", [createdUserIds]).catch(() => {});
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("bloqueia acesso anônimo (401) e usuário comum (403) em todas as rotas /admin", async () => {
    const routes = [
      "/admin/overview",
      "/admin/health",
      "/admin/ai-metrics",
      "/admin/audit",
      "/admin/users",
      `/admin/users/${regularId}/summary`,
      "/admin/logs",
    ];
    for (const r of routes) {
      const anon = await api(r);
      assert.equal(anon.status, 401, `esperava 401 anônimo em ${r}`);

      const userRes = await api(r, { token: regularToken });
      assert.equal(userRes.status, 403, `esperava 403 usuário comum em ${r}`);
    }
  });

  it("remove endpoint de transações privadas de usuário e expõe apenas resumo administrativo", async () => {
    const removed = await api(`/admin/users/${regularId}/transactions`, { token: adminToken });
    assert.equal(removed.status, 404);

    const summary = await api(`/admin/users/${regularId}/summary`, { token: adminToken });
    assert.equal(summary.status, 200);
    assert.equal(summary.body.user.id, regularId);
    assert.equal(summary.body.user.password_hash, undefined);
    assert.equal(summary.body.transacoes, undefined);
    assert.ok(typeof summary.body.activity.aiRequestsTotal === "number");
  });

  it("retorna overview, health, ai-metrics agregados e users paginados sem segredos", async () => {
    const [ov, hl, ai, us] = await Promise.all([
      api("/admin/overview", { token: adminToken }),
      api("/admin/health", { token: adminToken }),
      api("/admin/ai-metrics?days=7", { token: adminToken }),
      api(`/admin/users?search=${encodeURIComponent(regularCreds.username)}&page=1&limit=10`, {
        token: adminToken,
      }),
    ]);

    assert.equal(ov.status, 200);
    assert.ok(ov.body.users.total >= 2);
    assert.equal(hl.status, 200);
    assert.equal(hl.body.database.status, "ok");
    assert.equal(ai.status, 200);
    assert.ok(Array.isArray(ai.body.providersStatus));
    assert.equal(ai.body.messages, undefined);
    assert.equal(us.status, 200);
    assert.equal(us.body.items.length, 1);
    assert.equal(us.body.items[0].username, regularCreds.username);
    assert.ok(us.body.pagination.total >= 1);
  });

  it("impede auto-rebaixamento, exige senha em ações críticas e grava auditoria", async () => {
    const selfDemote = await api(`/admin/users/${adminId}`, {
      method: "PUT",
      token: adminToken,
      body: {
        username: adminCreds.username,
        email: `${adminCreds.username}@example.com`,
        role: "user",
        adminPassword: adminCreds.password,
      },
    });
    assert.equal(selfDemote.status, 403);

    const resetNoPass = await api(`/admin/users/${regularId}/reset-password`, {
      method: "POST",
      token: adminToken,
      body: {},
    });
    assert.equal(resetNoPass.status, 400);

    const resetOk = await api(`/admin/users/${regularId}/reset-password`, {
      method: "POST",
      token: adminToken,
      body: { adminPassword: adminCreds.password },
    });
    assert.equal(resetOk.status, 200);
    assert.ok(resetOk.body.tempPassword);

    const audit = await api("/admin/audit?action=user.reset_password&page=1&limit=10", {
      token: adminToken,
    });
    assert.equal(audit.status, 200);
    assert.ok(
      audit.body.items.some(
        (ev) => ev.actor_user_id === adminId && ev.target_id === regularId && ev.action === "user.reset_password",
      ),
    );
  });
});
