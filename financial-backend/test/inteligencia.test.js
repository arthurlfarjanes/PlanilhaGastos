const test = require("node:test");
const assert = require("node:assert");
const {
  buildHistoricoCategorias,
  classificarDescricao,
  gerarSugestoesRevisao,
} = require("../utils/classificacao");
const {
  detectarRecorrenciasNaoCadastradas,
  analisarAnomaliasCategorias,
  calcularDiagnosticosFinanceiros,
} = require("../utils/diagnosticos");

const CATS = [
  { id: 1, nome: "Alimentação", cor: "#10b981" },
  { id: 2, nome: "Transporte", cor: "#3b82f6" },
  { id: 3, nome: "Assinaturas", cor: "#8b5cf6" },
  { id: 4, nome: "Outros", cor: "#64748b" },
];

test("classificarDescricao respeita prioridade: regra_usuario > historico_usuario > heuristica_semantica", () => {
  const regras = [
    { id: 10, padrao: "uber", tipo_match: "contains", categoria_id: 2, prioridade: 10, ativo: true },
    { id: 11, padrao: "uber eats", tipo_match: "contains", categoria_id: 1, prioridade: 20, ativo: true },
  ];

  const r1 = classificarDescricao({ descricao: "Uber Eats Restaurante", regras, categorias: CATS });
  assert.strictEqual(r1.categoria_id, 1);
  assert.strictEqual(r1.origem, "regra_usuario");
  assert.strictEqual(r1.regra_id, 11);

  const hist = buildHistoricoCategorias([
    { tipo: "despesa", descricao: "Mercado Bairro (1/2)", categoria_id: 1, categoria_nome: "Alimentação" },
    { tipo: "despesa", descricao: "Mercado Bairro (2/2)", categoria_id: 1, categoria_nome: "Alimentação" },
  ]);
  const r2 = classificarDescricao({
    descricao: "Mercado Bairro",
    regras: [],
    categorias: CATS,
    historicoPorDescricao: hist,
  });
  assert.strictEqual(r2.categoria_id, 1);
  assert.strictEqual(r2.origem, "historico_usuario");

  const r3 = classificarDescricao({
    descricao: "Corrida 99Pop Aeroporto",
    regras: [],
    categorias: CATS,
  });
  assert.strictEqual(r3.categoria_id, 2);
  assert.strictEqual(r3.origem, "heuristica_semantica");
});

test("gerarSugestoesRevisao detecta sem categoria, genericas e divergencia por regra explícita", () => {
  const regras = [
    { id: 1, padrao: "netflix", tipo_match: "contains", categoria_id: 3, prioridade: 10, ativo: true },
  ];
  const transacoes = [
    { id: 101, tipo: "despesa", descricao: "Netflix.com", valor: "55.90", data: "2026-11-10", categoria_id: 4, categoria_nome: "Outros" },
    { id: 102, tipo: "despesa", descricao: "Supermercado Extra", valor: "230.00", data: "2026-11-08", categoria_id: null, categoria_nome: null },
    { id: 103, tipo: "despesa", descricao: "Almoço", valor: "35.00", data: "2026-11-07", categoria_id: 1, categoria_nome: "Alimentação" },
  ];

  const out = gerarSugestoesRevisao({ transacoes, regras, categorias: CATS });
  assert.strictEqual(out.total_sugestoes, 2);
  assert.strictEqual(out.estatisticas.sem_categoria, 1);
  assert.strictEqual(out.estatisticas.em_categoria_generica, 1);
  assert.strictEqual(out.sugestoes[0].categoria_sugerida_id, 3);
  assert.strictEqual(out.sugestoes[1].categoria_sugerida_id, 1);
});

test("analisarAnomaliasCategorias e detectarRecorrenciasNaoCadastradas funcionam em centavos sem falsos positivos", () => {
  const anomalias = analisarAnomaliasCategorias({
    atualPorCategoria: [{ categoria_id: 1, categoria_nome: "Alimentação", total: "1200.00" }],
    historicoPorCategoria: [{ categoria_id: 1, categoria_nome: "Alimentação", total: "2100.00", meses_distintos: 3 }],
  });
  assert.strictEqual(anomalias.length, 1);
  assert.strictEqual(anomalias[0].media_3_meses, 700);
  assert.strictEqual(anomalias[0].variacao_percentual, 71.4);
  assert.strictEqual(anomalias[0].status, "acima_da_media");

  const recorrentes = detectarRecorrenciasNaoCadastradas(
    [
      { tipo: "despesa", descricao: "Academia Smart", valor: "119.90", data: "2026-10-05" },
      { tipo: "despesa", descricao: "Academia Smart", valor: "119.90", data: "2026-11-05" },
      { tipo: "despesa", descricao: "Notebook (1/3)", valor: "900.00", data: "2026-10-10" },
      { tipo: "despesa", descricao: "Notebook (2/3)", valor: "900.00", data: "2026-11-10" },
      { tipo: "despesa", descricao: "Internet Fibra", valor: "99.90", data: "2026-10-12" },
      { tipo: "despesa", descricao: "Internet Fibra", valor: "99.90", data: "2026-11-12" },
    ],
    [{ descricao: "Internet Fibra" }],
  );
  assert.strictEqual(recorrentes.length, 1);
  assert.strictEqual(recorrentes[0].descricao, "Academia Smart");
});

test("calcularDiagnosticosFinanceiros pontua cenarios saudavel e critico corretamente", () => {
  const saudavel = calcularDiagnosticosFinanceiros({
    indicadores: {
      receitas_periodo: 8000,
      despesas_periodo: 4800,
      taxa_economia_percentual: 40,
      comprometimento_renda_percentual: 30,
      comprometimento_fixo_dividas: 2400,
    },
    orcamentosItens: [{ ativo: true, status: "ok", categoria_nome: "Alimentação", valor_limite: 1500, gasto_realizado: 900 }],
    cartoesItens: [{ ativo: true, nome: "Nu", fatura_atual: { status: "aberta", total: 800 } }],
    cartoesResumo: { limite_total_global: 10000, limite_usado_global: 1200 },
    patrimonioResumo: { liquidez_imediata: 32000 },
    gastoMedioMensalCents: 480000,
  });
  assert.ok(saudavel.saude_financeira.score >= 85);
  assert.strictEqual(saudavel.saude_financeira.classificacao, "saudavel");

  const critico = calcularDiagnosticosFinanceiros({
    indicadores: {
      receitas_periodo: 3000,
      despesas_periodo: 4200,
      taxa_economia_percentual: -40,
      comprometimento_renda_percentual: 85,
      comprometimento_fixo_dividas: 2550,
    },
    orcamentosItens: [{ ativo: true, status: "excedido", categoria_nome: "Lazer", valor_limite: 300, gasto_realizado: 700 }],
    cartoesItens: [{ ativo: true, nome: "Visa", fatura_atual: { status: "vencida", total: 2200 } }],
    cartoesResumo: { limite_total_global: 3000, limite_usado_global: 2700 },
    dividasItens: [{ status: "ativa", nome: "Rotativo", taxa_juros_mensal: 12, saldo_devedor: 4000 }],
    dividasResumo: { estrategias: { avalanche: [{ nome: "Rotativo", taxa_juros_mensal: 12, saldo_devedor: 4000 }] } },
    patrimonioResumo: { liquidez_imediata: 200 },
    gastoMedioMensalCents: 400000,
  });
  assert.ok(critico.saude_financeira.score < 50);
  assert.strictEqual(critico.saude_financeira.classificacao, "critico");
  assert.ok(critico.diagnosticos.some((d) => d.severidade === "critica"));
});
