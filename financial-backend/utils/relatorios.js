/**
 * Motor determinístico de formatação de Relatórios Inteligentes (CSV e PDF).
 * - Todo cálculo financeiro permanece em centavos inteiros no backend.
 * - CSV inclui UTF-8 BOM + proteção contra CSV Formula Injection.
 * - PDF é gerado em memória via PDFKit (sem arquivos temporários em disco).
 */
const PDFDocument = require("pdfkit");
const { toCents, fromCents, todayISO } = require("./contasFixas");
const { monthDateBounds } = require("./orcamentos");

const REPORT_CSV_TYPES = new Set([
  "transacoes",
  "orcamentos",
  "patrimonio_dividas",
  "executivo",
]);

const DANGER_FORMULA_PREFIX_RE = /^[\s\u0000-\u001F]*[=+\-@\t\r]/;

function defaultReportPeriod(refDate = todayISO()) {
  const [ano, mes] = refDate.split("-").map(Number);
  const { start, endExclusive } = monthDateBounds(ano, mes);
  const endDate = new Date(`${endExclusive}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  return {
    dataInicio: start,
    dataFim: endDate.toISOString().slice(0, 10),
  };
}

function formatMoneyBRL(value) {
  const num = Number(value || 0);
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${num < 0 ? "-" : ""}R$ ${formatted}`;
}

function formatDateBR(iso) {
  if (!iso || typeof iso !== "string") return "-";
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatDecimalBR(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

/**
 * Escapa célula CSV seguindo RFC 4180 e neutraliza CSV Formula Injection (OWASP).
 */
function sanitizeCsvCell(value, { numeric = false, delimiter = ";" } = {}) {
  if (value === null || value === undefined) return "";
  if (numeric && typeof value === "number" && Number.isFinite(value)) {
    return formatDecimalBR(value);
  }
  let text = String(value).replace(/\r\n/g, " ").replace(/[\r\n]/g, " ");
  if (!numeric && DANGER_FORMULA_PREFIX_RE.test(text)) {
    text = `'${text}`;
  }
  if (
    text.includes('"') ||
    text.includes(delimiter) ||
    text.includes(",") ||
    text.includes(";") ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsvString(headers, rows, { delimiter = ";", bom = true, numericCols = new Set() } = {}) {
  const headerLine = headers
    .map((h) => sanitizeCsvCell(h, { delimiter }))
    .join(delimiter);
  const bodyLines = rows.map((row) =>
    row
      .map((cell, idx) =>
        sanitizeCsvCell(cell, {
          delimiter,
          numeric: numericCols.has(idx),
        }),
      )
      .join(delimiter),
  );
  const content = [headerLine, ...bodyLines].join("\r\n");
  return `${bom ? "\uFEFF" : ""}${content}\r\n`;
}

function buildRelatorioCsv(tipo, report) {
  if (!REPORT_CSV_TYPES.has(tipo)) {
    throw new Error(`Tipo de CSV inválido: ${tipo}`);
  }

  if (tipo === "transacoes") {
    const headers = ["Data", "Tipo", "Descrição", "Categoria", "Cartão", "Valor (R$)"];
    const rows = (report.transacoes || []).map((t) => [
      formatDateBR(t.data),
      t.tipo === "receita" ? "Receita" : "Despesa",
      t.descricao || "",
      t.tipo === "receita" ? "Receita" : t.categoria_nome || "Sem categoria",
      t.cartao_nome || (t.cartao_excluido_nome ? `Cartão excluído (${t.cartao_excluido_nome})` : ""),
      Number(t.valor || 0),
    ]);
    return toCsvString(headers, rows, { numericCols: new Set([5]) });
  }

  if (tipo === "orcamentos") {
    const headers = [
      "Categoria",
      "Limite Mensal (R$)",
      "Gasto Realizado (R$)",
      "Saldo Restante (R$)",
      "% Consumido",
      "Status",
      "Ativo",
    ];
    const rows = (report.orcamentos || []).map((o) => [
      o.categoria_nome || "",
      Number(o.valor_limite || 0),
      Number(o.gasto_realizado || 0),
      Number(o.saldo_restante || 0),
      Number(o.percentual_consumido || 0),
      o.status || "ok",
      o.ativo ? "Sim" : "Não",
    ]);
    return toCsvString(headers, rows, { numericCols: new Set([1, 2, 3, 4]) });
  }

  if (tipo === "patrimonio_dividas") {
    const headers = [
      "Natureza",
      "Nome",
      "Categoria / Liquidez",
      "Saldo / Valor Atual (R$)",
      "Taxa / Juros (%)",
      "Parcela / Meta Mensal (R$)",
      "Status / Instituição",
    ];
    const patRows = (report.patrimonio?.itens || []).map((p) => [
      "Ativo",
      p.nome || "",
      `${p.tipo || ""} · liquidez ${p.liquidez || ""}`,
      Number(p.valor_atual || 0),
      Number(p.taxa_anual_efetiva || 0),
      0,
      `${p.ativo ? "Ativo" : "Inativo"}${p.instituicao ? ` · ${p.instituicao}` : ""}`,
    ]);
    const divRows = (report.dividas?.itens || []).map((d) => [
      "Passivo / Dívida",
      d.nome || "",
      d.tipo || "",
      Number(d.saldo_devedor || 0),
      Number(d.taxa_juros_mensal || 0),
      Number(d.valor_parcela_mensal || 0),
      d.status || "ativa",
    ]);
    return toCsvString(headers, [...patRows, ...divRows], {
      numericCols: new Set([3, 4, 5]),
    });
  }

  // "executivo"
  const headers = ["Seção", "Indicador / Item", "Valor / Detalhe", "Observação"];
  const r = report.resumo_periodo || {};
  const ind = report.indicadores || {};
  const saude = report.saude_financeira || {};
  const rows = [
    ["Período", "Intervalo analisado", `${formatDateBR(report.periodo?.dataInicio)} a ${formatDateBR(report.periodo?.dataFim)}`, `Gerado em ${formatDateBR(report.gerado_em)}`],
    ["Fluxo do Período", "Receitas totais", formatMoneyBRL(r.receitas || 0), `${r.qtd_receitas || 0} lançamento(s)`],
    ["Fluxo do Período", "Despesas totais", formatMoneyBRL(r.despesas || 0), `${r.qtd_despesas || 0} lançamento(s)`],
    ["Fluxo do Período", "Resultado líquido", formatMoneyBRL(r.economia || 0), `Taxa de economia: ${r.taxa_economia_pct ?? 0}%`],
    ["Indicadores Atuais", "Comprometimento Fixo + Dívidas", `${ind.comprometimento_renda_pct ?? 0}%`, `Contas + Dívidas: ${formatMoneyBRL(ind.comprometimento_mensal_total || 0)}`],
    ["Indicadores Atuais", "Patrimônio Líquido", formatMoneyBRL(ind.patrimonio_liquido || 0), `Ativos ${formatMoneyBRL(report.patrimonio?.resumo?.total_ativos || 0)} - Dívidas ${formatMoneyBRL(report.dividas?.resumo?.total_saldo_devedor || 0)}`],
    ["Saúde Financeira", "Score Geral (0-100)", `${Number(saude.score || 0)}/100`, saude.classificacao || "-"],
  ];

  for (const pilar of saude.pilares || []) {
    rows.push(["Pilar de Saúde", pilar.nome, `${pilar.pontos}/${pilar.maximo}`, pilar.resumo || ""]);
  }
  for (const cat of report.categorias_despesa || []) {
    rows.push(["Categoria de Despesa", cat.categoria_nome, formatMoneyBRL(cat.total || 0), `${cat.percentual || 0}% das despesas do período`]);
  }
  for (const diag of (report.diagnosticos || []).slice(0, 8)) {
    rows.push(["Diagnóstico", `[${String(diag.severidade || "").toUpperCase()}] ${diag.titulo}`, diag.descricao || "", diag.acao_label || ""]);
  }
  for (const op of (report.otimizacao?.oportunidades_corte || []).slice(0, 8)) {
    rows.push(["Otimização", op.titulo, formatMoneyBRL(op.economia_mensal_sugerida || 0), op.descricao || ""]);
  }
  return toCsvString(headers, rows);
}

/**
 * Gera PDF Executivo A4 multi-página em memória usando PDFKit.
 */
function gerarRelatorioPdfBuffer(report) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 44,
        bufferPages: true,
        info: {
          Title: `Relatório Financeiro MeFinance (${formatDateBR(report.periodo?.dataInicio)} a ${formatDateBR(report.periodo?.dataFim)})`,
          Author: "MeFinance",
          Subject: "Relatório Financeiro Inteligente",
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width - 88;
      const bottomLimit = doc.page.height - 62;
      const emerald = "#059669";
      const slateDark = "#0f172a";
      const slateMuted = "#475569";
      const slateBorder = "#cbd5e1";

      const ensureSpace = (needed = 60) => {
        if (doc.y + needed > bottomLimit) {
          doc.addPage();
          doc.y = 44;
        }
      };

      const drawSectionTitle = (title) => {
        ensureSpace(44);
        doc.moveDown(0.5);
        doc.fillColor(emerald).font("Helvetica-Bold").fontSize(12).text(title, 44);
        doc
          .moveTo(44, doc.y + 3)
          .lineTo(44 + pageWidth, doc.y + 3)
          .lineWidth(0.8)
          .strokeColor(slateBorder)
          .stroke();
        doc.moveDown(0.6);
      };

      // Cabeçalho
      doc.fillColor(slateDark).font("Helvetica-Bold").fontSize(18).text("MeFinance", 44, 44);
      doc
        .fillColor(emerald)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Relatório Financeiro Inteligente", 44);
      doc.moveDown(0.3);
      doc
        .fillColor(slateMuted)
        .font("Helvetica")
        .fontSize(9.5)
        .text(
          `Titular: ${report.usuario?.username || "-"}   |   Período: ${formatDateBR(report.periodo?.dataInicio)} a ${formatDateBR(report.periodo?.dataFim)}   |   Emitido em: ${formatDateBR(report.gerado_em)}`,
        );

      // 1. Resumo Executivo (KPIs)
      drawSectionTitle("1. Resumo Financeiro do Período");
      const r = report.resumo_periodo || {};
      const ind = report.indicadores || {};
      const kpis = [
        ["Receitas do Período", formatMoneyBRL(r.receitas)],
        ["Despesas do Período", formatMoneyBRL(r.despesas)],
        ["Resultado Líquido", formatMoneyBRL(r.economia)],
        ["Taxa de Economia (período)", `${r.taxa_economia_pct ?? 0}%`],
        ["Comprometimento Fixo + Dívidas", `${ind.comprometimento_renda_pct ?? 0}% (${formatMoneyBRL(ind.comprometimento_mensal_total || 0)}/mês)`],
        ["Patrimônio Líquido Atual", formatMoneyBRL(ind.patrimonio_liquido || 0)],
      ];

      kpis.forEach(([label, value]) => {
        ensureSpace(20);
        const y = doc.y;
        doc.fillColor(slateMuted).font("Helvetica").fontSize(10).text(label, 48, y, { width: 250 });
        doc.fillColor(slateDark).font("Helvetica-Bold").fontSize(10).text(value, 305, y, { width: pageWidth - 261, align: "right" });
        doc.y = y + 17;
      });

      // 2. Score de Saúde Financeira
      const saude = report.saude_financeira || {};
      drawSectionTitle(`2. Saúde Financeira Determinística — ${saude.score ?? 0}/100 (${saude.classificacao || "-"})`);
      for (const pilar of saude.pilares || []) {
        ensureSpace(26);
        const y = doc.y;
        doc.fillColor(slateDark).font("Helvetica-Bold").fontSize(9.5).text(`${pilar.nome}: ${pilar.pontos}/${pilar.maximo} pts`, 48, y);
        doc.fillColor(slateMuted).font("Helvetica").fontSize(9).text(pilar.resumo || "", 56, doc.y + 1, { width: pageWidth - 20 });
        doc.moveDown(0.35);
      }

      // 3. Diagnósticos e Oportunidades de Otimização
      const diags = report.diagnosticos || [];
      const opps = report.otimizacao?.oportunidades_corte || [];
      if (diags.length > 0 || opps.length > 0) {
        drawSectionTitle("3. Diagnósticos e Oportunidades de Otimização");
        if (report.otimizacao?.economia_total_potencial_mensal > 0) {
          ensureSpace(24);
          doc
            .fillColor(emerald)
            .font("Helvetica-Bold")
            .fontSize(10)
            .text(
              `Economia potencial identificada: ${formatMoneyBRL(report.otimizacao.economia_total_potencial_mensal)}/mês (${formatMoneyBRL(report.otimizacao.economia_total_potencial_anual || 0)}/ano)`,
              48,
            );
          doc.moveDown(0.3);
        }

        for (const d of diags.slice(0, 6)) {
          ensureSpace(34);
          doc
            .fillColor(slateDark)
            .font("Helvetica-Bold")
            .fontSize(9.5)
            .text(`[${String(d.severidade || "info").toUpperCase()}] ${d.titulo}`, 48, doc.y, { width: pageWidth - 12 });
          doc
            .fillColor(slateMuted)
            .font("Helvetica")
            .fontSize(9)
            .text(d.descricao || "", 56, doc.y + 1, { width: pageWidth - 20 });
          doc.moveDown(0.3);
        }

        for (const op of opps.slice(0, 5)) {
          ensureSpace(30);
          doc
            .fillColor(slateDark)
            .font("Helvetica-Bold")
            .fontSize(9.5)
            .text(`• ${op.titulo} (economia sugerida: ${formatMoneyBRL(op.economia_mensal_sugerida)}/mês)`, 48, doc.y, { width: pageWidth - 12 });
          if (op.descricao) {
            doc
              .fillColor(slateMuted)
              .font("Helvetica")
              .fontSize(8.8)
              .text(op.descricao, 56, doc.y + 1, { width: pageWidth - 20 });
          }
          doc.moveDown(0.25);
        }
      }

      // 4. Maiores Categorias de Despesa
      const cats = report.categorias_despesa || [];
      if (cats.length > 0) {
        drawSectionTitle("4. Despesas por Categoria no Período");
        for (const cat of cats.slice(0, 10)) {
          ensureSpace(18);
          const y = doc.y;
          doc.fillColor(slateDark).font("Helvetica").fontSize(9.5).text(cat.categoria_nome || "Sem categoria", 48, y, { width: 250 });
          doc.fillColor(slateMuted).font("Helvetica").fontSize(9.5).text(`${cat.percentual || 0}%`, 305, y, { width: 65, align: "right" });
          doc.fillColor(slateDark).font("Helvetica-Bold").fontSize(9.5).text(formatMoneyBRL(cat.total), 375, y, { width: pageWidth - 331, align: "right" });
          doc.y = y + 16;
        }
      }

      // 5. Orçamentos, Dívidas e Objetivos
      const orcs = report.orcamentos || [];
      const divs = (report.dividas?.itens || []).filter((d) => d.status !== "quitada");
      const objs = report.objetivos?.itens || [];
      if (orcs.length > 0 || divs.length > 0 || objs.length > 0) {
        drawSectionTitle("5. Orçamentos, Dívidas e Objetivos");
        if (orcs.length > 0) {
          ensureSpace(22);
          doc.fillColor(slateDark).font("Helvetica-Bold").fontSize(9.5).text("Orçamentos do mês atual:", 48);
          for (const o of orcs.slice(0, 8)) {
            ensureSpace(17);
            const y = doc.y;
            doc.fillColor(slateMuted).font("Helvetica").fontSize(9).text(`• ${o.categoria_nome}`, 56, y, { width: 210 });
            doc
              .fillColor(slateDark)
              .font("Helvetica")
              .fontSize(9)
              .text(`${formatMoneyBRL(o.gasto_realizado)} / ${formatMoneyBRL(o.valor_limite)} (${o.percentual_consumido}%)`, 270, y, {
                width: pageWidth - 226,
                align: "right",
              });
            doc.y = y + 15;
          }
          doc.moveDown(0.3);
        }

        if (divs.length > 0) {
          ensureSpace(22);
          doc.fillColor(slateDark).font("Helvetica-Bold").fontSize(9.5).text("Dívidas ativas / pausadas:", 48);
          for (const d of divs.slice(0, 6)) {
            ensureSpace(17);
            const y = doc.y;
            doc.fillColor(slateMuted).font("Helvetica").fontSize(9).text(`• ${d.nome}`, 56, y, { width: 210 });
            doc
              .fillColor(slateDark)
              .font("Helvetica")
              .fontSize(9)
              .text(`Saldo: ${formatMoneyBRL(d.saldo_devedor)} (${d.taxa_juros_mensal || 0}% a.m.)`, 270, y, {
                width: pageWidth - 226,
                align: "right",
              });
            doc.y = y + 15;
          }
          doc.moveDown(0.3);
        }

        if (objs.length > 0) {
          ensureSpace(22);
          doc.fillColor(slateDark).font("Helvetica-Bold").fontSize(9.5).text("Objetivos cadastrados:", 48);
          for (const ob of objs.slice(0, 6)) {
            ensureSpace(17);
            const y = doc.y;
            doc.fillColor(slateMuted).font("Helvetica").fontSize(9).text(`• ${ob.nome}`, 56, y, { width: 210 });
            doc
              .fillColor(slateDark)
              .font("Helvetica")
              .fontSize(9)
              .text(`${formatMoneyBRL(ob.valor_atual)} / ${formatMoneyBRL(ob.valor_alvo)} (${ob.percentual_concluido}%)`, 270, y, {
                width: pageWidth - 226,
                align: "right",
              });
            doc.y = y + 15;
          }
        }
      }

      // 6. Extrato de Transações do Período (opcional)
      if (report.incluir_transacoes !== false) {
        const txs = report.transacoes || [];
        drawSectionTitle(`6. Extrato de Transações do Período (${txs.length} registro(s))`);
        if (txs.length === 0) {
          doc.fillColor(slateMuted).font("Helvetica").fontSize(9.5).text("Nenhuma transação registrada no intervalo selecionado.", 48);
        } else {
          const maxPdfRows = 150;
          const slice = txs.slice(0, maxPdfRows);
          for (const tx of slice) {
            ensureSpace(17);
            const y = doc.y;
            const sinal = tx.tipo === "receita" ? "+" : "-";
            const desc = `${formatDateBR(tx.data)} · ${tx.descricao || ""}`;
            const cat = tx.tipo === "receita" ? "Receita" : tx.categoria_nome || "Sem categoria";
            doc.fillColor(slateDark).font("Helvetica").fontSize(8.5).text(desc, 48, y, { width: 255, lineBreak: false, ellipsis: true });
            doc.fillColor(slateMuted).font("Helvetica").fontSize(8.5).text(cat, 308, y, { width: 105, lineBreak: false, ellipsis: true });
            doc
              .fillColor(tx.tipo === "receita" ? emerald : "#dc2626")
              .font("Helvetica-Bold")
              .fontSize(8.5)
              .text(`${sinal} ${formatMoneyBRL(tx.valor)}`, 418, y, { width: pageWidth - 374, align: "right" });
            doc.y = y + 15;
          }
          if (txs.length > maxPdfRows) {
            ensureSpace(20);
            doc
              .fillColor(slateMuted)
              .font("Helvetica-Oblique")
              .fontSize(8.5)
              .text(
                `Exibidas as primeiras ${maxPdfRows} de ${txs.length} transações. Para o extrato completo sem cortes, exporte em CSV.`,
                48,
              );
          }
        }
      }

      // Paginação / rodapé em todas as páginas
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc
          .fillColor(slateMuted)
          .font("Helvetica")
          .fontSize(8)
          .text(
            `MeFinance · Cálculos determinísticos auditáveis · Página ${i + 1} de ${range.count}`,
            44,
            doc.page.height - 36,
            { width: pageWidth, align: "center" },
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function summarizePeriodTransactions(transacoes = []) {
  let receitasCents = 0;
  let despesasCents = 0;
  let qtdReceitas = 0;
  let qtdDespesas = 0;
  const catMap = new Map();

  for (const t of transacoes) {
    const cents = toCents(t.valor);
    if (t.tipo === "receita") {
      receitasCents += cents;
      qtdReceitas += 1;
    } else {
      despesasCents += cents;
      qtdDespesas += 1;
      const catKey = t.categoria_nome || "Sem categoria";
      const prev = catMap.get(catKey) || {
        categoria_nome: catKey,
        categoria_cor: t.categoria_cor || "#64748b",
        totalCents: 0,
        quantidade: 0,
      };
      prev.totalCents += cents;
      prev.quantidade += 1;
      catMap.set(catKey, prev);
    }
  }

  const economiaCents = receitasCents - despesasCents;
  const taxaEconomiaPct =
    receitasCents > 0 ? Number(((economiaCents * 100) / receitasCents).toFixed(1)) : 0;

  const categoriasDespesa = Array.from(catMap.values())
    .sort((a, b) => b.totalCents - a.totalCents)
    .map((c) => ({
      categoria_nome: c.categoria_nome,
      categoria_cor: c.categoria_cor,
      total: fromCents(c.totalCents),
      quantidade: c.quantidade,
      percentual:
        despesasCents > 0 ? Number(((c.totalCents * 100) / despesasCents).toFixed(1)) : 0,
    }));

  return {
    resumo_periodo: {
      receitas: fromCents(receitasCents),
      despesas: fromCents(despesasCents),
      economia: fromCents(economiaCents),
      taxa_economia_pct: taxaEconomiaPct,
      qtd_receitas: qtdReceitas,
      qtd_despesas: qtdDespesas,
      total_transacoes: transacoes.length,
    },
    categorias_despesa: categoriasDespesa,
  };
}

module.exports = {
  REPORT_CSV_TYPES,
  defaultReportPeriod,
  sanitizeCsvCell,
  toCsvString,
  buildRelatorioCsv,
  gerarRelatorioPdfBuffer,
  summarizePeriodTransactions,
};
