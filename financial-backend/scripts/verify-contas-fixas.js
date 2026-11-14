// Verificação de integração de Contas Fixas, Pagamentos e Isolamento contra o Neon dev.
// Cria 2 usuários temporários, testa o fluxo completo e remove tudo ao final.
require("dotenv").config();
const assert = require("node:assert");
const pool = require("../config/db");
const c = require("../controllers/gastosFixosController");

const call = (fn, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
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
  const tag = `tmp_gf_${Date.now()}`;
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

    // 1. Criar conta fixa e assinatura para A
    const cr1 = await call(c.criarGastoFixo, {
      user: { userId: A },
      body: {
        descricao: "Internet Fibra",
        valor: 119.9,
        dia_vencimento: 15,
        tipo: "despesa",
        is_assinatura: true,
        gerar_automatico: true,
      },
    });
    assert.strictEqual(cr1.status, 201);
    assert.strictEqual(cr1.body.is_assinatura, true);
    const contaId = cr1.body.id;

    // 2. Isolamento: usuário B não pode pagar nem editar conta de A
    const inv = await call(c.marcarComoPago, {
      user: { userId: B },
      params: { id: String(contaId) },
      body: { ano: 2026, mes: 11 },
    });
    assert.strictEqual(inv.status, 404);

    // 3. Marcar como pago gera transação vinculada e impede duplicidade (409)
    const pg1 = await call(c.marcarComoPago, {
      user: { userId: A },
      params: { id: String(contaId) },
      body: { ano: 2026, mes: 11, data_pagamento: "2026-11-13" },
    });
    assert.strictEqual(pg1.status, 201);
    assert.ok(pg1.body.transacao_id);

    const dup = await call(c.marcarComoPago, {
      user: { userId: A },
      params: { id: String(contaId) },
      body: { ano: 2026, mes: 11 },
    });
    assert.strictEqual(dup.status, 409);

    // 4. Resumo reflete pago
    const res1 = await call(c.resumoGastosFixos, {
      user: { userId: A },
      query: { ano: "2026", mes: "11" },
    });
    assert.strictEqual(res1.body.total_despesas_pagas, 119.9);
    assert.strictEqual(res1.body.total_despesas_pendentes, 0);
    assert.strictEqual(res1.body.contagem.assinaturas, 1);

    // 5. Desfazer pagamento estorna registro e transação vinculada
    const delPg = await call(c.desfazerPagamento, {
      user: { userId: A },
      params: { id: String(contaId) },
      query: { ano: "2026", mes: "11" },
    });
    assert.strictEqual(delPg.status, 204);

    const txLeft = await pool.query("SELECT id FROM transacoes WHERE id = $1", [pg1.body.transacao_id]);
    assert.strictEqual(txLeft.rowCount, 0);

    console.log("OK: contas fixas, assinaturas, pagamento, estorno e isolamento verificados no Neon.");
  } finally {
    if (ids.length) await pool.query("DELETE FROM usuarios WHERE id = ANY($1)", [ids]);
    await pool.end();
  }
})().catch((e) => {
  console.error("FALHA:", e);
  process.exit(1);
});

