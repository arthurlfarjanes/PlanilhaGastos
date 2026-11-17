const { todayISO } = require("../utils/contasFixas");
const { isISODate } = require("../utils/validation");
const {
  REPORT_CSV_TYPES,
  defaultReportPeriod,
  buildRelatorioCsv,
  gerarRelatorioPdfBuffer,
} = require("../utils/relatorios");
const { buildUserFinancialReport } = require("../services/relatoriosService");

function parsePeriodQuery(query) {
  const refDate = query.refDate ? String(query.refDate).trim() : todayISO();
  if (!isISODate(refDate)) {
    return { ok: false, error: "Parâmetro refDate inválido (use YYYY-MM-DD)." };
  }
  const defaults = defaultReportPeriod(refDate);
  const dataInicio = query.dataInicio ? String(query.dataInicio).trim() : defaults.dataInicio;
  const dataFim = query.dataFim ? String(query.dataFim).trim() : defaults.dataFim;
  if (!isISODate(dataInicio) || !isISODate(dataFim)) {
    return { ok: false, error: "Datas de início e fim devem estar no formato YYYY-MM-DD." };
  }
  if (dataInicio > dataFim) {
    return { ok: false, error: "A data inicial não pode ser posterior à data final." };
  }
  return { ok: true, refDate, dataInicio, dataFim };
}

exports.obterResumoRelatorio = async (req, res, next) => {
  const parsed = parsePeriodQuery(req.query);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  try {
    res.set("Cache-Control", "no-store");
    const report = await buildUserFinancialReport(req.user.userId, parsed);
    res.json(report);
  } catch (err) {
    next(err);
  }
};

exports.exportarCsv = async (req, res, next) => {
  const parsed = parsePeriodQuery(req.query);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const tipo = req.query.tipo ? String(req.query.tipo).trim() : "transacoes";
  if (!REPORT_CSV_TYPES.has(tipo)) {
    return res.status(400).json({
      error: "Tipo de CSV inválido. Use: transacoes, orcamentos, patrimonio_dividas ou executivo.",
    });
  }

  try {
    const report = await buildUserFinancialReport(req.user.userId, parsed);
    const csv = buildRelatorioCsv(tipo, report);
    const filename = `mefinance-${tipo}-${parsed.dataInicio}-a-${parsed.dataFim}.csv`;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

exports.exportarPdf = async (req, res, next) => {
  const parsed = parsePeriodQuery(req.query);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const incluirTransacoes = req.query.incluirTransacoes !== "false";

  try {
    const report = await buildUserFinancialReport(req.user.userId, {
      ...parsed,
      incluirTransacoes,
    });
    const pdfBuffer = await gerarRelatorioPdfBuffer(report);
    const filename = `mefinance-relatorio-${parsed.dataInicio}-a-${parsed.dataFim}.pdf`;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
