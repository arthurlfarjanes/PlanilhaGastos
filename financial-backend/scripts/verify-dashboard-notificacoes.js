// Verificação integrada dos endpoints de Dashboard (/dashboard/indicadores) e Notificações (/notificacoes) contra o Neon dev.
require("dotenv").config();
const assert = require("node:assert");
const pool = require("../config/db");
const dashCtrl = require("../controllers/dashboardController");
const notifCtrl = require("../controllers/notificacoesController");
const prefCtrl = require("../controllers/preferenciasController");

const call = (fn, req) =>
  new Promise((resolve, reject) => {
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
  const tag = `tmp_e26_${Date.now()}`;
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

    // 1. Dados reais para o usuário A
    const cat = await pool.query(
      "INSERT INTO categorias (nome, cor, user_id) VALUES ('Moradia', '#ef4444', $1) RETURNING id",
      [A],
    );
    const catId = cat.rows[0].id;

    await pool.query(
      `INSERT INTO transacoes (user_id, descricao, valor, tipo, data, categoria_id)
       VALUES ($1, 'Salário', 5000, 'receita', '2026-11-05', NULL),
              ($1, 'Aluguel', 1500, 'despesa', '2026-11-10', $2)`,
      [A, catId],
    );
    await pool.query(
      `INSERT INTO gastos_fixos (usuario_id, descricao, valor, dia_vencimento, categoria_id, tipo, ativo)
       VALUES ($1, 'Aluguel Fixo', 1500, 18, $2, 'despesa', TRUE)`,
      [A, catId],
    );
    await pool.query(
      `INSERT INTO orcamentos (user_id, categoria_id, valor_limite, alerta_percentual, ativo)
       VALUES ($1, $2, 1600, 80, TRUE)`,
      [A, catId],
    );
    await pool.query(
      `INSERT INTO patrimonio_itens (user_id, nome, tipo, valor_atual, liquidez, ativo)
       VALUES ($1, 'Reserva', 'reserva_emergencia', 10000, 'imediata', TRUE)`,
      [A],
    );
    await pool.query(
      `INSERT INTO dividas (user_id, nome, tipo, valor_original, saldo_devedor, valor_parcela, status)
       VALUES ($1, 'Empréstimo', 'emprestimo', 4000, 2000, 500, 'ativa')`,
      [A],
    );

    const indA = await call(dashCtrl.obterIndicadores, {
      user: { userId: A },
      query: { dataInicio: "2026-11-01", dataFim: "2026-11-30", refDate: "2026-11-16" },
    });
    assert.strictEqual(indA.status, 200);
    assert.strictEqual(indA.body.indicadores.receitas_periodo, 5000);
    assert.strictEqual(indA.body.indicadores.despesas_periodo, 1500);
    assert.strictEqual(indA.body.indicadores.taxa_economia_percentual, 70);
    assert.strictEqual(indA.body.indicadores.comprometimento_fixo_dividas, 2000); // 1500 fixo + 500 dívida
    assert.strictEqual(indA.body.indicadores.comprometimento_renda_percentual, 40);
    assert.strictEqual(indA.body.indicadores.patrimonio_liquido, 8000); // 10000 - 2000

    // 2. Lembretes reais para A (conta vencendo dia 18 e orçamento em 93.8% >= 80%)
    const notifA = await call(notifCtrl.listarLembretes, {
      user: { userId: A },
      query: { refDate: "2026-11-16" },
    });
    assert.strictEqual(notifA.status, 200);
    assert.ok(notifA.body.resumo.total >= 2);
    assert.ok(notifA.body.lembretes.some((l) => l.origem === "conta"));
    assert.ok(notifA.body.lembretes.some((l) => l.origem === "orcamento"));

    // 3. Desativar lembretes via preferências reflete imediatamente
    const updPref = await call(prefCtrl.atualizarPreferencias, {
      user: { userId: A },
      body: { notifications: { enabled: false } },
    });
    assert.strictEqual(updPref.status, 200);
    const notifDesab = await call(notifCtrl.listarLembretes, {
      user: { userId: A },
      query: { refDate: "2026-11-16" },
    });
    assert.strictEqual(notifDesab.body.resumo.total, 0);

    // 4. Isolamento: usuário B não vê dados nem lembretes de A
    const indB = await call(dashCtrl.obterIndicadores, {
      user: { userId: B },
      query: { refDate: "2026-11-16" },
    });
    assert.strictEqual(indB.body.indicadores.patrimonio_liquido, 0);
    const notifB = await call(notifCtrl.listarLembretes, {
      user: { userId: B },
      query: { refDate: "2026-11-16" },
    });
    assert.strictEqual(notifB.body.resumo.total, 0);

    console.log("OK: indicadores financeiros, lembretes configuráveis e isolamento verificados no Neon.");
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
