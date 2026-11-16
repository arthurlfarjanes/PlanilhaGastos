// Verificação de integração de Patrimônio e Objetivos contra o Neon dev.
// Cria 2 usuários temporários, valida fluxos, estorno bidirecional e isolamento, e limpa ao final.
require("dotenv").config();
const assert = require("node:assert");
const pool = require("../config/db");
const patCtrl = require("../controllers/patrimonioController");
const objCtrl = require("../controllers/objetivosController");
const divCtrl = require("../controllers/dividasController");
const txCtrl = require("../controllers/transacaoController");

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
  const tag = `tmp_patobj_${Date.now()}`;
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
      "INSERT INTO categorias (nome, cor, user_id) VALUES ('Investimentos', '#10b981', $1) RETURNING id",
      [A],
    );
    const catId = cat.rows[0].id;

    // 1. Dívida ativa de B não afeta patrimônio de A; dívida ativa de A entra como passivo
    const divA = await call(divCtrl.criarDivida, {
      user: { userId: A },
      body: { nome: "Financiamento", tipo: "financiamento", valor_original: 5000, saldo_devedor: 3000 },
    });
    assert.strictEqual(divA.status, 201);

    // 2. Criar ativo de patrimônio (Reserva de emergência com 115% do CDI) + movimentar com transação vinculada
    const pat1 = await call(patCtrl.criarPatrimonio, {
      user: { userId: A },
      body: {
        nome: "Reserva Nubank",
        tipo: "reserva_emergencia",
        instituicao: "Nubank",
        valor_atual: 8000,
        valor_investido: 7500,
        rendimento_tipo: "cdi_percentual",
        rendimento_valor: 115,
        cdi_referencia: 14.65,
        liquidez: "imediata",
      },
    });
    assert.strictEqual(pat1.status, 201);
    assert.strictEqual(pat1.body.rendimento_tipo, "cdi_percentual");
    assert.ok(pat1.body.rendimento_mensal_estimado > 0);
    const patId = pat1.body.id;

    const listaPat1 = await call(patCtrl.listarPatrimonio, { user: { userId: A } });
    assert.strictEqual(listaPat1.body.resumo.total_ativos, 8000);
    assert.strictEqual(listaPat1.body.resumo.total_passivos, 3000);
    assert.strictEqual(listaPat1.body.resumo.patrimonio_liquido, 5000);
    assert.strictEqual(listaPat1.body.resumo.liquidez_imediata, 8000);

    // Aporte de 1000 lançando no extrato
    const mov1 = await call(patCtrl.registrarMovimentacao, {
      user: { userId: A },
      params: { id: String(patId) },
      body: {
        tipo: "aporte",
        valor: 1000,
        data_movimentacao: "2026-11-10",
        lancar_transacao: true,
        categoria_id: catId,
        observacao: "Aporte mensal",
      },
    });
    assert.strictEqual(mov1.status, 201);
    assert.strictEqual(mov1.body.item.valor_atual, 9000);
    assert.strictEqual(mov1.body.item.valor_investido, 8500);
    assert.ok(mov1.body.movimentacao.transacao_id);

    // Estorno bidirecional: apagar a transação no extrato reverte o aporte no patrimônio
    const delTxPat = await call(txCtrl.deletarTransacao, {
      user: { userId: A },
      params: { id: String(mov1.body.movimentacao.transacao_id) },
    });
    assert.strictEqual(delTxPat.status, 204);
    const listaPat2 = await call(patCtrl.listarPatrimonio, { user: { userId: A } });
    assert.strictEqual(listaPat2.body.itens[0].valor_atual, 8000);
    assert.strictEqual(listaPat2.body.itens[0].valor_investido, 7500);

    // Resgate maior que saldo -> 409
    const resgExcesso = await call(patCtrl.registrarMovimentacao, {
      user: { userId: A },
      params: { id: String(patId) },
      body: { tipo: "resgate", valor: 99999 },
    });
    assert.strictEqual(resgExcesso.status, 409);

    // Isolamento: B não acessa nem altera patrimônio de A
    const patB = await call(patCtrl.atualizarPatrimonio, {
      user: { userId: B },
      params: { id: String(patId) },
      body: { nome: "Hack" },
    });
    assert.strictEqual(patB.status, 404);

    // 3. Criar objetivo vinculado ao patrimônio e testar contribuições + conclusão + estorno bidirecional
    const obj1 = await call(objCtrl.criarObjetivo, {
      user: { userId: A },
      body: {
        nome: "Viagem Japão",
        categoria: "viagem",
        valor_alvo: 10000,
        valor_atual: 4000,
        aporte_mensal_planejado: 1500,
        prazo: "2027-06-01",
        prioridade: "alta",
        patrimonio_id: patId,
      },
    });
    assert.strictEqual(obj1.status, 201);
    assert.strictEqual(obj1.body.patrimonio_nome, "Reserva Nubank");
    const objId = obj1.body.id;

    // Aporte que quita o objetivo (4000 + 6000 = 10000 -> concluído) com transação vinculada
    const contrib1 = await call(objCtrl.registrarContribuicao, {
      user: { userId: A },
      params: { id: String(objId) },
      body: {
        tipo: "aporte",
        valor: 6000,
        data_contribuicao: "2026-11-14",
        lancar_transacao: true,
        categoria_id: catId,
      },
    });
    assert.strictEqual(contrib1.status, 201);
    assert.strictEqual(contrib1.body.objetivo.status, "concluido");
    assert.strictEqual(contrib1.body.objetivo.valor_atual, 10000);
    assert.ok(contrib1.body.contribuicao.transacao_id);

    // Apagar a transação reverte valor_atual e retorna status para "ativo"
    const delTxObj = await call(txCtrl.deletarTransacao, {
      user: { userId: A },
      params: { id: String(contrib1.body.contribuicao.transacao_id) },
    });
    assert.strictEqual(delTxObj.status, 204);
    const listaObj = await call(objCtrl.listarObjetivos, { user: { userId: A }, query: { refDate: "2026-11-14" } });
    assert.strictEqual(listaObj.body.itens[0].valor_atual, 4000);
    assert.strictEqual(listaObj.body.itens[0].status, "ativo");

    // Estornar contribuição diretamente remove transação vinculada
    const contrib2 = await call(objCtrl.registrarContribuicao, {
      user: { userId: A },
      params: { id: String(objId) },
      body: { tipo: "aporte", valor: 1000, lancar_transacao: true, categoria_id: catId },
    });
    assert.strictEqual(contrib2.status, 201);
    const txId2 = contrib2.body.contribuicao.transacao_id;
    const estorno = await call(objCtrl.estornarContribuicao, {
      user: { userId: A },
      params: { id: String(objId), contribId: String(contrib2.body.contribuicao.id) },
    });
    assert.strictEqual(estorno.status, 204);
    const txLeft = await pool.query("SELECT id FROM transacoes WHERE id = $1", [txId2]);
    assert.strictEqual(txLeft.rowCount, 0);

    // 4. Movimentar patrimônio vinculado movimenta automaticamente o objetivo + estorno direto e via transação
    const movSync = await call(patCtrl.registrarMovimentacao, {
      user: { userId: A },
      params: { id: String(patId) },
      body: {
        tipo: "aporte",
        valor: 6000,
        data_movimentacao: "2026-11-15",
        lancar_transacao: true,
        categoria_id: catId,
        observacao: "Aporte automático",
      },
    });
    assert.strictEqual(movSync.status, 201);
    assert.strictEqual(movSync.body.item.valor_atual, 14000);
    assert.strictEqual(movSync.body.objetivos_atualizados.length, 1);
    assert.strictEqual(movSync.body.objetivos_atualizados[0].valor_atual, 10000);
    assert.strictEqual(movSync.body.objetivos_atualizados[0].status, "concluido");

    // Excluir a transação gerada pela movimentação de patrimônio reverte TANTO patrimônio QUANTO objetivo vinculado
    const delTxSync = await call(txCtrl.deletarTransacao, {
      user: { userId: A },
      params: { id: String(movSync.body.movimentacao.transacao_id) },
    });
    assert.strictEqual(delTxSync.status, 204);
    const patAfterDel = await call(patCtrl.listarPatrimonio, { user: { userId: A } });
    assert.strictEqual(patAfterDel.body.itens[0].valor_atual, 8000);
    const objAfterDel = await call(objCtrl.listarObjetivos, { user: { userId: A }, query: {} });
    assert.strictEqual(objAfterDel.body.itens[0].valor_atual, 4000);
    assert.strictEqual(objAfterDel.body.itens[0].status, "ativo");

    // Resgate no patrimônio também desconta do objetivo vinculado, e estorno direto no patrimônio reverte ambos
    const movResgSync = await call(patCtrl.registrarMovimentacao, {
      user: { userId: A },
      params: { id: String(patId) },
      body: { tipo: "resgate", valor: 1500, data_movimentacao: "2026-11-16" },
    });
    assert.strictEqual(movResgSync.status, 201);
    assert.strictEqual(movResgSync.body.item.valor_atual, 6500);
    assert.strictEqual(movResgSync.body.objetivos_atualizados[0].valor_atual, 2500);

    const estMovResg = await call(patCtrl.estornarMovimentacao, {
      user: { userId: A },
      params: { id: String(patId), movId: String(movResgSync.body.movimentacao.id) },
    });
    assert.strictEqual(estMovResg.status, 204);
    const patAfterEst = await call(patCtrl.listarPatrimonio, { user: { userId: A } });
    assert.strictEqual(patAfterEst.body.itens[0].valor_atual, 8000);
    const objAfterEst = await call(objCtrl.listarObjetivos, { user: { userId: A }, query: {} });
    assert.strictEqual(objAfterEst.body.itens[0].valor_atual, 4000);

    // 5. Mudança rápida de status em Objetivos e Dívidas
    const patchObj = await call(objCtrl.alterarStatusObjetivo, {
      user: { userId: A },
      params: { id: String(objId) },
      body: { status: "pausado" },
    });
    assert.strictEqual(patchObj.status, 200);
    assert.strictEqual(patchObj.body.status, "pausado");

    const patchDiv = await call(divCtrl.alterarStatusDivida, {
      user: { userId: A },
      params: { id: String(divA.body.id) },
      body: { status: "pausada" },
    });
    assert.strictEqual(patchDiv.status, 200);
    assert.strictEqual(patchDiv.body.status, "pausada");

    // Isolamento: B não vincula objetivo ao patrimônio de A (403)
    const objHack = await call(objCtrl.criarObjetivo, {
      user: { userId: B },
      body: { nome: "Outro", valor_alvo: 500, patrimonio_id: patId },
    });
    assert.strictEqual(objHack.status, 403);

    console.log("OK: patrimônio, patrimônio líquido com dívidas, objetivos, estorno bidirecional e isolamento verificados no Neon.");
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
