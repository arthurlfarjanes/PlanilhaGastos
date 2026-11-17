import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  RefreshCw,
  Repeat,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import { formatCurrency, formatDate, todayInTimezone } from "../utils/formatters";

const SEVERITY_META = {
  critica: {
    label: "Crítico",
    icon: AlertOctagon,
    badge: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30",
    border: "border-red-200/80 dark:border-red-500/30",
  },
  atencao: {
    label: "Atenção",
    icon: AlertTriangle,
    badge: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
    border: "border-amber-200/80 dark:border-amber-500/30",
  },
  informativa: {
    label: "Informativo",
    icon: Info,
    badge: "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30",
    border: "border-slate-200/80 dark:border-slate-800",
  },
  positiva: {
    label: "Ponto Forte",
    icon: CheckCircle2,
    badge: "bg-emerald-50 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark border-emerald-200 dark:border-lime-spark/30",
    border: "border-emerald-200/80 dark:border-lime-spark/25",
  },
};

const SCORE_STATUS = {
  saudavel: {
    label: "Saúde Financeira Forte",
    textCls: "text-emerald-600 dark:text-lime-spark",
    barCls: "bg-emerald-500 dark:bg-lime-spark",
    pillCls: "bg-emerald-50 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark border-emerald-200 dark:border-lime-spark/30",
  },
  atencao: {
    label: "Em Atenção",
    textCls: "text-amber-600 dark:text-amber-400",
    barCls: "bg-amber-500",
    pillCls: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  },
  critico: {
    label: "Risco Financeiro Elevado",
    textCls: "text-red-600 dark:text-red-400",
    barCls: "bg-red-500",
    pillCls: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30",
  },
};

