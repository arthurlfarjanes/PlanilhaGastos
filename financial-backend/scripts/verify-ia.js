// Verificação integrada da Fase 3 (contabilização de uso no Postgres, ferramentas somente leitura e isolamento) contra o Neon dev.
require("dotenv").config();
const assert = require("node:assert");
const pool = require("../config/db");
const { getUsageSummary, recordUsage } = require("../ai/usageService");
const { gatherFinanceContext } = require("../ai/tools/readOnlyFinanceTools");
const { createCloudflareProvider } = require("../ai/providers/cloudflareProvider");
const iaCtrl = require("../controllers/iaController");

const call = (fn, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      set() {
        return this;
      },
      status(s) {
        this.statusCode = s;
        return this;
      },
      json(b) {
        resolve({ status: this.statusCode, body: b });
      },
      send(b) {
        resolve({ status: this.statusCode, body: b });
      },
    };
    fn(req, res, reject);
  });

(async () => {
  const tag = `tmp_ia_${Date.now()}`;
  const ids = [];
  try {
    for (const s of ["a", "b"]) {
      const r = await pool.query(
        "INSERT INTO usuarios (username, password_hash) VALUES ($1, 'x') RETURNING id",
        [`${tag}_${s}`],
      );
      ids.push(r.rows[0].id);
    }
    const [A, B] = ids;

    await pool.query(
      `INSERT INTO transacoes (user_id, descricao, valor, tipo, data)
       VALUES ($1, 'Salário Secreto A', 6000, 'receita', '2026-11-05'),
              ($1, 'Mercado A', 900, 'despesa', '2026-11-10')`,
      [A],
    );

    // 1. Ferramenta somente leitura respeita privacidade e isolamento
    const ctxPrivado = await gatherFinanceContext(A, {
      message: "Como estão meus gastos por categoria?",
      refDate: "2026-11-16",
      shareTransactionDetails: false,
    });
    assert.strictEqual(
      ctxPrivado.contextData.gastos_por_categoria.transacoes_recentes,
      "ocultas por preferência de privacidade",
    );
    assert.strictEqual(ctxPrivado.contextData.obter_resumo_financeiro.indicadores.receitas_periodo, 6000);

    const ctxB = await gatherFinanceContext(B, {
      message: "Resumo geral",
      refDate: "2026-11-16",
      shareTransactionDetails: true,
    });
    assert.strictEqual(ctxB.contextData.obter_resumo_financeiro.indicadores.receitas_periodo, 0);

    // 2. Contabilização de uso no Postgres (Neurons + requisições individuais separadas)
    const provider = createCloudflareProvider({ accountId: "x", apiToken: "y" });
    await recordUsage({
      userId: A,
      provider: "cloudflare",
      model: provider.model,
      status: "ok",
      promptTokens: 200,
      completionTokens: 50,
      totalTokens: 250,
      neurons: 35,
      latencyMs: 320,
    });
    const summaryA = await getUsageSummary(A, provider);
    assert.ok(summaryA.applicationIndividualLimit.requestsUsedToday >= 1);
    assert.ok(summaryA.providerFreeTier.neuronsRecordedByAppToday >= 35);

    const summaryB = await getUsageSummary(B, provider);
    assert.strictEqual(summaryB.applicationIndividualLimit.requestsUsedToday, 0);

    // 3. Status endpoint via controller funciona e lista provedores disponíveis
    const statusRes = await call(iaCtrl.obterStatusIA, { user: { userId: A } });
    assert.strictEqual(statusRes.status, 200);
    assert.ok(statusRes.body.usage.applicationIndividualLimit);
    assert.ok(statusRes.body.usage.providerFreeTier);
    assert.ok(Array.isArray(statusRes.body.availableProviders));

    // 4. Simula cota excedida em Cloudflare e verifica sugestão de alternativa gratuita caso Groq esteja configurado
    await recordUsage({
      userId: A,
      provider: "cloudflare",
      model: provider.model,
      status: "quota_excedida",
    });
    const { getProvidersAvailability } = require("../ai/usageService");
    const avail = await getProvidersAvailability("cloudflare", pool, undefined, {
      cloudflare: { accountId: "a", apiToken: "b" },
      groq: { apiKey: "gsk_test" },
    });
    assert.ok(avail.suggestedAlternativeProvider);
    assert.strictEqual(avail.suggestedAlternativeProvider.id, "groq");

    console.log("OK: camada de uso Postgres, ferramentas somente leitura e isolamento de IA verificados no Neon.");
  } finally {
    if (ids.length) {
      await pool.query("DELETE FROM usuarios WHERE id = ANY($1)", [ids]);
    }
    await pool.end();
  }
})().catch((e) => {
  console.error("FALHA:", e);
  process.exit(1);
});
