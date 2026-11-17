const test = require("node:test");
const assert = require("node:assert");
const {
  derivarPremissasIniciais,
  agruparParcelasFuturasPorMes,
  gerarProjecaoECenarios,
} = require("../utils/projecoes");

test("derivarPremissasIniciais calcula médias fechadas e taxa ponderada do patrimônio", () => {
  const premissas = derivarPremissasIniciais({
    refDate: "2026-11-17",
    transacoesRecentes: [
      { tipo: "receita", valor: "6000.00", data: "2026-09-05" },
      { tipo: "despesa", valor: "4000.00", data: "2026-09-10" },
      { tipo: "receita", valor: "7000.00", data: "2026-10-05" },
      { tipo: "despesa", valor: "4500.00", data: "2026-10-12" },
    ],
    gastosFixos: [{ ativo: true, tipo: "despesa", valor: "1500.00" }],
    patrimonioItens: [
      { ativo: true, valor_atual: 10000, taxa_anual_estimada_percentual: 12 },
    ],
  });

  assert.strictEqual(premissas.receita_mensal_base, 6500);
  assert.strictEqual(premissas.despesa_mensal_base, 4250);
  assert.strictEqual(premissas.taxa_rendimento_anual_pct, 12);
});

test("gerarProjecaoECenarios compara cenário base vs simulado com inflação, dívidas, evento único e parcelas futuras", () => {
  const premissasIniciais = {
    receita_mensal_base: 5000,
    despesa_mensal_base: 4500,
    taxa_rendimento_anual_pct: 12,
    origem_base: "Teste unitário",
    origem_taxa_rendimento: "12% a.a.",
  };

  const out = gerarProjecaoECenarios({
    refDate: "2026-11-17",
    premissasIniciais,
    parametrosUsuario: {
      horizonte_meses: 12,
      variacao_despesa_pct: -20, // reduz despesa base para R$ 3.600
      aporte_mensal_extra: 500,
      inflacao_anual_pct: 6,
      evento_unico: { mes: 3, tipo: "receita", valor: 2000, descricao: "Bônus" },
    },
    patrimonioResumo: { total_ativos: 10000, total_passivos: 1200, patrimonio_liquido: 8800 },
    dividasItens: [
      { id: 1, status: "ativa", nome: "Cartão", saldo_devedor: 1200, taxa_juros_mensal: 2, valor_parcela: 450 },
    ],
    objetivosItens: [
      { id: 8, status: "ativo", nome: "Viagem", faltante: 6000, aporte_mensal_planejado: 400, meses_estimados: 15 },
    ],
    transacoesFuturas: [
      { tipo: "despesa", descricao: "Notebook (2/3)", valor: "500.00", data: "2026-12-10" },
    ],
  });

  assert.strictEqual(out.comparativo_mensal.length, 12);
  assert.strictEqual(out.comparativo_mensal[0].competencia, "2026-12");
  assert.ok(out.resumo_comparativo.diferenca_patrimonio_final > 0);
  assert.ok(
    out.resumo_comparativo.simulado.patrimonio_liquido_final_real <
      out.resumo_comparativo.simulado.patrimonio_liquido_final_nominal,
  );
  assert.strictEqual(out.resumo_comparativo.simulado.dividas_finais, 0);
  assert.ok(out.resumo_comparativo.simulado.dividas_quitadas_no_horizonte >= 1);
  assert.strictEqual(out.previsao_objetivos[0].id, 8);
  assert.ok(out.previsao_objetivos[0].meses_ganhos > 0);

  const mapFut = agruparParcelasFuturasPorMes(
    [{ tipo: "despesa", descricao: "TV (3/5)", valor: "300.00", data: "2026-12-15" }],
    "2026-11-17",
  );
  assert.strictEqual(mapFut.get("2026-12"), 30000);
});
