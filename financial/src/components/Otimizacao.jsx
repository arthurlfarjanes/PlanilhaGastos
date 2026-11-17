import React, { useState, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Flame,
  PiggyBank,
  RefreshCw,
  Scissors,
  ShieldAlert,
  SlidersHorizontal,
  Snowflake,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import { CurrencyInput } from "./CurrencyInput";
import { formatCurrency, todayInTimezone } from "../utils/formatters";

const NIVEL_BADGE = {
  urgente: {
    label: "Prioridade Máxima",
    cls: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30",
  },
  alta_rentabilidade: {
    label: "Maior Retorno Líquido",
    cls: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  },
  seguranca: {
    label: "Segurança",
    cls: "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30",
  },
  consolidacao: {
    label: "Consolidação",
    cls: "bg-emerald-50 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark border-emerald-200 dark:border-lime-spark/30",
  },
  crescimento: {
    label: "Aceleração de Metas",
    cls: "bg-emerald-50 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark border-emerald-200 dark:border-lime-spark/30",
  },
};

export default function Otimizacao() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulando, setSimulando] = useState(false);

  const [aporteInput, setAporteInput] = useState("");
  const [estrategia, setEstrategia] = useState("avalanche");

  const carregarInicial = useCallback(async () => {
    setLoading(true);
    try {
      const refDate = todayInTimezone(timezone);
      const res = await fetch(
        `${API_URL}/inteligencia/otimizacao?refDate=${encodeURIComponent(refDate)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error("Não foi possível carregar o plano de otimização.");
      const json = await res.json();
      setData(json);
      setAporteInput(String(json.parametros?.aporte_mensal_simulado ?? 0));
      setEstrategia(json.parametros?.estrategia_divida || "avalanche");
    } catch (err) {
      toast.error(err.message || "Falha ao calcular otimização.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, timezone]);

  useEffect(() => {
    carregarInicial();
  }, [carregarInicial]);

  const handleSimular = async (e, nextStrategy = estrategia) => {
    if (e) e.preventDefault();
    setSimulando(true);
    try {
      const res = await fetch(`${API_URL}/inteligencia/otimizacao/simular`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          refDate: todayInTimezone(timezone),
          aporteMensal: aporteInput === "" ? 0 : Number(aporteInput),
          estrategiaDivida: nextStrategy,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Falha na simulação.");
      setData(json);
    } catch (err) {
      toast.error(err.message || "Erro ao simular alocação.");
    } finally {
      setSimulando(false);
    }
  };

  const params = data?.parametros || {};
  const resumo = data?.resumo || {};
  const passos = data?.plano_alocacao || [];
  const compDiv = data?.comparativo_dividas || {};
  const cortes = data?.oportunidades_corte || [];

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            Otimização Financeira
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Descubra onde cada real disponível gera maior ganho líquido entre quitação de dívidas, reserva e objetivos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={carregarInicial}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
          <Link
            to="/assistente"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-bold"
          >
            Pedir análise ao Teco <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Painel Simulador Interativo */}
      <form
        data-tour="otimizacao-simulador"
        onSubmit={(e) => handleSimular(e)}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end"
      >
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Valor mensal disponível para otimizar (sobra ou aporte extra)
          </label>
          <CurrencyInput
            value={aporteInput}
            onValueChange={(val) => setAporteInput(val)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Estratégia preferida para dívidas
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setEstrategia("avalanche");
                handleSimular(null, "avalanche");
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                estrategia === "avalanche"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-lime-spark shadow-xs"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Flame size={13} /> Avalanche
            </button>
            <button
              type="button"
              onClick={() => {
                setEstrategia("bola_de_neve");
                handleSimular(null, "bola_de_neve");
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                estrategia === "bola_de_neve"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-lime-spark shadow-xs"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Snowflake size={13} /> Bola de Neve
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={simulando}
          className="px-5 py-2.5 h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          {simulando ? "Calculando..." : "Simular Alocação"}
        </button>
      </form>

      {loading && !data ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Calculando melhor alocação financeira...
        </div>
      ) : (
        <>
          {/* 4 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Aporte Mensal Simulado
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(params.aporte_mensal_simulado || 0)}
              </p>
              <span className="text-[11px] text-slate-400">
                Excedente atual do mês: {formatCurrency(params.excedente_atual_mes || 0)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Economia Desbloqueável
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-lime-spark mt-1">
                {formatCurrency(resumo.economia_desbloqueavel_mensal || 0)}/mês
              </p>
              <span className="text-[11px] text-slate-400">
                ~{formatCurrency(resumo.economia_desbloqueavel_anual || 0)}/ano em ajustes
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Juros Economizáveis (Dívida Foco)
              </span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(resumo.juros_economizaveis_divida_foco || 0)}
              </p>
              <span className="text-[11px] text-slate-400">
                {resumo.meses_economizados_divida_foco > 0
                  ? `${resumo.meses_economizados_divida_foco} mês(es) antecipados`
                  : compDiv.possui_dividas
                    ? "Simule um valor > 0 acima"
                    : "Sem dívidas ativas"}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Reserva 3 Meses
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {resumo.falta_reserva_3_meses === 0
                  ? "Atingida!"
                  : resumo.meses_para_reserva_3_meses !== null
                    ? `${resumo.meses_para_reserva_3_meses} mês(es)`
                    : "—"}
              </p>
              <span className="text-[11px] text-slate-400">
                {resumo.falta_reserva_3_meses === 0
                  ? "Liquidez imediata >= 3 meses"
                  : `Faltam ${formatCurrency(resumo.falta_reserva_3_meses || 0)}`}
              </span>
            </div>
          </div>

          {/* Plano Priorizado */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600 dark:text-lime-spark" />
                Plano Priorizado de Alocação
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sequência matemática recomendada comparando custo efetivo das dívidas vs. rendimento médio estimado do patrimônio (~{params.taxa_media_patrimonio_mensal_pct || 0}% a.m.).
              </p>
            </div>

            {passos.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                Suas obrigações estão em dia e sua reserva básica já está coberta. Cadastre novos objetivos em Planejamento para simular aceleração!
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {passos.map((p) => {
                  const badge = NIVEL_BADGE[p.nivel] || NIVEL_BADGE.consolidacao;
                  return (
                    <div
                      key={`${p.ordem}-${p.titulo}`}
                      className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}>
                            Passo {p.ordem} · {badge.label}
                          </span>
                          {p.valor_sugerido_mensal > 0 && (
                            <strong className="text-sm text-emerald-700 dark:text-lime-spark">
                              {formatCurrency(p.valor_sugerido_mensal)}/mês
                            </strong>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {p.titulo}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {p.motivo}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {p.ganho_estimado}
                        </span>
                        {p.rota_acao && (
                          <Link
                            to={p.rota_acao}
                            className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-lime-spark hover:underline shrink-0"
                          >
                            Executar <ArrowRight size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comparativo Avalanche vs Bola de Neve + Oportunidades de Corte */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <PiggyBank size={16} className="text-emerald-600 dark:text-lime-spark" />
                  Avalanche vs. Bola de Neve (Dívidas Ativas)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comparação com o aporte simulado de {formatCurrency(params.aporte_mensal_simulado || 0)}/mês.
                </p>
              </div>

              {!compDiv.possui_dividas ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Você não possui dívidas ativas com saldo devedor no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { key: "avalanche", titulo: "Avalanche (Menor custo total)", icon: Flame, data: compDiv.avalanche_alvo },
                    { key: "bola_de_neve", titulo: "Bola de Neve (Quitação rápida)", icon: Snowflake, data: compDiv.bola_de_neve_alvo },
                  ].map((estr) => {
                    const Icon = estr.icon;
                    const alvo = estr.data;
                    if (!alvo) return null;
                    const ativo = estrategia === estr.key;
                    return (
                      <div
                        key={estr.key}
                        className={`p-4 rounded-xl border ${
                          ativo
                            ? "border-emerald-400 dark:border-lime-spark/60 bg-emerald-50/40 dark:bg-lime-spark/5"
                            : "border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
                            <Icon size={14} className="text-emerald-600 dark:text-lime-spark" />
                            {estr.titulo}
                          </strong>
                          {ativo && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-lime-spark/20 text-emerald-700 dark:text-lime-spark">
                              Selecionada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 mt-1.5">
                          Alvo: <strong>{alvo.nome}</strong> ({alvo.taxa_juros_mensal}% a.m. · saldo{" "}
                          {formatCurrency(alvo.saldo_devedor)})
                        </p>
                        {alvo.simulacao && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Economia estimada:{" "}
                            <strong className="text-emerald-700 dark:text-lime-spark">
                              {formatCurrency(alvo.simulacao.economia?.juros_economizados || 0)}
                            </strong>{" "}
                            e{" "}
                            <strong>{alvo.simulacao.economia?.meses_economizados || 0} mês(es)</strong> a menos.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div data-tour="otimizacao-sugestoes" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Scissors size={16} className="text-emerald-600 dark:text-lime-spark" />
                  Radar de Oportunidades de Economia
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Orçamentos estourados, picos de gasto e assinaturas com maior impacto anual.
                </p>
              </div>

              {cortes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                  <ShieldAlert size={20} className="text-emerald-500 dark:text-lime-spark" />
                  <span>Nenhuma oportunidade óbvia de corte detectada no momento.</span>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {cortes.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {c.titulo}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {c.descricao}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-emerald-700 dark:text-lime-spark">
                          +{formatCurrency(c.economia_mensal)}/mês
                        </p>
                        <Link
                          to={c.rota_acao}
                          className="text-[11px] text-slate-400 hover:text-emerald-600 dark:hover:text-lime-spark underline"
                        >
                          {formatCurrency(c.economia_anual)}/ano
                        </Link>
                      </div>
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
