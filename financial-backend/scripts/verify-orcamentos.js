// Verificação de integração de Orçamentos contra o Neon dev.
// Cria 2 usuários temporários, categorias e transações, verifica cálculos e isolamento, e limpa ao final.
require("dotenv").config();
const assert = require("node:assert");
const pool = require("../config/db");
const c = require("../controllers/orcamentosController");

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
  const tag = `tmp_orc_${Date.now()}`;
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

    const catA = (
      await pool.query(
        "INSERT INTO categorias (nome, cor, user_id) VALUES ('Mercado', '#10b981', $1) RETURNING id",
        [A],
      )
    ).rows[0].id;

    // Transações: 2 despesas no mês 11/2026, 1 receita (não deve somar), 1 despesa em outro mês
    await pool.query(
      `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id) VALUES
       ($1, 'Supermercado 1', 350.50, 'despesa', '2026-11-05', $2),
       ($1, 'Supermercado 2', 100.25, 'despesa', '2026-11-12', $2),
       ($1, 'Cashback', 50.00, 'receita', '2026-11-12', $2),
       ($1, 'Mês anterior', 900.00, 'despesa', '2026-10-20', $2)`,
      [A, catA],
    );

    // 1. Criar orçamento para A
    const cr = await call(c.criarOrcamento, {
      user: { userId: A },
      body: { categoria_id: catA, valor_limite: 500, alerta_percentual: 80 },
    });
    assert.strictEqual(cr.status, 201);
    const orcId = cr.body.id;

    // 2. Duplicidade na mesma categoria retorna 409
    const dup = await call(c.criarOrcamento, {
      user: { userId: A },
      body: { categoria_id: catA, valor_limite: 600 },
    });
    assert.strictEqual(dup.status, 409);

    // 3. Isolamento: B não pode criar orçamento usando categoria de A (403) nem editar/deletar (404)
    const forb = await call(c.criarOrcamento, {
      user: { userId: B },
      body: { categoria_id: catA, valor_limite: 500 },
    });
    assert.strictEqual(forb.status, 403);

    const notFoundUpd = await call(c.atualizarOrcamento, {
      user: { userId: B },
      params: { id: String(orcId) },
      body: { valor_limite: 999 },
    });
    assert.strictEqual(notFoundUpd.status, 404);

    // 4. Listagem em 11/2026 reflete apenas despesas do mês (350.50 + 100.25 = 450.75 -> 90.2% -> alerta)
    const lst = await call(c.listarOrcamentos, {
      user: { userId: A },
      query: { ano: "2026", mes: "11" },
    });
    assert.strictEqual(lst.body.itens.length, 1);
    assert.strictEqual(lst.body.itens[0].gasto_realizado, 450.75);
    assert.strictEqual(lst.body.itens[0].saldo_restante, 49.25);
    assert.strictEqual(lst.body.itens[0].status, "alerta");
    assert.strictEqual(lst.body.resumo.contagem.em_alerta, 1);

    // 5. Atualizar limite para 400 -> excedido
    const upd = await call(c.atualizarOrcamento, {
      user: { userId: A },
      params: { id: String(orcId) },
      body: { valor_limite: 400 },
    });
    assert.strictEqual(upd.status, 200);
    const lst2 = await call(c.listarOrcamentos, {
      user: { userId: A },
      query: { ano: "2026", mes: "11" },
    });
    assert.strictEqual(lst2.body.itens[0].status, "excedido");

    // 6. Deletar
    const del = await call(c.deletarOrcamento, {
      user: { userId: A },
      params: { id: String(orcId) },
    });
    assert.strictEqual(del.status, 204);

    console.log("OK: orçamentos, cálculo mensal, status, duplicidade e isolamento verificados no Neon.");
  } finally {
    if (ids.length) await pool.query("DELETE FROM usuarios WHERE id = ANY($1)", [ids]);
    await pool.end();
  }
})().catch((e) => {
  console.error("FALHA:", e);
  process.exit(1);
});

