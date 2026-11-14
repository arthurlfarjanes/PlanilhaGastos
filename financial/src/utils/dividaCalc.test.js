import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularValorParcelaPrice,
  calcularTaxaJurosPrice,
  calcularTotalParcelasPrice,
  applySmartDebtChange,
  recomputeSmartDebt,
  buildInitialManualMap,
} from "./dividaCalc.js";

const EMPTY_FORM = {
  nome: "",
  credor: "",
  tipo: "emprestimo",
  valor_original: "",
  saldo_devedor: "",
  taxa_juros_mensal: "",
  total_parcelas: "",
  parcelas_pagas: "0",
  valor_parcela: "",
};

test("calcula valor da parcela e taxa 0% a partir de valor original e total de parcelas", () => {
  let state = { form: { ...EMPTY_FORM }, manual: {} };
  state = applySmartDebtChange(state.form, state.manual, "valor_original", 12000);
  state = applySmartDebtChange(state.form, state.manual, "total_parcelas", "12");

  assert.equal(state.form.taxa_juros_mensal, "0");
  assert.equal(state.form.valor_parcela, "1000");
  assert.equal(state.autoFields.taxa_juros_mensal, true);
  assert.equal(state.autoFields.valor_parcela, true);
});

test("ao informar valor da parcela manualmente, calcula taxa de juros mensal automaticamente", () => {
  let state = { form: { ...EMPTY_FORM }, manual: {} };
  state = applySmartDebtChange(state.form, state.manual, "valor_original", 10000);
  state = applySmartDebtChange(state.form, state.manual, "total_parcelas", "12");
  // Parcela Price exata para 1.5% a.m. em 12x sobre 10000 é ~916.80
  state = applySmartDebtChange(state.form, state.manual, "valor_parcela", 916.8);

  assert.equal(Number(state.form.taxa_juros_mensal), 1.5);
  assert.equal(state.autoFields.taxa_juros_mensal, true);
  assert.equal(state.autoFields.valor_parcela, undefined);
});

test("ao informar saldo devedor atual + parcelas pagas, calcula parcela e juros sobre o saldo restante", () => {
  let state = { form: { ...EMPTY_FORM }, manual: {} };
  state = applySmartDebtChange(state.form, state.manual, "valor_original", 20000);
  state = applySmartDebtChange(state.form, state.manual, "saldo_devedor", 8000);
  state = applySmartDebtChange(state.form, state.manual, "total_parcelas", "20");
  state = applySmartDebtChange(state.form, state.manual, "parcelas_pagas", "12");

  // 8 parcelas restantes para saldo devedor 8000 => 1000 por parcela a 0%
  assert.equal(state.form.valor_parcela, "1000");
  assert.equal(state.form.taxa_juros_mensal, "0");

  // Se usuário alterar taxa para 2% a.m., recalcula valor_parcela apenas
  state = applySmartDebtChange(state.form, state.manual, "taxa_juros_mensal", "2");
  assert.equal(Number(state.form.valor_parcela), calcularValorParcelaPrice(8000, 2, 8));
  assert.equal(state.form.saldo_devedor, "8000");
});

test("nao sobrescreve campos preenchidos manualmente e recalcula se usuario limpar um campo", () => {
  let state = { form: { ...EMPTY_FORM }, manual: {} };
  state = applySmartDebtChange(state.form, state.manual, "valor_original", 10000);
  state = applySmartDebtChange(state.form, state.manual, "total_parcelas", "10");
  state = applySmartDebtChange(state.form, state.manual, "taxa_juros_mensal", "2");
  state = applySmartDebtChange(state.form, state.manual, "valor_parcela", 1200);

  // Ambos taxa e valor_parcela manuais => mudar valor_original não sobrescreve nenhum dos dois
  state = applySmartDebtChange(state.form, state.manual, "valor_original", 11000);
  assert.equal(state.form.taxa_juros_mensal, "2");
  assert.equal(state.form.valor_parcela, "1200");

  // Se limpar taxa_juros_mensal, fica vazio para digitacao e recalcula ao sair (recomputeSmartDebt)
  state = applySmartDebtChange(state.form, state.manual, "taxa_juros_mensal", "");
  assert.equal(state.form.taxa_juros_mensal, "");
  state = recomputeSmartDebt(state.form, state.manual);
  assert.equal(Number(state.form.taxa_juros_mensal), calcularTaxaJurosPrice(11000, 1200, 10));
});

test("calcula total de parcelas a partir de valor, parcela e taxa", () => {
  let state = { form: { ...EMPTY_FORM }, manual: {} };
  state = applySmartDebtChange(state.form, state.manual, "valor_original", 5000);
  state = applySmartDebtChange(state.form, state.manual, "taxa_juros_mensal", "0");
  state = applySmartDebtChange(state.form, state.manual, "valor_parcela", 500);

  assert.equal(state.form.total_parcelas, "10");
  assert.equal(calcularTotalParcelasPrice(5000, 500, 0), 10);
});

test("buildInitialManualMap preserva campos existentes na edicao", () => {
  const existing = {
    valor_original: "10000",
    saldo_devedor: "7500",
    taxa_juros_mensal: "1.5",
    valor_parcela: "916.8",
    total_parcelas: "12",
    parcelas_pagas: "3",
  };
  const manual = buildInitialManualMap(existing);
  const res = applySmartDebtChange(existing, manual, "nome", "Financiamento");
  assert.equal(res.form.saldo_devedor, "7500");
  assert.equal(res.form.valor_parcela, "916.8");
});
