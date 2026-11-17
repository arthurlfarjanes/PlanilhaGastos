import React, { useState, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Info,
  LineChart as LineChartIcon,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import toast from "react-hot-toast";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import { CurrencyInput } from "./CurrencyInput";
import { formatCurrency, todayInTimezone } from "../utils/formatters";

const HORIZONTES = [6, 12, 24, 36, 60];

export default function Projecoes() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulando, setSimulando] = useState(false);
  const [modoGrafico, setModoGrafico] = useState("patrimonio"); // "patrimonio" | "fluxo"

  // Premissas editáveis no simulador
  const [horizonte, setHorizonte] = useState(12);
  const [receitaBase, setReceitaBase] = useState("");
  const [despesaBase, setDespesaBase] = useState("");
  const [varRenda, setVarRenda] = useState(0);
  const [varDespesa, setVarDespesa] = useState(0);
  const [aporteExtra, setAporteExtra] = useState("0");
  const [taxaRend, setTaxaRend] = useState("10.5");
  const [inflacao, setInflacao] = useState("4.5");
  const [eventoTipo, setEventoTipo] = useState("receita");
  const [eventoMes, setEventoMes] = useState(3);
  const [eventoValor, setEventoValor] = useState("");
  const [eventoDesc, setEventoDesc] = useState("");

  const carregarBase = useCallback(
    async (nextH = 12) => {
      setLoading(true);
      try {
        const refDate = todayInTimezone(timezone);
        const res = await fetch(
          `${API_URL}/planejamento/projecoes?horizonte=${nextH}&refDate=${encodeURIComponent(refDate)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        if (!res.ok) throw new Error("Não foi possível carregar as projeções.");
        const json = await res.json();
        setData(json);
        const p = json.premissas || {};
        setHorizonte(p.horizonte_meses || nextH);
        setReceitaBase(String(p.receita_mensal_base ?? 0));
        setDespesaBase(String(p.despesa_mensal_base ?? 0));
        setTaxaRend(String(p.taxa_rendimento_anual_pct ?? 10.5));
        setVarRenda(0);
        setVarDespesa(0);
        setAporteExtra("0");
        setInflacao("0");
        setEventoValor("");
        setEventoDesc("");
      } catch (err) {
        toast.error(err.message || "Falha ao calcular projeções.");
      } finally {
        setLoading(false);
      }
    },
    [API_URL, token, timezone],
  );

  useEffect(() => {
    carregarBase(12);
  }, [carregarBase]);

  const executarSimulacao = async (overrides = {}) => {
    setSimulando(true);
    const payload = {
      refDate: todayInTimezone(timezone),
      horizonte_meses: overrides.horizonte ?? horizonte,
      receita_mensal_base:
        overrides.receitaBase !== undefined
          ? Number(overrides.receitaBase)
          : receitaBase === ""
            ? 0
            : Number(receitaBase),
      despesa_mensal_base:
        overrides.despesaBase !== undefined
          ? Number(overrides.despesaBase)
          : despesaBase === ""
            ? 0
            : Number(despesaBase),
      variacao_renda_pct:
        overrides.varRenda !== undefined ? Number(overrides.varRenda) : Number(varRenda || 0),
      variacao_despesa_pct:
        overrides.varDespesa !== undefined ? Number(overrides.varDespesa) : Number(varDespesa || 0),
      aporte_mensal_extra:
        overrides.aporteExtra !== undefined
          ? Number(overrides.aporteExtra)
          : aporteExtra === ""
            ? 0
            : Number(aporteExtra),
      taxa_rendimento_anual_pct:
        overrides.taxaRend !== undefined ? Number(overrides.taxaRend) : Number(taxaRend || 0),
      inflacao_anual_pct:
        overrides.inflacao !== undefined ? Number(overrides.inflacao) : Number(inflacao || 0),
    };

    const evtVal =
      overrides.eventoValor !== undefined ? Number(overrides.eventoValor) : Number(eventoValor || 0);
    if (evtVal > 0) {
      payload.evento_unico = {
        mes: Number(overrides.eventoMes ?? eventoMes) || 1,
        tipo: overrides.eventoTipo ?? eventoTipo,
        valor: evtVal,
        descricao: eventoDesc.trim() || "Evento pontual",
      };
    }

    try {
      const res = await fetch(`${API_URL}/planejamento/simular`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Falha ao simular cenário.");
      setData(json);
    } catch (err) {
      toast.error(err.message || "Erro na simulação.");
    } finally {
      setSimulando(false);
    }
  };

  const aplicarPreset = (preset) => {
    if (preset === "corte15") {
      setVarDespesa(-15);
      setVarRenda(0);
      setAporteExtra("0");
      executarSimulacao({ varDespesa: -15, varRenda: 0, aporteExtra: 0 });
    } else if (preset === "aporte500") {
      setVarDespesa(0);
      setVarRenda(0);
      setAporteExtra("500");
      executarSimulacao({ varDespesa: 0, varRenda: 0, aporteExtra: 500 });
    } else if (preset === "queda20") {
      setVarRenda(-20);
      setVarDespesa(0);
      setAporteExtra("0");
      executarSimulacao({ varRenda: -20, varDespesa: 0, aporteExtra: 0 });
    } else if (preset === "inflacao") {
      setInflacao("4.5");
      executarSimulacao({ inflacao: 4.5 });
    }
  };

  const resumoBase = data?.resumo_comparativo?.base || {};
  const resumoSim = data?.resumo_comparativo?.simulado || {};
  const difPL = data?.resumo_comparativo?.diferenca_patrimonio_final || 0;
  const serie = data?.comparativo_mensal || [];
  const objetivos = data?.previsao_objetivos || [];
  const premissas = data?.premissas || {};

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark">
              <LineChartIcon className="w-5 h-5" />
            </span>
            Projeções &amp; Simulador de Cenários
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Projete caixa, dívidas e patrimônio líquido nos próximos meses com premissas explícitas e cenários &ldquo;E se...&rdquo;.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => carregarBase(horizonte)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw size={13} /> Restaurar Base Real
          </button>
          <Link
            to="/assistente"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-bold"
          >
            Perguntar ao Teco <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Presets Rápidos + Formulário de Premissas */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executarSimulacao();
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-600 dark:text-lime-spark" />
            Premissas Explícitas da Simulação
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "corte15", label: "-15% Despesas" },
              { id: "aporte500", label: "+R$ 500/mês" },
              { id: "queda20", label: "-20% Renda" },
              { id: "inflacao", label: "Com Inflação 4,5%" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => aplicarPreset(p.id)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-lime-spark/15 hover:text-emerald-700 dark:hover:text-lime-spark border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Horizonte
            </label>
            <select
              value={horizonte}
              onChange={(e) => {
                const next = Number(e.target.value);
                setHorizonte(next);
                executarSimulacao({ horizonte: next });
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-100"
            >
              {HORIZONTES.map((m) => (
                <option key={m} value={m}>
                  {m} meses ({m >= 12 ? `${m / 12} ano(s)` : `${m}m`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Receita Mensal Base
            </label>
            <CurrencyInput
              value={receitaBase}
              onValueChange={setReceitaBase}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Despesa Mensal Base (sem parcelas futuras)
            </label>
            <CurrencyInput
              value={despesaBase}
              onValueChange={setDespesaBase}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Aporte Extra Mensal
            </label>
            <CurrencyInput
              value={aporteExtra}
              onValueChange={setAporteExtra}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Variação na Renda (%)
            </label>
            <input
              type="number"
              min={-90}
              max={300}
              step="1"
              value={varRenda}
              onChange={(e) => setVarRenda(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Variação nas Despesas (%)
            </label>
            <input
              type="number"
              min={-90}
              max={300}
              step="1"
              value={varDespesa}
              onChange={(e) => setVarDespesa(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Rendimento Estimado (% a.a.)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              step="0.5"
              value={taxaRend}
              onChange={(e) => setTaxaRend(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Inflação Estimada (% a.a.)
            </label>
            <input
              type="number"
              min={0}
              max={30}
              step="0.5"
              value={inflacao}
              onChange={(e) => setInflacao(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Evento Pontual Opcional + Submit */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-[140px_100px_1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Evento Único
            </label>
            <select
              value={eventoTipo}
              onChange={(e) => setEventoTipo(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
            >
              <option value="receita">+ Entrada extra</option>
              <option value="despesa">- Gasto único</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              No mês (1..{horizonte})
            </label>
            <input
              type="number"
              min={1}
              max={horizonte}
              value={eventoMes}
              onChange={(e) => setEventoMes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Valor do evento (opcional)
            </label>
            <CurrencyInput
              value={eventoValor}
              onValueChange={setEventoValor}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Descrição do evento
            </label>
            <input
              type="text"
              maxLength={80}
              value={eventoDesc}
              onChange={(e) => setEventoDesc(e.target.value)}
              placeholder="Ex: 13º, IPVA, Viagem..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={simulando}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={simulando ? "animate-spin" : ""} />
            {simulando ? "Simulando..." : "Simular Cenário"}
          </button>
        </div>

        {premissas.origem_base && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <Info size={13} className="text-emerald-600 dark:text-lime-spark shrink-0" />
            <span>
              <strong>Base automática:</strong> {premissas.origem_base}.{" "}
              <strong>Taxa:</strong> {premissas.origem_taxa_rendimento}.
            </span>
          </div>
        )}
      </form>

      {loading && !data ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Gerando projeções determinísticas...
        </div>
      ) : (
        <>
          {resumoSim.primeiro_mes_deficit && (
            <div className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 flex items-center gap-3 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Atenção: neste cenário, há previsão de fluxo mensal negativo a partir de{" "}
                <strong>{resumoSim.primeiro_mes_deficit}</strong>.
              </span>
            </div>
          )}

          {/* 4 KPIs Comparativos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Patrimônio Líquido em {horizonte}m (Simulado)
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-lime-spark mt-1">
                {formatCurrency(resumoSim.patrimonio_liquido_final_nominal || 0)}
              </p>
              <span className="text-[11px] text-slate-400">
                Real (deflacionado): {formatCurrency(resumoSim.patrimonio_liquido_final_real || 0)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Diferença vs. Cenário Base
              </span>
              <p
                className={`text-2xl font-black mt-1 ${
                  difPL >= 0
                    ? "text-emerald-600 dark:text-lime-spark"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {difPL >= 0 ? "+" : ""}
                {formatCurrency(difPL)}
              </p>
              <span className="text-[11px] text-slate-400">
                Base: {formatCurrency(resumoBase.patrimonio_liquido_final_nominal || 0)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Fluxo Líquido Mensal Médio
              </span>
              <p
                className={`text-2xl font-black mt-1 ${
                  (resumoSim.fluxo_mensal_medio || 0) >= 0
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {formatCurrency(resumoSim.fluxo_mensal_medio || 0)}
              </p>
              <span className="text-[11px] text-slate-400">
                Base atual: {formatCurrency(resumoBase.fluxo_mensal_medio || 0)}/mês
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Dívidas no Fim do Horizonte
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(resumoSim.dividas_finais || 0)}
              </p>
              <span className="text-[11px] text-slate-400">
                {resumoSim.dividas_quitadas_no_horizonte || 0} dívida(s) quitada(s) no período
              </span>
            </div>
          </div>

          {/* Gráfico Principal */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-600 dark:text-lime-spark" />
                  {modoGrafico === "patrimonio"
                    ? "Trajetória do Patrimônio Líquido (Base vs. Simulado)"
                    : "Fluxo Mensal Projetado (Receitas vs. Despesas)"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inclui parcelas futuras já lançadas no extrato e amortização cronológica de dívidas ativas.
                </p>
              </div>
              <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start">
                <button
                  type="button"
                  onClick={() => setModoGrafico("patrimonio")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    modoGrafico === "patrimonio"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-lime-spark shadow-xs"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Patrimônio
                </button>
                <button
                  type="button"
                  onClick={() => setModoGrafico("fluxo")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    modoGrafico === "fluxo"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-lime-spark shadow-xs"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Fluxo Mensal
                </button>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {modoGrafico === "patrimonio" ? (
                  <AreaChart data={serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#33415533" vertical={false} />
                    <XAxis dataKey="competencia" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(v) => formatCurrency(v)}
                      width={92}
                    />
                    <RechartsTooltip
                      formatter={(val) => formatCurrency(val)}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #334155",
                        backgroundColor: "#0f172a",
                        color: "#f8fafc",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="pl_base_nominal"
                      name="Base (Nominal)"
                      stroke="#64748b"
                      fill="#64748b22"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="pl_simulado_nominal"
                      name="Simulado (Nominal)"
                      stroke="#10b981"
                      fill="#10b98133"
                      strokeWidth={2.5}
                    />
                    {Number(inflacao || 0) > 0 && (
                      <Area
                        type="monotone"
                        dataKey="pl_simulado_real"
                        name="Simulado (Poder de Compra Real)"
                        stroke="#a3e635"
                        fill="#a3e63518"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                      />
                    )}
                  </AreaChart>
                ) : (
                  <BarChart data={serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#33415533" vertical={false} />
                    <XAxis dataKey="competencia" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(v) => formatCurrency(v)}
                      width={92}
                    />
                    <RechartsTooltip
                      formatter={(val) => formatCurrency(val)}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #334155",
                        backgroundColor: "#0f172a",
                        color: "#f8fafc",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="receita_simulada" name="Receitas (Simulado)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesa_simulada" name="Despesas (Simulado)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Previsão de Objetivos + Tabela Mês a Mês */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Target size={16} className="text-emerald-600 dark:text-lime-spark" />
                  Impacto nos Objetivos Ativos
                </h2>
                <Link
                  to="/objetivos"
                  className="text-xs font-bold text-emerald-700 dark:text-lime-spark hover:underline"
                >
                  Ver objetivos
                </Link>
              </div>
              {objetivos.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                  Nenhum objetivo ativo com saldo pendente no momento.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {objetivos.map((o) => (
                    <div
                      key={o.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <strong className="text-sm text-slate-900 dark:text-slate-100 truncate block">
                          {o.nome}
                        </strong>
                        <span className="text-slate-500 dark:text-slate-400">
                          Faltam {formatCurrency(o.faltante)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {o.meses_simulado !== null ? `${o.meses_simulado} mês(es)` : "Sem aporte"}
                        </p>
                        {o.meses_ganhos !== null && o.meses_ganhos > 0 && (
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-lime-spark">
                            -{o.meses_ganhos} mês(es) vs. base
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Detalhamento Mês a Mês ({horizonte} meses)
              </h2>
              <div className="overflow-x-auto max-h-80 custom-scrollbar">
                <table className="min-w-full text-xs text-left">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-2 px-3 rounded-l-lg">Mês</th>
                      <th className="py-2 px-3">Receita</th>
                      <th className="py-2 px-3">Despesa</th>
                      <th className="py-2 px-3">Fluxo</th>
                      <th className="py-2 px-3">PL Simulado</th>
                      <th className="py-2 px-3 rounded-r-lg">PL Real</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {serie.map((row) => (
                      <tr key={row.competencia}>
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-200">
                          {row.competencia}
                        </td>
                        <td className="py-2 px-3 text-emerald-700 dark:text-lime-spark">
                          {formatCurrency(row.receita_simulada)}
                        </td>
                        <td className="py-2 px-3 text-red-600 dark:text-red-400">
                          {formatCurrency(row.despesa_simulada)}
                        </td>
                        <td
                          className={`py-2 px-3 font-semibold ${
                            row.fluxo_simulado >= 0
                              ? "text-emerald-700 dark:text-lime-spark"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatCurrency(row.fluxo_simulado)}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(row.pl_simulado_nominal)}
                        </td>
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                          {formatCurrency(row.pl_simulado_real)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
