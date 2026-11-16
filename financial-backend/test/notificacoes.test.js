const test = require("node:test");
const assert = require("node:assert");
const { gerarLembretesFinanceiros } = require("../utils/notificacoes");

test("gerarLembretesFinanceiros agrega e ordena por severidade respeitando preferencias", () => {
  const data = {
    contas: [
      { id: 1, ativo: true, pagamento: null, tipo: "despesa", status_competencia: "atrasado", dias_para_vencer: -2, descricao: "Aluguel", valor: 1500, data_vencimento: "2026-11-14" },
      { id: 2, ativo: true, pagamento: null, tipo: "despesa", status_competencia: "pendente", dias_para_vencer: 3, descricao: "Internet", valor: 120, data_vencimento: "2026-11-19" },
      { id: 3, ativo: true, pagamento: null, tipo: "despesa", status_competencia: "pendente", dias_para_vencer: 10, descricao: "Longe", valor: 90, data_vencimento: "2026-11-26" },
    ],
    cartoesFaturas: [
      { cartao_id: 1, cartao_nome: "Nubank", competencia_ano: 2026, competencia_mes: 11, status: "fechada", paga: false, total: 800, vencimento: "2026-11-16" },
    ],
    orcamentos: [
      { id: 5, ativo: true, status: "excedido", categoria_nome: "Lazer", percentual_consumido: 110, alerta_percentual: 80, gasto_realizado: 550 },
    ],
    objetivos: [
      { id: 7, status: "ativo", situacao_prazo: "atencao", nome: "Viagem", percentual_concluido: 40, aporte_necessario_prazo: 600, prazo: "2027-06-01", dias_ate_prazo: 197, valor_restante: 3000 },
    ],
    refTodayISO: "2026-11-16",
  };

  const out = gerarLembretesFinanceiros({ ...data, prefs: { enabled: true, daysAhead: 5 } });
  assert.strictEqual(out.resumo.total, 5);
  assert.strictEqual(out.resumo.alta, 3);
  assert.strictEqual(out.resumo.media, 1);
  assert.strictEqual(out.resumo.baixa, 1);
  assert.strictEqual(out.lembretes[0].severidade, "alta");

  const desabilitado = gerarLembretesFinanceiros({ ...data, prefs: { enabled: false } });
  assert.strictEqual(desabilitado.resumo.total, 0);

  const semOrcamentos = gerarLembretesFinanceiros({
    ...data,
    prefs: { enabled: true, daysAhead: 5, remindBudgets: false, remindGoals: false },
  });
  assert.strictEqual(semOrcamentos.resumo.total, 3);
});
