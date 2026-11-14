const test = require("node:test");
const assert = require("node:assert");

const {
  monthDateBounds,
  enrichOrcamento,
  calcularResumoOrcamentos,
} = require("../utils/orcamentos");

test("monthDateBounds calcula limites [start, endExclusive) incluindo virada de ano", () => {
  assert.deepStrictEqual(monthDateBounds(2026, 11), {
    start: "2026-11-01",
    endExclusive: "2026-12-01",
  });
  assert.deepStrictEqual(monthDateBounds(2026, 12), {
    start: "2026-12-01",
    endExclusive: "2027-01-01",
  });
});

test("enrichOrcamento classifica ok, alerta, excedido e inativo corretamente", () => {
  const base = {
    id: 1,
    categoria_id: 10,
    categoria_nome: "Alimentação",
    categoria_cor: "#10b981",
    valor_limite: "1000.00",
    alerta_percentual: 80,
    ativo: true,
  };

  const ok = enrichOrcamento({ ...base, gasto_realizado: "500.00" }, 2026, 11);
  assert.strictEqual(ok.status, "ok");
  assert.strictEqual(ok.percentual_consumido, 50);
  assert.strictEqual(ok.saldo_restante, 500);

  const alerta = enrichOrcamento({ ...base, gasto_realizado: "800.00" }, 2026, 11);
  assert.strictEqual(alerta.status, "alerta");
  assert.strictEqual(alerta.percentual_consumido, 80);

  const excedido = enrichOrcamento({ ...base, gasto_realizado: "1250.50" }, 2026, 11);
  assert.strictEqual(excedido.status, "excedido");
  assert.strictEqual(excedido.saldo_restante, -250.5);
  assert.strictEqual(excedido.percentual_consumido, 125.1);

  const inativo = enrichOrcamento({ ...base, ativo: false, gasto_realizado: "1500.00" }, 2026, 11);
  assert.strictEqual(inativo.status, "inativo");
});

test("calcularResumoOrcamentos soma apenas orçamentos ativos sem erro de ponto flutuante", () => {
  const itens = [
    enrichOrcamento(
      { id: 1, categoria_id: 1, valor_limite: "300.10", alerta_percentual: 80, ativo: true, gasto_realizado: "100.20" },
      2026, 11,
    ),
    enrichOrcamento(
      { id: 2, categoria_id: 2, valor_limite: "200.20", alerta_percentual: 80, ativo: true, gasto_realizado: "250.00" },
      2026, 11,
    ),
    enrichOrcamento(
      { id: 3, categoria_id: 3, valor_limite: "999.00", alerta_percentual: 80, ativo: false, gasto_realizado: "500.00" },
      2026, 11,
    ),
  ];

  const resumo = calcularResumoOrcamentos(itens);
  assert.strictEqual(resumo.total_orcado, 500.3);
  assert.strictEqual(resumo.total_gasto, 350.2);
  assert.strictEqual(resumo.saldo_disponivel, 150.1);
  assert.strictEqual(resumo.contagem.ativos, 2);
  assert.strictEqual(resumo.contagem.ok, 1);
  assert.strictEqual(resumo.contagem.excedidos, 1);
});

