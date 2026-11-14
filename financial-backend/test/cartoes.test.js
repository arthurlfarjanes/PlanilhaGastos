const test = require("node:test");
const assert = require("node:assert");
const {
  addMonths,
  faturaDaData,
  datasDaFatura,
  calcularFatura,
  calcularLimite,
  dataEmFaturaPaga,
} = require("../utils/cartoes");

const cartao = { dia_fechamento: 10, dia_vencimento: 20, limite_total: 1000 };

test("addMonths atravessa viradas de ano", () => {
  assert.deepStrictEqual(addMonths(2026, 11, 3), { ano: 2027, mes: 2 });
  assert.deepStrictEqual(addMonths(2026, 12, 1), { ano: 2027, mes: 1 });
  assert.deepStrictEqual(addMonths(2026, 1, 0), { ano: 2026, mes: 1 });
});

test("lançamento até o fechamento (inclusive) cai na fatura do mês; depois, na seguinte", () => {
  assert.deepStrictEqual(faturaDaData("2026-03-10", 10), { ano: 2026, mes: 3 });
  assert.deepStrictEqual(faturaDaData("2026-03-11", 10), { ano: 2026, mes: 4 });
  assert.deepStrictEqual(faturaDaData("2026-12-20", 10), { ano: 2027, mes: 1 });
  // fechamento 31 em fevereiro ajusta para o último dia
  assert.deepStrictEqual(faturaDaData("2026-02-28", 31), { ano: 2026, mes: 2 });
});

test("datasDaFatura: vencimento no mesmo mês ou no seguinte", () => {
  assert.deepStrictEqual(datasDaFatura(2026, 3, 10, 20), { fechamento: "2026-03-10", vencimento: "2026-03-20" });
  assert.deepStrictEqual(datasDaFatura(2026, 3, 25, 5), { fechamento: "2026-03-25", vencimento: "2026-04-05" });
  assert.deepStrictEqual(datasDaFatura(2026, 12, 25, 5), { fechamento: "2026-12-25", vencimento: "2027-01-05" });
});

test("calcularFatura soma lançamentos da competência sem erro de ponto flutuante", () => {
  const lanc = [
    { id: 1, descricao: "A", valor: 0.1, data: "2026-03-05" },
    { id: 2, descricao: "B", valor: 0.2, data: "2026-03-06" },
    { id: 3, descricao: "C (1/3)", valor: "30.00", data: "2026-02-20" }, // fecha dia 10 -> fatura de março
    { id: 4, descricao: "C (2/3)", valor: "30.00", data: "2026-03-20" }, // fatura de abril
  ];
  const f = calcularFatura(cartao, lanc, 2026, 3, null, "2026-03-15");
  assert.strictEqual(f.total, 30.3);
  assert.strictEqual(f.itens.length, 3);
  assert.strictEqual(f.status, "fechada");
  assert.strictEqual(calcularFatura(cartao, lanc, 2026, 3, null, "2026-03-09").status, "aberta");
  assert.strictEqual(calcularFatura(cartao, lanc, 2026, 3, null, "2026-03-21").status, "vencida");
  const paga = { valor_pago: 30.3, data_pagamento: "2026-03-18" };
  assert.strictEqual(calcularFatura(cartao, lanc, 2026, 3, paga, "2026-03-21").status, "paga");
  assert.strictEqual(calcularFatura(cartao, lanc, 2026, 4, null, "2026-03-21").total, 30);
});

test("calcularLimite desconta apenas lançamentos de faturas não pagas e detalha por competência", () => {
  const lanc = [
    { id: 1, valor: 100, data: "2026-03-05" },
    { id: 2, valor: 150, data: "2026-04-05" },
    { id: 3, valor: 250, data: "2026-05-05" },
  ];
  assert.strictEqual(calcularLimite(cartao, lanc, []).limite_usado, 500);
  const l = calcularLimite(cartao, lanc, [{ competencia_ano: 2026, competencia_mes: 3 }], { ano: 2026, mes: 3 });
  assert.strictEqual(l.limite_usado, 400);
  assert.strictEqual(l.limite_usado_mes, 0);
  assert.strictEqual(l.limite_usado_outras, 400);
  assert.strictEqual(l.limite_disponivel, 600);
  assert.strictEqual(l.percentual_usado, 40);
  assert.deepStrictEqual(l.faturas_em_aberto, [
    { ano: 2026, mes: 4, total: 150, quantidade: 1 },
    { ano: 2026, mes: 5, total: 250, quantidade: 1 },
  ]);
});

test("dataEmFaturaPaga detecta datas em fatura paga", () => {
  const pg = [{ competencia_ano: 2026, competencia_mes: 4 }];
  assert.strictEqual(dataEmFaturaPaga(cartao, "2026-03-11", pg), true); // após fechamento -> abril
  assert.strictEqual(dataEmFaturaPaga(cartao, "2026-03-10", pg), false);
  assert.strictEqual(dataEmFaturaPaga(cartao, "2026-03-10", []), false);
});
