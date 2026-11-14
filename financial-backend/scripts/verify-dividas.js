// Verificação de integração de Dívidas, Amortizações e Estorno contra o Neon dev.
// Cria 2 usuários temporários, valida criação, amortização, quitação, estorno e isolamento, e limpa ao final.
require("dotenv").config();
const assert = require("node:assert");
const pool = require("../config/db");
const c = require("../controllers/dividasController");
const tc = require("../controllers/transacaoController");

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
  const tag = `tmp_div_${Date.now()}`;
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

    // 1. Criar dívida para A
    const cr = await call(c.criarDivida, {
      user: { userId: A },
      body: {
        nome: "Empréstimo Banco",
        credor: "Banco X",
        tipo: "emprestimo",
        valor_original: 2000,
        saldo_devedor: 1000,
        taxa_juros_mensal: 2.5,
        total_parcelas: 10,
        parcelas_pagas: 5,
        valor_parcela: 250,
      },
    });
    assert.strictEqual(cr.status, 201);
    const dividaId = cr.body.id;

    // 2. Isolamento: B não pode amortizar nem listar dívida de A
    const inv = await call(c.registrarAmortizacao, {
      user: { userId: B },
      params: { id: String(dividaId) },
      body: { valor_pago: 250 },
    });
    assert.strictEqual(inv.status, 404);

    // 3. Registrar parcela (250 pago, 25 juros -> 225 amortizado -> saldo 775, parcelas_pagas 6)
    const am1 = await call(c.registrarAmortizacao, {
      user: { userId: A },
      params: { id: String(dividaId) },
      body: {
        tipo: "parcela",
        valor_pago: 250,
        valor_juros: 25,
        data_pagamento: "2026-11-13",
        lancar_transacao: true,
      },
    });
    assert.strictEqual(am1.status, 201);
    assert.strictEqual(am1.body.divida.saldo_devedor, 775);
    assert.strictEqual(am1.body.divida.parcelas_pagas, 6);
    assert.ok(am1.body.amortizacao.transacao_id);

    // 4. Estornar parcela -> saldo volta a 1000, parcelas_pagas volta a 5, transação é removida
    const est = await call(c.estornarAmortizacao, {
      user: { userId: A },
      params: { id: String(dividaId), amortId: String(am1.body.amortizacao.id) },
    });
    assert.strictEqual(est.status, 204);

    const txLeft = await pool.query("SELECT id FROM transacoes WHERE id = $1", [
      am1.body.amortizacao.transacao_id,
    ]);
    assert.strictEqual(txLeft.rowCount, 0);

    const lst = await call(c.listarDividas, { user: { userId: A } });
    assert.strictEqual(lst.body.itens[0].saldo_devedor, 1000);
    assert.strictEqual(lst.body.itens[0].parcelas_pagas, 5);

    // 4b. Pagar parcela com transação e apagar a transação -> estorno automático na dívida
    const am2 = await call(c.registrarAmortizacao, {
      user: { userId: A },
      params: { id: String(dividaId) },
      body: {
        tipo: "parcela",
        valor_pago: 1000,
        valor_juros: 0,
        data_pagamento: "2026-11-13",
        lancar_transacao: true,
      },
    });
    assert.strictEqual(am2.status, 201);
    assert.strictEqual(am2.body.divida.status, "quitada");
    assert.strictEqual(am2.body.divida.saldo_devedor, 0);

    const delTx = await call(tc.deletarTransacao, {
      user: { userId: A },
      params: { id: String(am2.body.amortizacao.transacao_id) },
    });
    assert.strictEqual(delTx.status, 204);

    const lst2 = await call(c.listarDividas, { user: { userId: A } });
    assert.strictEqual(lst2.body.itens[0].saldo_devedor, 1000);
    assert.strictEqual(lst2.body.itens[0].parcelas_pagas, 5);
    assert.strictEqual(lst2.body.itens[0].status, "ativa");

    // 5. Quitação total -> status muda para 'quitada' e nova tentativa dá 409
    const quit = await call(c.registrarAmortizacao, {
      user: { userId: A },
      params: { id: String(dividaId) },
      body: { tipo: "quitacao", valor_pago: 1000, lancar_transacao: false },
    });
    assert.strictEqual(quit.status, 201);
    assert.strictEqual(quit.body.divida.status, "quitada");
    assert.strictEqual(quit.body.divida.saldo_devedor, 0);

    const dup = await call(c.registrarAmortizacao, {
      user: { userId: A },
      params: { id: String(dividaId) },
      body: { valor_pago: 100 },
    });
    assert.strictEqual(dup.status, 409);

    console.log("OK: dívidas, parcelas, amortização, quitação, estorno e isolamento verificados no Neon.");
  } finally {
    if (ids.length) await pool.query("DELETE FROM usuarios WHERE id = ANY($1)", [ids]);
    await pool.end();
  }
})().catch((e) => {
  console.error("FALHA:", e);
  process.exit(1);
});

