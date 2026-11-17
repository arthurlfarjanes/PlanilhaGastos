import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import toast from "react-hot-toast";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import { formatCurrency, formatDate, todayInTimezone } from "../utils/formatters";
import { AppTooltip } from "@/components/ui/Tooltip";

const SEVERIDADE_CFG = {
  critica: {
    cls: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-300",
    label: "Crítico",
    Icon: AlertOctagon,
  },
  atencao: {
    cls: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25 text-amber-800 dark:text-amber-300",
    label: "Atenção",
    Icon: AlertTriangle,
  },
  informativa: {
    cls: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/25 text-sky-800 dark:text-sky-300",
    label: "Info",
    Icon: Info,
  },
  positiva: {
    cls: "bg-emerald-50 dark:bg-lime-spark/10 border-emerald-200 dark:border-lime-spark/25 text-emerald-700 dark:text-lime-spark",
    label: "Positivo",
    Icon: CheckCircle2,
  },
};

function computePresetDates(preset, refToday) {
  const [y, m] = refToday.split("-").map(Number);
  const pad = (n) => String(n).padStart(2, "0");

  if (preset === "mes_atual") {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { dataInicio: `${y}-${pad(m)}-01`, dataFim: `${y}-${pad(m)}-${pad(lastDay)}` };
  }
  if (preset === "mes_anterior") {
    const d = new Date(Date.UTC(y, m - 2, 1));
    const py = d.getUTCFullYear();
    const pm = d.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(py, pm, 0)).getUTCDate();
    return { dataInicio: `${py}-${pad(pm)}-01`, dataFim: `${py}-${pad(pm)}-${pad(lastDay)}` };
  }
  if (preset === "ultimos_90") {
    const end = new Date(`${refToday}T00:00:00Z`);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 89);
    return { dataInicio: start.toISOString().slice(0, 10), dataFim: refToday };
  }
  return { dataInicio: `${y}-01-01`, dataFim: `${y}-12-31` };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";
  const refToday = useMemo(() => todayInTimezone(timezone), [timezone]);

  const inicial = useMemo(() => computePresetDates("mes_atual", refToday), [refToday]);
  const [dataInicio, setDataInicio] = useState(inicial.dataInicio);
  const [dataFim, setDataFim] = useState(inicial.dataFim);
  const [incluirTransacoes, setIncluirTransacoes] = useState(true);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(null);
  const [csvMenuAberto, setCsvMenuAberto] = useState(false);

  const carregarResumo = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ dataInicio, dataFim, refDate: refToday });
      const res = await fetch(`${API_URL}/relatorios/resumo?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar relatório.");
      setReport(json);
    } catch (err) {
      toast.error(err.message || "Falha ao gerar pré-visualização do relatório.");
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, dataInicio, dataFim, refToday]);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  const aplicarPreset = (preset) => {
    const next = computePresetDates(preset, refToday);
    setDataInicio(next.dataInicio);
    setDataFim(next.dataFim);
  };

  const baixarArquivo = async (formato, tipoCsv = "transacoes") => {
    if (!token) return;
    const key = formato === "pdf" ? "pdf" : `csv_${tipoCsv}`;
    setExportando(key);
    setCsvMenuAberto(false);
    try {
      const qs = new URLSearchParams({
        dataInicio,
        dataFim,
        refDate: refToday,
        ...(formato === "pdf" ? { incluirTransacoes: String(incluirTransacoes) } : { tipo: tipoCsv }),
      });
      const url = `${API_URL}/relatorios/exportar/${formato}?${qs.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Não foi possível exportar o arquivo.");
      }
      const blob = await res.blob();
      const filename =
        formato === "pdf"
          ? `mefinance-relatorio-${dataInicio}-a-${dataFim}.pdf`
          : `mefinance-${tipoCsv}-${dataInicio}-a-${dataFim}.csv`;
      downloadBlob(blob, filename);
      toast.success(
        formato === "pdf"
          ? "PDF executivo baixado com sucesso!"
          : `CSV (${tipoCsv.replace("_", " & ")}) baixado com sucesso!`,
      );
    } catch (err) {
      toast.error(err.message || "Falha na exportação.");
    } finally {
      setExportando(null);
    }
  };

  const resumo = report?.resumo_periodo || {};
  const ind = report?.indicadores || {};
  const saude = report?.saude_financeira || {};
  const cats = useMemo(() => (report?.categorias_despesa || []).slice(0, 8), [report]);
  const diags = report?.diagnosticos || [];
  const opps = report?.otimizacao?.oportunidades_corte || [];
  const txs = report?.transacoes || [];

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho e Ações de Exportação */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="text-emerald-600 dark:text-lime-spark" size={26} />
            Relatórios Inteligentes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Exporte relatórios executivos em PDF ou planilhas CSV compatíveis com Excel — com diagnóstico determinístico, categorias e plano de otimização.
          </p>
        </div>

        <div data-tour="relatorios-export" className="flex flex-wrap items-center gap-2 shrink-0">
          <AppTooltip content="Atualizar pré-visualização">
            <button
              type="button"
              onClick={carregarResumo}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </AppTooltip>

          {/* Dropdown Exportar CSV */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCsvMenuAberto((v) => !v)}
              disabled={Boolean(exportando)}
              aria-expanded={csvMenuAberto}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet size={15} className="text-emerald-600 dark:text-lime-spark" />
              {exportando?.startsWith("csv_") ? "Exportando CSV..." : "Exportar CSV"}
              <ChevronDown size={13} className={`transition-transform ${csvMenuAberto ? "rotate-180" : ""}`} />
            </button>

            {csvMenuAberto && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-40 p-1.5 text-xs">
                {[
                  { id: "executivo", title: "Resumo Executivo + Diagnósticos", desc: "KPIs, score de saúde, alertas e categorias" },
                  { id: "transacoes", title: "Extrato de Transações", desc: "Lançamentos filtrados pelo período" },
                  { id: "orcamentos", title: "Orçamentos do Mês", desc: "Limites, realizado e status por categoria" },
                  { id: "patrimonio_dividas", title: "Patrimônio & Dívidas", desc: "Ativos, liquidez, passivos e juros" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => baixarArquivo("csv", opt.id)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <p className="font-bold text-slate-800 dark:text-slate-100">{opt.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{opt.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => baixarArquivo("pdf")}
            disabled={Boolean(exportando) || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-extrabold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download size={15} />
            {exportando === "pdf" ? "Gerando PDF..." : "Baixar PDF Executivo"}
          </button>
        </div>
      </div>

      {/* Filtros de Período e Opções */}
      <div data-tour="relatorios-filtros" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Calendar size={14} className="text-emerald-600 dark:text-lime-spark" />
            Período do relatório
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "mes_atual", label: "Mês atual" },
              { id: "mes_anterior", label: "Mês anterior" },
              { id: "ultimos_90", label: "Últimos 90 dias" },
              { id: "ano_atual", label: "Ano atual" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => aplicarPreset(p.id)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Data inicial
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Data final
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <label className="inline-flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none py-2">
            <input
              type="checkbox"
              checked={incluirTransacoes}
              onChange={(e) => setIncluirTransacoes(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 dark:accent-lime-spark rounded"
            />
            <span>Incluir extrato detalhado no PDF</span>
          </label>
        </div>
      </div>

      {/* KPIs do Período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Receitas do período</span>
            <TrendingUp size={15} className="text-emerald-600 dark:text-lime-spark" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-lime-spark mt-1">
            {formatCurrency(resumo.receitas || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{resumo.qtd_receitas || 0} lançamento(s)</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Despesas do período</span>
            <TrendingDown size={15} className="text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(resumo.despesas || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{resumo.qtd_despesas || 0} lançamento(s)</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Resultado líquido</span>
          <p
            className={`text-2xl font-extrabold mt-1 ${
              (resumo.economia || 0) >= 0
                ? "text-slate-900 dark:text-white"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(resumo.economia || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Taxa de economia: {resumo.taxa_economia_pct ?? 0}% · Pat. líquido: {formatCurrency(ind.patrimonio_liquido || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Saúde Financeira</span>
            <Activity size={15} className="text-emerald-600 dark:text-lime-spark" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {saude.score ?? 0} <span className="text-sm font-semibold text-slate-400">/ 100</span>
          </p>
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-lime-spark mt-1">
            {saude.classificacao || "Calculando..."}
          </p>
        </div>
      </div>

      {/* Categorias + Diagnósticos / Otimização */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Despesas por Categoria */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Maiores Categorias de Despesa
            </h2>
            <span className="text-xs text-slate-400">
              {formatDate(dataInicio)} – {formatDate(dataFim)}
            </span>
          </div>

          {cats.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              Nenhuma despesa registrada no período selecionado.
            </p>
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cats} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="categoria_nome"
                      type="category"
                      width={110}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <RechartsTooltip
                      formatter={(v) => formatCurrency(v)}
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="total" name="Total" radius={[0, 6, 6, 0]}>
                      {cats.map((entry, idx) => (
                        <Cell key={idx} fill={entry.categoria_cor || "#10b981"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                {cats.map((c) => (
                  <div key={c.categoria_nome} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 min-w-0 truncate text-slate-700 dark:text-slate-200">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.categoria_cor || "#10b981" }}
                      />
                      <span className="truncate">{c.categoria_nome}</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0">
                      {formatCurrency(c.total)}{" "}
                      <span className="text-slate-400 font-normal">({c.percentual}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Achados Inteligentes & Otimização */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600 dark:text-lime-spark" />
              Diagnósticos & Otimização no Relatório
            </h2>
            <Link
              to="/otimizacao"
              className="text-xs font-semibold text-emerald-700 dark:text-lime-spark inline-flex items-center gap-1 hover:underline"
            >
              Ver plano <ArrowRight size={13} />
            </Link>
          </div>

          {report?.otimizacao?.economia_total_potencial_mensal > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-lime-spark/10 border border-emerald-200 dark:border-lime-spark/25 text-xs text-emerald-900 dark:text-lime-spark">
              <strong>Economia potencial identificada:</strong>{" "}
              {formatCurrency(report.otimizacao.economia_total_potencial_mensal)}/mês (
              {formatCurrency(report.otimizacao.economia_total_potencial_anual || 0)}/ano)
            </div>
          )}

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {diags.slice(0, 5).map((d, idx) => {
              const cfg = SEVERIDADE_CFG[d.severidade] || SEVERIDADE_CFG.informativa;
              const Icon = cfg.Icon;
              return (
                <div key={idx} className={`p-3 rounded-xl border text-xs space-y-1 ${cfg.cls}`}>
                  <div className="font-bold flex items-center gap-1.5">
                    <Icon size={13} className="shrink-0" />
                    <span>{d.titulo}</span>
                  </div>
                  <p className="opacity-90">{d.descricao}</p>
                </div>
              );
            })}

            {opps.slice(0, 3).map((op, idx) => (
              <div
                key={`op-${idx}`}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-slate-900 dark:text-white">{op.titulo}</strong>
                  <span className="font-bold text-emerald-700 dark:text-lime-spark shrink-0">
                    +{formatCurrency(op.economia_mensal_sugerida)}/mês
                  </span>
                </div>
                {op.descricao && (
                  <p className="text-slate-600 dark:text-slate-400">{op.descricao}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prévia do Extrato do Período */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Pré-visualização do Extrato ({txs.length} lançamento{txs.length === 1 ? "" : "s"})
          </h2>
          <button
            type="button"
            onClick={() => baixarArquivo("csv", "transacoes")}
            disabled={Boolean(exportando)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-lime-spark hover:underline cursor-pointer"
          >
            <FileSpreadsheet size={14} /> Baixar extrato completo em CSV
          </button>
        </div>

        {txs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
            Sem lançamentos no período escolhido.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Data</th>
                  <th className="py-2 pr-3 font-semibold">Descrição</th>
                  <th className="py-2 pr-3 font-semibold">Categoria</th>
                  <th className="py-2 pr-3 font-semibold">Cartão</th>
                  <th className="py-2 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {txs.slice(0, 25).map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {formatDate(t.data)}
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-100">
                      {t.descricao}
                    </td>
                    <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">
                      {t.tipo === "receita" ? "Receita" : t.categoria_nome}
                    </td>
                    <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">
                      {t.cartao_nome || (t.cartao_excluido_nome ? `Excluído (${t.cartao_excluido_nome})` : "—")}
                    </td>
                    <td
                      className={`py-2 text-right font-bold whitespace-nowrap ${
                        t.tipo === "receita"
                          ? "text-emerald-600 dark:text-lime-spark"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {t.tipo === "receita" ? "+" : "-"} {formatCurrency(t.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {txs.length > 25 && (
              <p className="text-xs text-slate-400 mt-2">
                Mostrando os 25 lançamentos mais recentes. Os {txs.length} registros completos são incluídos nas exportações CSV e PDF (até 150 linhas no PDF).
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
