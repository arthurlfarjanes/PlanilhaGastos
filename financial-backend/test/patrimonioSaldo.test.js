const test = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config();

const pool = require("../config/db");
const patCtrl = require("../controllers/patrimonioController");
const txCtrl = require("../controllers/transacaoController");
const dashCtrl = require("../controllers/dashboardController");
const orcCtrl = require("../controllers/orcamentosController");
const { summarizePeriodTransactions, buildRelatorioCsv } = require("../utils/relatorios");

function callController(fn, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      headers: {},
      set(k, v) {
        this.headers[k] = v;
        return this;
      },
      status(s) {
        this.statusCode = s;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
      },
      send(body) {
        resolve({ status: this.statusCode, body });
      },
    };
    Promise.resolve(fn(req, res, reject)).catch(reject);
  });
}

test("Relatórios: aporte e resgate de patrimônio não contam como despesa/receita, apenas no saldo líquido", () => {
  const txs = [
    { id: 1, tipo: "receita", valor: 5000, data: "2026-11-01", descricao: "Salário" },
    { id: 2, tipo: "despesa", valor: 2000, data: "2026-11-05", descricao: "Aluguel", categoria_nome: "Moradia" },
    { id: 3, tipo: "aporte_patrimonio", valor: 1200, data: "2026-11-10", descricao: "Aporte patrimônio: Reserva" },
    { id: 4, tipo: "resgate_patrimonio", valor: 200, data: "2026-11-12", descricao: "Resgate patrimônio: Reserva" },
  ];

  const { resumo_periodo, categorias_despesa } = summarizePeriodTransactions(txs);
  assert.equal(resumo_periodo.receitas, 5000);
  assert.equal(resumo_periodo.despesas, 2000);
  assert.equal(resumo_periodo.aportes_patrimonio, 1200);
  assert.equal(resumo_periodo.resgates_patrimonio, 200);
  assert.equal(resumo_periodo.economia, 3000);
  assert.equal(resumo_periodo.saldo_liquido, 2000);
  assert.equal(categorias_despesa.length, 1);
  assert.equal(categorias_despesa[0].categoria_nome, "Moradia");

  const csv = buildRelatorioCsv("transacoes", { transacoes: txs });
  assert.match(csv, /Aporte em Patrimônio;Aporte patrimônio: Reserva;Patrimônio \(Reserva\)/);
  assert.match(csv, /Resgate de Patrimônio;Resgate patrimônio: Reserva;Patrimônio \(Reserva\)/);
});

