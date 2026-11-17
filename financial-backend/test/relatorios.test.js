const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  sanitizeCsvCell,
  toCsvString,
  buildRelatorioCsv,
  gerarRelatorioPdfBuffer,
  summarizePeriodTransactions,
  defaultReportPeriod,
} = require("../utils/relatorios");
const relatoriosController = require("../controllers/relatoriosController");
const privacidadeController = require("../controllers/privacidadeController");

describe("Motor determinístico de Relatórios Inteligentes (CSV e PDF)", () => {
  it("neutraliza CSV Formula Injection e gera UTF-8 BOM com delimitador ;", () => {
    assert.equal(sanitizeCsvCell("=CMD|'/C calc'!A0"), "'=CMD|'/C calc'!A0");
    assert.equal(sanitizeCsvCell("+1+1"), "'+1+1");
    assert.equal(sanitizeCsvCell("@SUM(A1:A2)"), "'@SUM(A1:A2)");
    assert.equal(sanitizeCsvCell("Texto; com ponto"), '"Texto; com ponto"');
    assert.equal(sanitizeCsvCell(1234.5, { numeric: true }), "1234,50");

    const csv = toCsvString(["Descrição", "Valor"], [["=hack", 99.9]], {
      numericCols: new Set([1]),
    });
    assert.ok(csv.startsWith("\uFEFF"));
    assert.ok(csv.includes("'=hack;99,90"));
  });

  it("sumariza receitas, despesas e categorias em centavos exatos", () => {
    const res = summarizePeriodTransactions([
      { id: 1, tipo: "receita", valor: 5000.1, descricao: "Salário" },
      { id: 2, tipo: "despesa", valor: 1200.05, categoria_nome: "Moradia", categoria_cor: "#059669" },
      { id: 3, tipo: "despesa", valor: 300.05, categoria_nome: "Alimentação", categoria_cor: "#f59e0b" },
    ]);

    assert.equal(res.resumo_periodo.receitas, 5000.1);
    assert.equal(res.resumo_periodo.despesas, 1500.1);
    assert.equal(res.resumo_periodo.economia, 3500);
    assert.equal(res.categorias_despesa[0].categoria_nome, "Moradia");
    assert.equal(res.categorias_despesa[0].percentual, 80);
    assert.equal(res.categorias_despesa[1].percentual, 20);
  });

  it("gera todos os tipos de CSV e PDF executivo válido em memória", async () => {
    const periodo = defaultReportPeriod("2026-11-17");
    assert.deepEqual(periodo, { dataInicio: "2026-11-01", dataFim: "2026-11-30" });

    const sampleReport = {
      gerado_em: "2026-11-17",
      usuario: { username: "arthur", role: "user" },
      periodo,
      incluir_transacoes: true,
      resumo_periodo: {
        receitas: 6000,
        despesas: 3200,
        economia: 2800,
        taxa_economia_pct: 46.7,
        qtd_receitas: 1,
        qtd_despesas: 2,
      },
      indicadores: {
        comprometimento_renda_pct: 25,
        comprometimento_mensal_total: 1500,
        patrimonio_liquido: 18500,
      },
      saude_financeira: {
        score: 82,
        classificacao: "Saudável",
        pilares: [{ nome: "Fluxo e Economia", pontos: 20, maximo: 25, resumo: "Boa poupança" }],
      },
      diagnosticos: [
        { severidade: "positiva", titulo: "Reserva adequada", descricao: "Cobre 4 meses", acao_label: "Ver" },
      ],
      otimizacao: {
        economia_total_potencial_mensal: 350,
        economia_total_potencial_anual: 4200,
        oportunidades_corte: [{ titulo: "Reduzir delivery", economia_mensal_sugerida: 350, descricao: "25% acima" }],
      },
      categorias_despesa: [{ categoria_nome: "Moradia", total: 2000, percentual: 62.5 }],
      orcamentos: [{ categoria_nome: "Lazer", valor_limite: 600, gasto_realizado: 450, saldo_restante: 150, percentual_consumido: 75, status: "ok", ativo: true }],
      patrimonio: { itens: [{ nome: "Reserva CDB", tipo: "reserva_emergencia", liquidez: "imediata", valor_atual: 20000, taxa_anual_efetiva: 11.2, ativo: true }], resumo: { total_ativos: 20000 } },
      dividas: { itens: [{ nome: "Parcela Note", tipo: "parcelamento", saldo_devedor: 1500, taxa_juros_mensal: 0, valor_parcela_mensal: 500, status: "ativa" }], resumo: { total_saldo_devedor: 1500 } },
      objetivos: { itens: [{ nome: "Viagem", valor_atual: 4000, valor_alvo: 8000, percentual_concluido: 50 }] },
      transacoes: [
        { id: 1, data: "2026-11-05", tipo: "receita", descricao: "Salário", valor: 6000 },
        { id: 2, data: "2026-11-08", tipo: "despesa", descricao: "Aluguel", categoria_nome: "Moradia", valor: 2000 },
      ],
    };

    for (const tipo of ["transacoes", "orcamentos", "patrimonio_dividas", "executivo"]) {
      const csv = buildRelatorioCsv(tipo, sampleReport);
      assert.ok(csv.startsWith("\uFEFF"), `BOM esperado para ${tipo}`);
      assert.ok(csv.length > 40);
    }

    const pdfBuf = await gerarRelatorioPdfBuffer(sampleReport);
    assert.ok(Buffer.isBuffer(pdfBuf));
    assert.ok(pdfBuf.subarray(0, 5).toString("ascii") === "%PDF-");
    assert.ok(pdfBuf.length > 1000);
  });

  it("relatoriosController e privacidadeController validam query params e expõem handlers", async () => {
    assert.equal(typeof relatoriosController.obterResumoRelatorio, "function");
    assert.equal(typeof relatoriosController.exportarCsv, "function");
    assert.equal(typeof relatoriosController.exportarPdf, "function");
    assert.equal(typeof privacidadeController.obterResumo, "function");
    assert.equal(typeof privacidadeController.exportarDados, "function");
    assert.equal(typeof privacidadeController.excluirConta, "function");

    let statusCode = null;
    let body = null;
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      },
    };

    await relatoriosController.obterResumoRelatorio(
      { user: { userId: 1 }, query: { dataInicio: "2026-02-31", dataFim: "2026-11-30" } },
      mockRes,
      (err) => {
        throw err;
      },
    );
    assert.equal(statusCode, 400);
    assert.match(body.error, /YYYY-MM-DD/);

    statusCode = null;
    body = null;
    await relatoriosController.exportarCsv(
      {
        user: { userId: 1 },
        query: { dataInicio: "2026-11-01", dataFim: "2026-11-30", refDate: "2026-11-17", tipo: "invalido" },
      },
      mockRes,
      (err) => {
        throw err;
      },
    );
    assert.equal(statusCode, 400);
    assert.match(body.error, /Tipo de CSV inválido/);
  });
});
