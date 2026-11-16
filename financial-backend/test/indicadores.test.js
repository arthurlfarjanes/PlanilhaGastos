const test = require("node:test");
const assert = require("node:assert");
const { calcularIndicadoresFinanceiros } = require("../utils/indicadores");

test("calcularIndicadoresFinanceiros calcula taxa de economia e comprometimento de renda em centavos", () => {
  const res = calcularIndicadoresFinanceiros({
    receitas: 5000.1,
    despesas: 3200.05,
    contasFixasDespesas: 1800,
    dividasMensais: 700,
    faturasMesAtual: 950,
    patrimonioResumo: {
      patrimonio_liquido: 12000,
      total_ativos: 15000,
      total_passivos: 3000,
      rendimento_mensal_estimado_total: 120,
    },
    objetivosResumo: {
      percentual_geral: 45.5,
      total_acumulado: 4550,
      total_alvo: 10000,
      contagem: { ativos: 2, concluidos: 1, pausados: 0, total: 3 },
    },
  });

  assert.strictEqual(res.economia_periodo, 1800.05);
  assert.strictEqual(res.taxa_economia_percentual, 36);
  assert.strictEqual(res.taxa_economia_status, "saudavel");
  assert.strictEqual(res.comprometimento_fixo_dividas, 2500);
  assert.strictEqual(res.comprometimento_renda_percentual, 50);
  assert.strictEqual(res.comprometimento_status, "saudavel");
  assert.strictEqual(res.gasto_sobre_renda_percentual, 64);
  assert.strictEqual(res.patrimonio_liquido, 12000);
  assert.strictEqual(res.objetivos_ativos, 2);
});

test("calcularIndicadoresFinanceiros trata corretamente cenário sem receitas e déficit", () => {
  const semReceita = calcularIndicadoresFinanceiros({
    receitas: 0,
    despesas: 500,
    contasFixasDespesas: 400,
  });
  assert.strictEqual(semReceita.taxa_economia_percentual, null);
  assert.strictEqual(semReceita.taxa_economia_status, "sem_receita");
  assert.strictEqual(semReceita.comprometimento_renda_percentual, null);
  assert.strictEqual(semReceita.comprometimento_status, "sem_receita");

  const deficit = calcularIndicadoresFinanceiros({
    receitas: 2000,
    despesas: 2500,
    contasFixasDespesas: 1200,
    dividasMensais: 500,
  });
  assert.strictEqual(deficit.economia_periodo, -500);
  assert.strictEqual(deficit.taxa_economia_percentual, -25);
  assert.strictEqual(deficit.taxa_economia_status, "critico");
  assert.strictEqual(deficit.comprometimento_renda_percentual, 85);
  assert.strictEqual(deficit.comprometimento_status, "critico");
});