test("Patrimônio: aporte mensal em reserva desconta apenas do saldo sem contar como despesa ou receita", async () => {
  const username = `tmp_patsaldo_${Date.now()}`;
  const userRes = await pool.query(
    "INSERT INTO usuarios (username, password_hash) VALUES ($1, 'x') RETURNING id",
    [username],
  );
  const userId = userRes.rows[0].id;

  try {
    const catRes = await pool.query(
      "INSERT INTO categorias (nome, cor, user_id) VALUES ('Moradia', '#10b981', $1) RETURNING id",
      [userId],
    );
    const catId = catRes.rows[0].id;

    // Orçamento na categoria Moradia para garantir que aporte em reserva não consome orçamento
    await callController(orcCtrl.criarOrcamento, {
      user: { userId },
      body: { categoria_id: catId, valor_limite: 2500 },
    });

    // Receita 5000 e Despesa real 1500
    await pool.query(
      `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
       VALUES ($1, 'Salário', 5000, 'receita', '2026-11-02', NULL),
              ($1, 'Aluguel', 1500, 'despesa', '2026-11-05', $2)`,
      [userId, catId],
    );

    const patRes = await callController(patCtrl.criarPatrimonio, {
      user: { userId },
      body: {
        nome: "Reserva de Emergência",
        tipo: "reserva_emergencia",
        valor_atual: 1000,
        liquidez: "imediata",
      },
    });
    assert.equal(patRes.status, 201);
    const patId = patRes.body.id;

    // Aporte mensal de 1000 sem precisar de categoria_id
    const movAporte = await callController(patCtrl.registrarMovimentacao, {
      user: { userId },
      params: { id: String(patId) },
      body: {
        tipo: "aporte",
        valor: 1000,
        data_movimentacao: "2026-11-10",
        lancar_transacao: true,
        observacao: "Aporte mensal",
      },
    });
    assert.equal(movAporte.status, 201);
    assert.equal(movAporte.body.item.valor_atual, 2000);
    assert.ok(movAporte.body.movimentacao.transacao_id);

    const txRow = await pool.query("SELECT tipo, categoria_id FROM transacoes WHERE id = $1", [
      movAporte.body.movimentacao.transacao_id,
    ]);
    assert.equal(txRow.rows[0].tipo, "aporte_patrimonio");
    assert.equal(txRow.rows[0].categoria_id, null);

    // Comparativo: receitas = 5000, despesas = 1500, balanço financeiro = 3500 (positivo!), saldo disponível = 2500
    const comp1 = await callController(txCtrl.obterComparativo, {
      user: { userId },
      query: { dataInicio: "2026-11-01", dataFim: "2026-11-30" },
    });
    assert.equal(comp1.status, 200);
    assert.equal(comp1.body.totalReceitas, "5000.00");
    assert.equal(comp1.body.totalDespesas, "1500.00");
    assert.equal(comp1.body.totalAportesPatrimonio, "1000.00");
    assert.equal(comp1.body.balanco, "3500.00");
    assert.equal(comp1.body.saldoDisponivel, "2500.00");

    // Indicadores: patrimônio = 2000, despesas_periodo = 1500 (taxa economia 70%)
    const ind1 = await callController(dashCtrl.obterIndicadores, {
      user: { userId },
      query: { dataInicio: "2026-11-01", dataFim: "2026-11-30", refDate: "2026-11-15" },
    });
    assert.equal(ind1.status, 200);
    assert.equal(ind1.body.indicadores.receitas_periodo, 5000);
    assert.equal(ind1.body.indicadores.despesas_periodo, 1500);
    assert.equal(ind1.body.indicadores.total_ativos, 2000);
    assert.equal(ind1.body.indicadores.patrimonio_liquido, 2000);

    // Orçamento continua consumindo apenas 1500 da despesa real
    const orc1 = await callController(orcCtrl.listarOrcamentos, {
      user: { userId },
      query: { ano: "2026", mes: "11" },
    });
    assert.equal(orc1.body.itens[0].gasto_realizado, 1500);

    // Resgate de 300 devolve ao saldo sem contar como receita
    const movResg = await callController(patCtrl.registrarMovimentacao, {
      user: { userId },
      params: { id: String(patId) },
      body: {
        tipo: "resgate",
        valor: 300,
        data_movimentacao: "2026-11-12",
        lancar_transacao: true,
      },
    });
    assert.equal(movResg.status, 201);
    assert.equal(movResg.body.item.valor_atual, 1700);

    const comp2 = await callController(txCtrl.obterComparativo, {
      user: { userId },
      query: { dataInicio: "2026-11-01", dataFim: "2026-11-30" },
    });
    assert.equal(comp2.body.totalReceitas, "5000.00");
    assert.equal(comp2.body.totalDespesas, "1500.00");
    assert.equal(comp2.body.totalResgatesPatrimonio, "300.00");
    assert.equal(comp2.body.balanco, "3500.00");
    assert.equal(comp2.body.saldoDisponivel, "2800.00");

    // Editar valor/tipo de movimentação de patrimônio direto pelo extrato é bloqueado (409)
    const editBloqueado = await callController(txCtrl.editarTransacao, {
      user: { userId },
      params: { id: String(movAporte.body.movimentacao.transacao_id) },
      body: {
        descricao: "Tentativa",
        valor: 999,
        tipo: "aporte_patrimonio",
        data: "2026-11-10",
      },
    });
    assert.equal(editBloqueado.status, 409);
  } finally {
    await pool.query("DELETE FROM usuarios WHERE id = $1", [userId]);
  }
});
