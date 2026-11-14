import test from "node:test";
import assert from "node:assert/strict";
import { isParcelaSubsequenteFutura, isParcelaVincenda } from "./parcelas.js";

test("frontend: isParcelaVincenda exclui parcelas passadas e do proprio dia", () => {
  const hoje = "2026-11-14";
  assert.equal(isParcelaVincenda({ tipo: "despesa", descricao: "Carro (2/3)", data: "2026-07-10" }, hoje), false);
  assert.equal(isParcelaVincenda({ tipo: "despesa", descricao: "Ventilador (5/5)", data: "2026-10-10" }, hoje), false);
  assert.equal(isParcelaVincenda({ tipo: "despesa", descricao: "Parcela Hoje (2/3)", data: "2026-11-14" }, hoje), false);
  assert.equal(isParcelaVincenda({ tipo: "despesa", descricao: "Avista Futura", data: "2026-12-14" }, hoje), false);
  assert.equal(isParcelaVincenda({ tipo: "despesa", descricao: "Notebook (2/3)", data: "2026-12-14" }, hoje), true);
});

test("frontend: isParcelaSubsequenteFutura oculta apenas subsequentes futuras", () => {
  const hoje = "2026-11-14";
  assert.equal(isParcelaSubsequenteFutura({ tipo: "despesa", descricao: "Carro (2/3)", data: "2026-07-10" }, hoje), false);
  assert.equal(isParcelaSubsequenteFutura({ tipo: "despesa", descricao: "Notebook (1/3)", data: "2026-12-14" }, hoje), false);
  assert.equal(isParcelaSubsequenteFutura({ tipo: "despesa", descricao: "Notebook (2/3)", data: "2026-12-14" }, hoje), true);
});