export default function Diagnosticos() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";

  const [refDate, setRefDate] = useState(() => todayInTimezone(timezone));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroSev, setFiltroSev] = useState("todas");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/inteligencia/diagnosticos?refDate=${encodeURIComponent(refDate)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error("Não foi possível carregar os diagnósticos.");
      setData(await res.json());
    } catch (err) {
      toast.error(err.message || "Falha ao calcular diagnósticos.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, refDate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const achadosFiltrados = useMemo(() => {
    const lista = data?.diagnosticos || [];
    if (filtroSev === "todas") return lista;
    return lista.filter((d) => d.severidade === filtroSev);
  }, [data, filtroSev]);

  const saude = data?.saude_financeira;
  const scoreMeta = SCORE_STATUS[saude?.classificacao] || SCORE_STATUS.atencao;
  const pilares = saude?.pilares || [];
  const anomalias = data?.anomalias_categorias || [];
  const recorrencias = data?.recorrencias_nao_cadastradas || [];

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark">
              <Activity className="w-5 h-5" />
            </span>
            Diagnósticos Financeiros
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Leitura determinística da sua saúde financeira, desvios por categoria e possíveis recorrências ocultas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            type="date"
            value={refDate}
            onChange={(e) => e.target.value && setRefDate(e.target.value)}
            aria-label="Data de referência do diagnóstico"
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          />
          <button
            type="button"
            onClick={carregar}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
          <Link
            to="/assistente"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-bold"
          >
            Conversar com o Teco <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Calculando indicadores e diagnósticos da sua conta...
        </div>
      ) : (
        <>
          {/* Score Geral + 6 Pilares */}
          <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
            <div data-tour="diagnosticos-score" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Score de Saúde Financeira
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${scoreMeta.pillCls}`}>
                    {scoreMeta.label}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-black tracking-tight ${scoreMeta.textCls}`}>
                    {saude?.score ?? 0}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">/ 100 pontos</span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${scoreMeta.barCls}`}
                    style={{ width: `${Math.min(100, Math.max(0, saude?.score ?? 0))}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Reserva imediata estimada</span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {saude?.meses_reserva_estimados ?? 0} mês(es)
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Taxa de economia do mês</span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {data?.indicadores?.taxa_economia_percentual !== null &&
                    data?.indicadores?.taxa_economia_percentual !== undefined
                      ? `${data.indicadores.taxa_economia_percentual}%`
                      : "Sem receitas"}
                  </strong>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                  <ShieldCheck size={14} className="text-emerald-500 dark:text-lime-spark shrink-0" />
                  Cálculo 100% determinístico sobre seus registros reais.
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Composição do Score (6 Pilares)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pilares.map((p) => {
                  const pct = p.max_pontos > 0 ? Math.round((p.pontos * 100) / p.max_pontos) : 0;
                  const barColor =
                    p.status === "bom"
                      ? "bg-emerald-500 dark:bg-lime-spark"
                      : p.status === "atencao"
                        ? "bg-amber-500"
                        : "bg-red-500";
                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <strong className="text-slate-800 dark:text-slate-100">{p.nome}</strong>
                        <span className="font-bold text-slate-600 dark:text-slate-300 shrink-0">
                          {p.pontos}/{p.max_pontos}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.resumo}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Lista de Diagnósticos Priorizados */}
          <div data-tour="diagnosticos-alertas" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Achados &amp; Diagnósticos Priorizados ({achadosFiltrados.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ordenados por criticidade para orientar suas próximas decisões financeiras.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "todas", label: "Todos" },
                  { id: "critica", label: "Críticos" },
                  { id: "atencao", label: "Atenção" },
                  { id: "informativa", label: "Informativos" },
                  { id: "positiva", label: "Pontos Fortes" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFiltroSev(opt.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      filtroSev === opt.id
                        ? "bg-emerald-600 dark:bg-lime-spark text-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {achadosFiltrados.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                Nenhum diagnóstico encontrado para este filtro.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {achadosFiltrados.map((item) => {
                  const meta = SEVERITY_META[item.severidade] || SEVERITY_META.informativa;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between gap-3 ${meta.border}`}
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.badge}`}>
                            <Icon size={12} />
                            {meta.label} · {item.area}
                          </span>
                          {item.impacto_valor > 0 && (
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {formatCurrency(item.impacto_valor)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.titulo}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.descricao}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.acao_sugerida}
                        </span>
                        {item.rota_acao && (
                          <Link
                            to={item.rota_acao}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-lime-spark hover:underline shrink-0"
                          >
                            Abrir <ArrowRight size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Anomalias por Categoria + Recorrências Detectadas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Mês Atual vs. Média dos Últimos 3 Meses
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detecta desvios relevantes (&ge; +30% e &ge; R$ 50) em relação ao seu padrão recente.
                </p>
              </div>

              {anomalias.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                  Sem despesas registradas para comparar por categoria neste período.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {anomalias.map((cat) => (
                    <div
                      key={`${cat.categoria_id || "none"}-${cat.categoria_nome}`}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.categoria_cor || "#64748b" }}
                          />
                          <strong className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                            {cat.categoria_nome}
                          </strong>
                          {cat.status === "acima_da_media" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 shrink-0">
                              <TrendingUp size={10} /> +{cat.variacao_percentual}%
                            </span>
                          )}
                          {cat.status === "abaixo_da_media" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark border border-emerald-200 dark:border-lime-spark/30 shrink-0">
                              <TrendingDown size={10} /> {cat.variacao_percentual}%
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Média 3 meses: {formatCurrency(cat.media_3_meses)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(cat.gasto_atual)}
                        </p>
                        <p className="text-[11px] text-slate-400">neste mês</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Repeat size={16} className="text-emerald-600 dark:text-lime-spark" />
                    Possíveis Recorrências Não Cadastradas
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Despesas repetidas com valor similar nos últimos meses que ainda não estão em Transações Fixas.
                  </p>
                </div>
                <Link
                  to="/gastos-fixos"
                  className="text-xs font-bold text-emerald-700 dark:text-lime-spark hover:underline shrink-0"
                >
                  Gerenciar fixas
                </Link>
              </div>

              {recorrencias.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Nenhuma despesa repetida fora de Transações Fixas foi detectada nos últimos 3 meses.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recorrencias.map((r) => (
                    <div
                      key={`${r.descricao}-${r.ultima_data}`}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {r.descricao}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {r.ocorrencias}x em {r.meses_encontrados} mês(es) · Último: {formatDate(r.ultima_data)}
                        </p>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 shrink-0">
                        ~{formatCurrency(r.valor_medio)}/mês
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
