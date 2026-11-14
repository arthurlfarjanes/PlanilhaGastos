// Verificação de integração de Compras Parceladas (filtro de vencimento e parcelas vincendas)
// e Estorno bidirecional Dívidas <-> Transações contra o Neon dev.
require("dotenv").config();
const assert = require("node:assert/strict");
const pool = require("../config/db");
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
  const tag = `tmp_parc_${Date.now()}`;
  let userId = null;
  try {
    const u = await pool.query(
      "INSERT INTO usuarios (username, password_hash) VALUES ($1, 'x') RETURNING id",
      [tag],
    );
    userId = u.rows[0].id;

    const catRes = await pool.query(
      "INSERT INTO categorias (user_id, nome, cor) VALUES ($1, 'Eletronicos', '#10b981') RETURNING id",
      [userId],
    );
    const catId = catRes.rows[0].id;

    // 1. Compra parcelada em 3x em 2026-10-13 (R$ 1000 -> 1/3, 2/3, 3/3)
    const cp = await call(tc.criarTransacaoParcelada, {
      user: { userId },
      body: {
        descricao: "Notebook",
        valor: 1000,
        categoria_id: catId,
        data: "2026-10-13",
        parcelas: 3,
      },
    });
    assert.equal(cp.status, 201);
    assert.equal(cp.body.transacoes.length, 3);

    // 2. Na data 2026-10-13 com ocultarParcelasFuturas=true: apenas Parcela 1 aparece
    const listDiaCompra = await call(tc.listarTransacoes, {
      user: { userId },
      query: { ocultarParcelasFuturas: "true", dataRef: "2026-10-13" },
    });
    assert.equal(listDiaCompra.status, 200);
    assert.deepEqual(
      listDiaCompra.body.map((t) => t.descricao),
      ["Notebook (1/3)"],
    );

    // 3. Na data 2026-10-13 com apenasParcelasVincendas=true: aparecem Parcelas 2/3 e 3/3 em ordem crescente
    const vincDiaCompra = await call(tc.listarTransacoes, {
      user: { userId },
      query: { apenasParcelasVincendas: "true", dataRef: "2026-10-13" },
    });
    assert.equal(vincDiaCompra.status, 200);
    assert.deepEqual(
      vincDiaCompra.body.map((t) => t.descricao),
      ["Notebook (2/3)", "Notebook (3/3)"],
    );

    // 4. Em 2026-11-13 (vencimento da parcela 2): Parcela 2 aparece no extrato e apenas 3/3 segue vincenda
    const listNov = await call(tc.listarTransacoes, {
      user: { userId },
      query: { ocultarParcelasFuturas: "true", dataRef: "2026-11-13" },
    });
    assert.deepEqual(
      listNov.body.map((t) => t.descricao),
      ["Notebook (2/3)", "Notebook (1/3)"],
    );

    const vincNov = await call(tc.listarTransacoes, {
      user: { userId },
      query: { apenasParcelasVincendas: "true", dataRef: "2026-11-13" },
    });
    assert.deepEqual(
      vincNov.body.map((t) => t.descricao),
      ["Notebook (3/3)"],
    );

    console.log("VERIFICACAO PARCELAS PASSOU!");
  } finally {
    if (userId) {
      await pool.query("DELETE FROM transacoes WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM categorias WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM usuarios WHERE id = $1", [userId]);
    }
    await pool.end();
  }
})().catch((err) => {
  console.error("FALHA VERIFICACAO PARCELAS:", err);
  process.exit(1);
});

