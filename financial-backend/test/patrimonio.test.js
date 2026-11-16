const test = require("node:test");
const assert = require("node:assert");
const { enrichPatrimonioItem, calcularResumoPatrimonio } = require("../utils/patrimonio");

test("enrichPatrimonioItem calcula ganho e rentabilidade sem erro de ponto flutuante", () => {
  const item = enrichPatrimonioItem({
    id: 1,
    nome: "Tesouro Selic",
    tipo: "reserva_emergencia",
    instituicao: "Nubank",
    valor_atual: "1100.55",
    valor_investido: "1000.00",
    liquidez: "imediata",
    ativo: true,
  });

  assert.strictEqual(item.valor_atual, 1100.55);
  assert.strictEqual(item.valor_investido, 1000);
  assert.strictEqual(item.ganho_valor, 100.55);
  assert.strictEqual(item.rentabilidade_percentual, 10.06);
});

test("calcularResumoPatrimonio consolida ativos, liquidez imediata, passivos e distribuição", () => {
  const itens = [
    enrichPatrimonioItem({
      id: 1,
      nome: "Reserva",
      tipo: "reserva_emergencia",
      valor_atual: 5000,
      valor_investido: 4800,
      liquidez: "imediata",
      ativo: true,
    }),
    enrichPatrimonioItem({
      id: 2,
      nome: "CDB 2028",
      tipo: "renda_fixa",
      valor_atual: 15000,
      valor_investido: 14000,
      liquidez: "media",
      ativo: true,
    }),
    enrichPatrimonioItem({
      id: 3,
      nome: "Conta Antiga",
      tipo: "conta_corrente",
      valor_atual: 9999,
      liquidez: "imediata",
      ativo: false,
    }),
  ];

  const resumo = calcularResumoPatrimonio(itens, 4500);
  assert.strictEqual(resumo.total_ativos, 20000);
  assert.strictEqual(resumo.total_passivos, 4500);
  assert.strictEqual(resumo.patrimonio_liquido, 15500);
  assert.strictEqual(resumo.liquidez_imediata, 5000);
  assert.strictEqual(resumo.total_investido, 18800);
  assert.strictEqual(resumo.ganho_total, 1200);
  assert.deepStrictEqual(resumo.contagem, { total: 3, ativos: 2, inativos: 1 });
  assert.strictEqual(resumo.distribuicao_por_tipo[0].tipo, "renda_fixa");
  assert.strictEqual(resumo.distribuicao_por_tipo[0].percentual, 75);
});

test("enrichPatrimonioItem calcula projeção estimada por % do CDI e consolida no resumo", () => {
  const cdb = enrichPatrimonioItem({
    id: 10,
    nome: "Caixinha Turbo",
    tipo: "reserva_emergencia",
    valor_atual: 10000,
    rendimento_tipo: "cdi_percentual",
    rendimento_valor: 100,
    cdi_referencia: 12, // 12% a.a.
    liquidez: "imediata",
    ativo: true,
  });

  assert.strictEqual(cdb.taxa_anual_efetiva, 12);
  assert.strictEqual(cdb.rendimento_anual_estimado, 1200);
  // (1 + 0.12)^(1/12) - 1 ≈ 0.00948879 -> 0.95% a.m. -> 94.89 em R$ 10.000
  assert.strictEqual(cdb.taxa_mensal_efetiva, 0.95);
  assert.strictEqual(cdb.rendimento_mensal_estimado, 94.89);

  const resumo = calcularResumoPatrimonio([cdb], 0);
  assert.strictEqual(resumo.rendimento_anual_estimado_total, 1200);
  assert.strictEqual(resumo.rendimento_mensal_estimado_total, 94.89);
});
