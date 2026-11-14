const test = require("node:test");
const assert = require("node:assert");

const {
  enrichDivida,
  calcularResumoDividas,
  simularAmortizacao,
} = require("../utils/dividas");

test("enrichDivida calcula progresso de quitação e parcelas restantes", () => {
  const d = enrichDivida({
    id: 1,
    nome: "Financiamento",
    tipo: "financiamento",
    valor_original: "10000.00",
    saldo_devedor: "4000.00",
    taxa_juros_mensal: "1.500",
    total_parcelas: 20,
    parcelas_pagas: 12,
    valor_parcela: "600.00",
    status: "ativa",
  });

  assert.strictEqual(d.valor_amortizado_total, 6000);
  assert.strictEqual(d.percentual_quitado, 60);
  assert.strictEqual(d.parcelas_restantes, 8);
});

test("calcularResumoDividas consolida totais e gera estratégias Avalanche e Bola de Neve", () => {
  const itens = [
    enrichDivida({
      id: 1,
      nome: "Empréstimo Caro",
      tipo: "emprestimo",
      valor_original: "5000.00",
      saldo_devedor: "3000.00",
      taxa_juros_mensal: "4.500",
      valor_parcela: "350.00",
      status: "ativa",
    }),
    enrichDivida({
      id: 2,
      nome: "Parcelado Pequeno",
      tipo: "cartao_parcelado",
      valor_original: "1200.00",
      saldo_devedor: "600.00",
      taxa_juros_mensal: "1.200",
      valor_parcela: "200.00",
      status: "ativa",
    }),
    enrichDivida({
      id: 3,
      nome: "Quitada",
      tipo: "outro",
      valor_original: "1000.00",
      saldo_devedor: "0.00",
      taxa_juros_mensal: "2.000",
      status: "quitada",
    }),
  ];

  const resumo = calcularResumoDividas(itens);
  assert.strictEqual(resumo.total_original, 7200);
  assert.strictEqual(resumo.total_saldo_devedor, 3600);
  assert.strictEqual(resumo.total_amortizado, 3600);
  assert.strictEqual(resumo.comprometimento_mensal, 550);
  assert.strictEqual(resumo.contagem.ativas, 2);
  assert.strictEqual(resumo.contagem.quitadas, 1);
  assert.deepStrictEqual(resumo.estrategias.avalanche_ids, [1, 2]);
  assert.deepStrictEqual(resumo.estrategias.bola_de_neve_ids, [2, 1]);
});

test("simularAmortizacao calcula economia de meses e juros com aporte extra", () => {
  const sim = simularAmortizacao({
    saldo_devedor: 5000,
    taxa_juros_mensal: 2,
    valor_parcela: 500,
    aporte_extra: 250,
  });

  assert.strictEqual(sim.cenario_atual.quitavel, true);
  assert.strictEqual(sim.cenario_com_aporte.quitavel, true);
  assert.ok(sim.economia.meses_economizados > 0);
  assert.ok(sim.economia.juros_economizados > 0);
});

test("simularAmortizacao detecta quando parcela não cobre os juros mensais", () => {
  const sim = simularAmortizacao({
    saldo_devedor: 10000,
    taxa_juros_mensal: 5, // 500 de juros no mês 1
    valor_parcela: 400, // menor que 500
    aporte_extra: 0,
  });

  assert.strictEqual(sim.cenario_atual.quitavel, false);
  assert.strictEqual(sim.cenario_atual.meses, null);
});

