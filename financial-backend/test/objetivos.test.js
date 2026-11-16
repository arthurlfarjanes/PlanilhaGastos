const test = require("node:test");
const assert = require("node:assert");
const { enrichObjetivo, calcularResumoObjetivos } = require("../utils/objetivos");

test("enrichObjetivo calcula progresso, estimativa de conclusão e situação no prazo", () => {
  const objNoPrazo = enrichObjetivo(
    {
      id: 1,
      nome: "Reserva 6 meses",
      categoria: "reserva_emergencia",
      valor_alvo: "12000.00",
      valor_atual: "2000.00",
      aporte_mensal_planejado: "1000.00",
      prazo: "2027-12-01",
      prioridade: "alta",
      status: "ativo",
    },
    "2026-11-14",
  );

  assert.strictEqual(objNoPrazo.valor_restante, 10000);
  assert.strictEqual(objNoPrazo.percentual_concluido, 16.7);
  assert.strictEqual(objNoPrazo.meses_estimados, 10);
  assert.strictEqual(objNoPrazo.data_estimada, "2027-09-14");
  assert.strictEqual(objNoPrazo.situacao_prazo, "no_prazo");

  const objAtencao = enrichObjetivo(
    {
      id: 2,
      nome: "Viagem",
      categoria: "viagem",
      valor_alvo: "6000.00",
      valor_atual: "1000.00",
      aporte_mensal_planejado: "400.00",
      prazo: "2027-05-14", // 6 meses -> precisa >= 833.34/mês
      prioridade: "media",
      status: "ativo",
    },
    "2026-11-14",
  );
  assert.strictEqual(objAtencao.meses_estimados, 13);
  assert.strictEqual(objAtencao.aporte_necessario_prazo, 833.34);
  assert.strictEqual(objAtencao.situacao_prazo, "atencao");
});

test("calcularResumoObjetivos ignora pausados nos totais e consolida contagem", () => {
  const itens = [
    enrichObjetivo(
      { id: 1, nome: "A", valor_alvo: 1000, valor_atual: 400, aporte_mensal_planejado: 200, status: "ativo" },
      "2026-11-14",
    ),
    enrichObjetivo(
      { id: 2, nome: "B", valor_alvo: 1000, valor_atual: 1000, aporte_mensal_planejado: 500, status: "concluido" },
      "2026-11-14",
    ),
    enrichObjetivo(
      { id: 3, nome: "C", valor_alvo: 5000, valor_atual: 100, aporte_mensal_planejado: 300, status: "pausado" },
      "2026-11-14",
    ),
  ];

  const resumo = calcularResumoObjetivos(itens);
  assert.strictEqual(resumo.total_alvo, 2000);
  assert.strictEqual(resumo.total_acumulado, 1400);
  assert.strictEqual(resumo.total_restante, 600);
  assert.strictEqual(resumo.percentual_geral, 70);
  assert.strictEqual(resumo.aporte_mensal_planejado_total, 200);
  assert.deepStrictEqual(resumo.contagem, { total: 3, ativos: 1, concluidos: 1, pausados: 1 });
});

test("enrichObjetivo considera rendimento composto do patrimônio vinculado na previsão", () => {
  const semRend = enrichObjetivo(
    {
      id: 10,
      nome: "Meta Sem Rend",
      valor_alvo: 12000,
      valor_atual: 6000,
      aporte_mensal_planejado: 500,
      status: "ativo",
    },
    "2026-11-16",
  );
  const comRend = enrichObjetivo(
    {
      id: 11,
      nome: "Meta Com CDI",
      valor_alvo: 12000,
      valor_atual: 6000,
      aporte_mensal_planejado: 500,
      patrimonio_id: 1,
      patrimonio_nome: "CDB",
      patrimonio_rendimento_tipo: "mensal",
      patrimonio_rendimento_valor: 1.5,
      status: "ativo",
    },
    "2026-11-16",
  );

  assert.strictEqual(semRend.considera_rendimento_patrimonio, false);
  assert.strictEqual(semRend.meses_estimados, 12);
  assert.strictEqual(comRend.considera_rendimento_patrimonio, true);
  assert.strictEqual(comRend.taxa_mensal_patrimonio, 1.5);
  assert.ok(comRend.meses_estimados < semRend.meses_estimados);
});
