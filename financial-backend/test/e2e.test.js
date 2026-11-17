/**
 * Suite E2E HTTP real contra Express (`app.js`) + PostgreSQL:
 * Testa fluxo completo de usuário: registro, login, /me, categorias, transações,
 * orçamentos, diagnóstico, otimização, simulação de projeções, relatórios (JSON/CSV/PDF),
 * privacidade (resumo/exportação/exclusão), isolamento IDOR entre usuários e revogação via token_version.
 */
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config();

const hasDbAndJwt = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe("E2E HTTP completo (MeFinance API)", { skip: !hasDbAndJwt }, () => {
  let server;
  let baseUrl;
  let pool;
  const createdUserIds = [];

  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const userA = { username: `e2e_a_${unique}`, password: "E2eUserA@2026" };
  const userB = { username: `e2e_b_${unique}`, password: "E2eUserB@2026" };

  before(async () => {
    const app = require("../app");
    pool = require("../config/db");
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (pool && createdUserIds.length > 0) {
      await pool.query("UPDATE system_logs SET user_id = NULL WHERE user_id = ANY($1)", [createdUserIds]).catch(() => {});
      await pool.query("DELETE FROM transacoes WHERE user_id = ANY($1)", [createdUserIds]).catch(() => {});
      await pool.query("DELETE FROM gastos_fixos WHERE usuario_id = ANY($1)", [createdUserIds]).catch(() => {});
      await pool.query("DELETE FROM categorias WHERE user_id = ANY($1)", [createdUserIds]).catch(() => {});
      await pool.query("DELETE FROM usuarios WHERE id = ANY($1)", [createdUserIds]).catch(() => {});
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  async function api(path, { method = "GET", token = null, body = undefined } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    return fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  it("executa jornada completa autenticada com isolamento e exclusão final", async () => {
    // 1. Healthcheck e proteção sem token
    const healthRes = await api("/");
    assert.equal(healthRes.status, 200);
    const unauthMe = await api("/me");
    assert.equal(unauthMe.status, 401);

    // 2. Registro e login dos usuários A e B
    const regA = await api("/register", { method: "POST", body: userA });
    assert.equal(regA.status, 201);
    const regAJson = await regA.json();
    createdUserIds.push(regAJson.user.id);
    assert.equal(regAJson.user.password_hash, undefined);

    const regB = await api("/register", { method: "POST", body: userB });
    assert.equal(regB.status, 201);
    const regBJson = await regB.json();
    createdUserIds.push(regBJson.user.id);

    const logA = await api("/login", { method: "POST", body: userA });
    assert.equal(logA.status, 200);
    const tokenA = (await logA.json()).token;

    const logB = await api("/login", { method: "POST", body: userB });
    assert.equal(logB.status, 200);
    const tokenB = (await logB.json()).token;

    // 3. Categoria, transação e orçamento do Usuário A
    const catRes = await api("/categorias", {
      method: "POST",
      token: tokenA,
      body: { nome: "Mercado E2E", cor: "#059669" },
    });
    assert.equal(catRes.status, 201);
    const categoria = await catRes.json();

    const txRec = await api("/transacoes", {
      method: "POST",
      token: tokenA,
      body: {
        descricao: "Salário E2E",
        valor: 8000,
        tipo: "receita",
        data: "2026-11-05",
      },
    });
    assert.equal(txRec.status, 201);

    const txDesp = await api("/transacoes", {
      method: "POST",
      token: tokenA,
      body: {
        descricao: "Supermercado E2E",
        valor: 950.5,
        tipo: "despesa",
        data: "2026-11-10",
        categoria_id: categoria.id,
      },
    });
    assert.equal(txDesp.status, 201);
    const txDespJson = await txDesp.json();

    // 4. Isolamento entre usuários (IDOR)
    const txListB = await api("/transacoes", { token: tokenB });
    assert.equal(txListB.status, 200);
    assert.equal((await txListB.json()).length, 0);

    const idorDelete = await api(`/transacoes/${txDespJson.id}`, {
      method: "DELETE",
      token: tokenB,
    });
    assert.ok([403, 404].includes(idorDelete.status));

    // 5. Inteligência, Projeções e Relatórios (JSON / CSV / PDF)
    const diagRes = await api("/inteligencia/diagnosticos?refDate=2026-11-17", { token: tokenA });
    assert.equal(diagRes.status, 200);
    const diagJson = await diagRes.json();
    assert.ok(diagJson.saude_financeira.score >= 0 && diagJson.saude_financeira.score <= 100);

    const optRes = await api("/inteligencia/otimizacao?refDate=2026-11-17", { token: tokenA });
    assert.equal(optRes.status, 200);

    const simRes = await api("/planejamento/simular", {
      method: "POST",
      token: tokenA,
      body: { horizonte_meses: 12, variacao_despesa_pct: -10, aporte_mensal_extra: 200 },
    });
    assert.equal(simRes.status, 200);

    const relResumo = await api(
      "/relatorios/resumo?dataInicio=2026-11-01&dataFim=2026-11-30&refDate=2026-11-17",
      { token: tokenA },
    );
    assert.equal(relResumo.status, 200);
    const relJson = await relResumo.json();
    assert.equal(relJson.resumo_periodo.receitas, 8000);
    assert.equal(relJson.resumo_periodo.despesas, 950.5);

    const relCsv = await api(
      "/relatorios/exportar/csv?tipo=transacoes&dataInicio=2026-11-01&dataFim=2026-11-30&refDate=2026-11-17",
      { token: tokenA },
    );
    assert.equal(relCsv.status, 200);
    const csvText = await relCsv.text();
    assert.ok(csvText.includes("Supermercado E2E"));

    const relPdf = await api(
      "/relatorios/exportar/pdf?dataInicio=2026-11-01&dataFim=2026-11-30&refDate=2026-11-17",
      { token: tokenA },
    );
    assert.equal(relPdf.status, 200);
    const pdfBuf = Buffer.from(await relPdf.arrayBuffer());
    assert.equal(pdfBuf.subarray(0, 5).toString("ascii"), "%PDF-");

    // 6. Privacidade (resumo, exportação e troca de senha revogando token anterior)
    const privResumo = await api("/privacidade/resumo", { token: tokenA });
    assert.equal(privResumo.status, 200);
    assert.equal((await privResumo.json()).contagens.transacoes, 2);

    const privExport = await api("/privacidade/exportar", { token: tokenA });
    assert.equal(privExport.status, 200);
    const exportJson = await privExport.json();
    assert.equal(exportJson.usuario.password_hash, undefined);
    assert.equal(exportJson.dados.transacoes.length, 2);

    const novaSenha = "E2eUserA_Nova@2026";
    const chPass = await api("/change-password", {
      method: "POST",
      token: tokenA,
      body: { currentPassword: userA.password, newPassword: novaSenha },
    });
    assert.equal(chPass.status, 200);

    // Token antigo deve ser revogado imediatamente pelo token_version
    const revokedMe = await api("/me", { token: tokenA });
    assert.equal(revokedMe.status, 401);

    const relogA = await api("/login", {
      method: "POST",
      body: { username: userA.username, password: novaSenha },
    });
    assert.equal(relogA.status, 200);
    const freshTokenA = (await relogA.json()).token;

    // 7. Exclusão definitiva da própria conta
    const delRes = await api("/privacidade/conta", {
      method: "DELETE",
      token: freshTokenA,
      body: {
        password: novaSenha,
        confirmUsername: userA.username,
        confirmPhrase: "EXCLUIR",
      },
    });
    assert.equal(delRes.status, 200);

    const afterDelMe = await api("/me", { token: freshTokenA });
    assert.equal(afterDelMe.status, 401);
  });
});
