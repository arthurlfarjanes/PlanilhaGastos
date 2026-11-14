const test = require("node:test");
const assert = require("node:assert");

const {
  toCents,
  fromCents,
  resolveDueDate,
  enrichContaCompetencia,
  calcularResumoContas,
} = require("../utils/contasFixas");

test("aritmética em centavos evita erro de ponto flutuante (0.1 + 0.2 === 0.3)", () => {
  const soma = fromCents(toCents("0.10") + toCents("0.20"));
  assert.strictEqual(soma, 0.3);
});

test("resolveDueDate ajusta dia 31 para último dia de fevereiro (bissexto e não bissexto)", () => {
  assert.strictEqual(resolveDueDate(2026, 2, 31), "2026-02-28");
  assert.strictEqual(resolveDueDate(2024, 2, 31), "2024-02-29");
  assert.strictEqual(resolveDueDate(2026, 4, 31), "2026-04-30");
  assert.strictEqual(resolveDueDate(2026, 11, 10), "2026-11-10");
});

test("enrichContaCompetencia determina status atrasado, vence_hoje, pendente, pago e inativo", () => {
  const base = {
    id: 1,
    descricao: "Internet",
    valor: "99.90",
    dia_vencimento: 10,
    tipo: "despesa",
    is_assinatura: true,
    ativo: true,
    gerar_automatico: true,
  };

  const atrasado = enrichContaCompetencia(base, 2026, 11, "2026-11-13");
  assert.strictEqual(atrasado.status_competencia, "atrasado");
  assert.strictEqual(atrasado.dias_para_vencer, -3);

  const hoje = enrichContaCompetencia({ ...base, dia_vencimento: 13 }, 2026, 11, "2026-11-13");
  assert.strictEqual(hoje.status_competencia, "vence_hoje");
  assert.strictEqual(hoje.dias_para_vencer, 0);

  const pendente = enrichContaCompetencia({ ...base, dia_vencimento: 20 }, 2026, 11, "2026-11-13");
  assert.strictEqual(pendente.status_competencia, "pendente");
  assert.strictEqual(pendente.dias_para_vencer, 7);

  const pago = enrichContaCompetencia(
    { ...base, pagamento_id: 9, valor_pago: "99.90", data_pagamento: "2026-11-10", transacao_id: 55 },
    2026,
    11,
    "2026-11-13",
  );
  assert.strictEqual(pago.status_competencia, "pago");
  assert.strictEqual(pago.pagamento.transacao_id, 55);

  const inativo = enrichContaCompetencia({ ...base, ativo: false }, 2026, 11, "2026-11-13");
  assert.strictEqual(inativo.status_competencia, "inativo");
});

test("calcularResumoContas soma receitas, despesas pagas/pendentes, assinaturas e ordena próximos vencimentos", () => {
  const itens = [
    enrichContaCompetencia(
      { id: 1, descricao: "Salário", valor: "5000.00", dia_vencimento: 5, tipo: "receita", ativo: true },
      2026, 11, "2026-11-13",
    ),
    enrichContaCompetencia(
      { id: 2, descricao: "Aluguel", valor: "1500.10", dia_vencimento: 10, tipo: "despesa", ativo: true },
      2026, 11, "2026-11-13",
    ),
    enrichContaCompetencia(
      {
        id: 3,
        descricao: "Streaming",
        valor: "49.90",
        dia_vencimento: 12,
        tipo: "despesa",
        is_assinatura: true,
        ativo: true,
        pagamento_id: 1,
        valor_pago: "49.90",
        data_pagamento: "2026-11-12",
      },
      2026, 11, "2026-11-13",
    ),
    enrichContaCompetencia(
      { id: 4, descricao: "Academia", valor: "120.20", dia_vencimento: 20, tipo: "despesa", is_assinatura: true, ativo: true },
      2026, 11, "2026-11-13",
    ),
    enrichContaCompetencia(
      { id: 5, descricao: "Pausada", valor: "999.00", dia_vencimento: 15, tipo: "despesa", ativo: false },
      2026, 11, "2026-11-13",
    ),
  ];

  const resumo = calcularResumoContas(itens);
  assert.strictEqual(resumo.total_receitas_previstas, 5000);
  assert.strictEqual(resumo.total_despesas_previstas, 1670.2);
  assert.strictEqual(resumo.balanco_previsto, 3329.8);
  assert.strictEqual(resumo.total_despesas_pagas, 49.9);
  assert.strictEqual(resumo.total_despesas_pendentes, 1620.3);
  assert.strictEqual(resumo.total_assinaturas, 170.1);
  assert.strictEqual(resumo.contagem.pagas, 1);
  assert.strictEqual(resumo.contagem.atrasadas, 1);
  assert.strictEqual(resumo.contagem.pendentes, 2);
  assert.strictEqual(resumo.contagem.assinaturas, 2);
  assert.deepStrictEqual(
    resumo.proximos_vencimentos.map((x) => x.id),
    [2, 4],
  );
});

