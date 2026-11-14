// Verificação de integração de Cartões vinculados a transações e faturas contra o Neon dev.
// Cria 2 usuários temporários, valida o fluxo e limpa ao final.
require("dotenv").config();
const assert = require("node:assert");
const pool = require("../config/db");
const c = require("../controllers/cartoesController");
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
  const tag = `tmp_card_${Date.now()}`;
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
    const cat = await pool.query(
      "INSERT INTO categorias (nome, cor, user_id) VALUES ('Teste', '#10b981', $1) RETURNING id",
      [A],
    );
    const catId = cat.rows[0].id;
    const fatura = (cartaoId, mes) =>
      call(c.obterFatura, { user: { userId: A }, params: { id: String(cartaoId) }, query: { ano: "2026", mes: String(mes) } });
    const lista = () => call(c.listarCartoes, { user: { userId: A }, query: { ano: "2026", mes: "3" } });

    // 1. Criar cartão (fecha dia 10, vence dia 20, limite 1000) + validação
    const cr = await call(c.criarCartao, {
      user: { userId: A },
      body: { nome: "Cartão Teste", bandeira: "Visa", limite_total: 1000, dia_fechamento: 10, dia_vencimento: 20 },
    });
    assert.strictEqual(cr.status, 201);
    const cartaoId = cr.body.id;
    const bad = await call(c.criarCartao, { user: { userId: A }, body: { nome: "x", limite_total: 10, dia_fechamento: 40, dia_vencimento: 5 } });
    assert.strictEqual(bad.status, 400);

    // 2. Isolamento: B não pode atrelar transação ao cartão de A
    const inv = await call(tc.criarTransacao, {
      user: { userId: B },
      body: { descricao: "x", valor: 10, tipo: "despesa", data: "2026-03-05", categoria_id: catId, cartao_id: cartaoId },
    });
    assert.strictEqual(inv.status, 403);

    // 3. Receita não pode ser atrelada a cartão
    const rec = await call(tc.criarTransacao, {
      user: { userId: A },
      body: { descricao: "Salário", valor: 10, tipo: "receita", data: "2026-03-05", cartao_id: cartaoId },
    });
    assert.strictEqual(rec.status, 400);

    // 4. Despesa à vista (mar) + compra parcelada 3x (parcelas 20/02, 20/03, 20/04 -> faturas mar, abr, mai)
    const t1 = await call(tc.criarTransacao, {
      user: { userId: A },
      body: { descricao: "Mercado", valor: 100, tipo: "despesa", data: "2026-03-05", categoria_id: catId, cartao_id: cartaoId },
    });
    assert.strictEqual(t1.status, 201);
    assert.strictEqual(t1.body.cartao_id, cartaoId);
    const t2 = await call(tc.criarTransacaoParcelada, {
      user: { userId: A },
      body: { descricao: "Notebook", valor: 300, categoria_id: catId, data: "2026-02-20", parcelas: 3, cartao_id: cartaoId },
    });
    assert.strictEqual(t2.status, 201);

    const f3 = await fatura(cartaoId, 3);
    assert.strictEqual(f3.body.total, 200);
    assert.strictEqual(f3.body.itens.length, 2);
    assert.strictEqual((await fatura(cartaoId, 4)).body.total, 100);

    // 5. Limite usado = 400 (200 no mês + 200 em outras faturas); a listagem de transações traz o nome do cartão
    const l1 = await lista();
    assert.strictEqual(l1.body.itens[0].limite_usado, 400);
    assert.strictEqual(l1.body.itens[0].limite_usado_mes, 200);
    assert.strictEqual(l1.body.itens[0].limite_usado_outras, 200);
    assert.strictEqual(l1.body.itens[0].limite_disponivel, 600);
    assert.strictEqual(l1.body.resumo.limite_usado_mes, 200);
    assert.strictEqual(l1.body.resumo.limite_usado_outras, 200);
    assert.strictEqual(l1.body.itens[0].faturas_em_aberto.length, 3);
    const lt = await call(tc.listarTransacoes, { user: { userId: A }, query: {} });
    assert.ok(lt.body.some((t) => t.cartao_nome === "Cartão Teste"));

    // 6. Pagar a fatura de março NÃO cria despesa extra e libera limite
    const antes = await pool.query("SELECT COUNT(*)::int AS n FROM transacoes WHERE user_id = $1", [A]);
    const pag = await call(c.pagarFatura, {
      user: { userId: A },
      params: { id: String(cartaoId) },
      body: { ano: 2026, mes: 3, data_pagamento: "2026-03-20" },
    });
    assert.strictEqual(pag.status, 201);
    assert.strictEqual(pag.body.fatura.status, "paga");
    const depois = await pool.query("SELECT COUNT(*)::int AS n FROM transacoes WHERE user_id = $1", [A]);
    assert.strictEqual(depois.rows[0].n, antes.rows[0].n);
    assert.strictEqual((await lista()).body.itens[0].limite_usado, 200);

    const dup = await call(c.pagarFatura, { user: { userId: A }, params: { id: String(cartaoId) }, body: { ano: 2026, mes: 3 } });
    assert.strictEqual(dup.status, 409);

    // 7. Fatura paga protege suas transações: excluir, alterar valor e lançar nova compra -> 409
    const del1 = await call(tc.deletarTransacao, { user: { userId: A }, params: { id: String(t1.body.id) } });
    assert.strictEqual(del1.status, 409);
    const ed1 = await call(tc.editarTransacao, {
      user: { userId: A },
      params: { id: String(t1.body.id) },
      body: { descricao: "Mercado", valor: 150, tipo: "despesa", data: "2026-03-05", categoria_id: catId },
    });
    assert.strictEqual(ed1.status, 409);
    const novo = await call(tc.criarTransacao, {
      user: { userId: A },
      body: { descricao: "Tarde", valor: 10, tipo: "despesa", data: "2026-03-06", categoria_id: catId, cartao_id: cartaoId },
    });
    assert.strictEqual(novo.status, 409);

    // 8. Estornar o pagamento -> fatura reabre e as transações voltam a poder ser alteradas
    const est = await call(c.estornarPagamentoFatura, { user: { userId: A }, params: { id: String(cartaoId), ano: "2026", mes: "3" } });
    assert.strictEqual(est.status, 204);
    assert.notStrictEqual((await fatura(cartaoId, 3)).body.status, "paga");

    // 9. Editar valor altera a fatura; excluir remove da fatura E libera limite do cartão
    const ed2 = await call(tc.editarTransacao, {
      user: { userId: A },
      params: { id: String(t1.body.id) },
      body: { descricao: "Mercado", valor: 150, tipo: "despesa", data: "2026-03-05", categoria_id: catId },
    });
    assert.strictEqual(ed2.status, 200);
    assert.strictEqual(ed2.body.cartao_id, cartaoId); // sem cartao_id no corpo mantém o vínculo
    assert.strictEqual((await fatura(cartaoId, 3)).body.total, 250);
    assert.strictEqual((await lista()).body.itens[0].limite_usado, 450);

    // Excluir t1 (vinculado ao cartão) pela aba de transações reduz imediatamente o limite usado
    const del1b = await call(tc.deletarTransacao, { user: { userId: A }, params: { id: String(t1.body.id) } });
    assert.strictEqual(del1b.status, 204);
    assert.strictEqual((await fatura(cartaoId, 3)).body.total, 100);
    const limAposDel = await lista();
    assert.strictEqual(limAposDel.body.itens[0].limite_usado, 300);
    assert.strictEqual(limAposDel.body.itens[0].limite_disponivel, 700);

    // 10. Excluir o cartão mantém as transações (sem vínculo) e preserva cartao_excluido_nome
    const delCard = await call(c.deletarCartao, { user: { userId: A }, params: { id: String(cartaoId) } });
    assert.strictEqual(delCard.status, 204);
    const left = await pool.query(
      "SELECT COUNT(*)::int AS n, COUNT(cartao_id)::int AS com_cartao, COUNT(cartao_excluido_nome)::int AS com_excluido FROM transacoes WHERE user_id = $1",
      [A],
    );
    assert.strictEqual(left.rows[0].n, 3);
    assert.strictEqual(left.rows[0].com_cartao, 0);
    assert.strictEqual(left.rows[0].com_excluido, 3);
    const ltExcluido = await call(tc.listarTransacoes, { user: { userId: A }, query: {} });
    assert.strictEqual(ltExcluido.body.length, 3);
    assert.ok(ltExcluido.body.every((t) => t.cartao_id === null && t.cartao_excluido_nome === "Cartão Teste"));

    // Editar uma transação de cartão excluído mantendo sem cartão preserva a indicação; vincular novo cartão limpa
    const alvoExcluido = ltExcluido.body[0];
    const edPreserva = await call(tc.editarTransacao, {
      user: { userId: A },
      params: { id: String(alvoExcluido.id) },
      body: { descricao: alvoExcluido.descricao, valor: alvoExcluido.valor, tipo: "despesa", data: alvoExcluido.data, categoria_id: catId, cartao_id: null },
    });
    assert.strictEqual(edPreserva.status, 200);
    assert.strictEqual(edPreserva.body.cartao_excluido_nome, "Cartão Teste");

    const novoCard = await call(c.criarCartao, {
      user: { userId: A },
      body: { nome: "Outro Cartão", limite_total: 500, dia_fechamento: 5, dia_vencimento: 15 },
    });
    assert.strictEqual(novoCard.status, 201);
    const edNovoCard = await call(tc.editarTransacao, {
      user: { userId: A },
      params: { id: String(alvoExcluido.id) },
      body: { descricao: alvoExcluido.descricao, valor: alvoExcluido.valor, tipo: "despesa", data: alvoExcluido.data, categoria_id: catId, cartao_id: novoCard.body.id },
    });
    assert.strictEqual(edNovoCard.status, 200);
    assert.strictEqual(edNovoCard.body.cartao_id, novoCard.body.id);
    assert.strictEqual(edNovoCard.body.cartao_excluido_nome, null);

    console.log("OK: cartões atrelados a transações, faturas, limite, proteção de fatura paga, estorno e isolamento verificados no Neon.");
  } finally {
    if (ids.length) {
      await pool.query("DELETE FROM transacoes WHERE user_id = ANY($1)", [ids]);
      await pool.query("DELETE FROM usuarios WHERE id = ANY($1)", [ids]);
    }
    await pool.end();
  }
})().catch((e) => {
  console.error("FALHA:", e);
  process.exit(1);
});
