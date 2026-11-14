const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseParcelaInfo,
  isParcelaSubsequenteFutura,
  isParcelaVincenda,
} = require("../utils/parcelas");

test("parseParcelaInfo extrai numero e total apenas para parcelas validas", () => {
  assert.deepEqual(parseParcelaInfo("Notebook (1/3)"), { numero: 1, total: 3 });
  assert.deepEqual(parseParcelaInfo("Notebook (3/3)"), { numero: 3, total: 3 });
  assert.equal(parseParcelaInfo("Compra (1/1)"), null);
  assert.equal(parseParcelaInfo("Compra (4/3)"), null);
  assert.equal(parseParcelaInfo("Compra (0/3)"), null);
  assert.equal(parseParcelaInfo("Supermercado"), null);
  assert.equal(parseParcelaInfo("Nota 2026/2027"), null);
});

test("isParcelaSubsequenteFutura oculta apenas parcelas >= 2 ainda futuras", () => {
  const hoje = "2026-10-13";
  const p1Hoje = { tipo: "despesa", descricao: "Celular (1/3)", data: "2026-10-13" };
  const p2Futura = { tipo: "despesa", descricao: "Celular (2/3)", data: "2026-11-13" };
  const p3Futura = { tipo: "despesa", descricao: "Celular (3/3)", data: "2026-12-13" };
  const avistaFutura = { tipo: "despesa", descricao: "Viagem", data: "2026-11-20" };

  assert.equal(isParcelaSubsequenteFutura(p1Hoje, hoje), false);
  assert.equal(isParcelaSubsequenteFutura(p2Futura, hoje), true);
  assert.equal(isParcelaSubsequenteFutura(p3Futura, hoje), true);
  assert.equal(isParcelaSubsequenteFutura(avistaFutura, hoje), false);

  // No dia 13/11, a parcela 2 passa a vencer hoje (nao deve mais ficar oculta)
  assert.equal(isParcelaSubsequenteFutura(p2Futura, "2026-11-13"), false);
  assert.equal(isParcelaSubsequenteFutura(p3Futura, "2026-11-13"), true);
});

test("isParcelaVincenda identifica parcelas ainda nao vencidas", () => {
  const hoje = "2026-10-13";
  assert.equal(isParcelaVincenda({ tipo: "despesa", descricao: "TV (1/3)", data: "2026-10-13" }, hoje), false);
  assert.equal(isParcelaVincenda({ tipo: "despesa", descricao: "TV (2/3)", data: "2026-11-13" }, hoje), true);
  assert.equal(isParcelaVincenda({ tipo: "despesa", descricao: "TV (1/3)", data: "2026-11-01" }, hoje), true);
  assert.equal(isParcelaVincenda({ tipo: "receita", descricao: "Bonus (2/3)", data: "2026-11-13" }, hoje), false);
});

