import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Settings,
  Database,
  ArrowRight,
  RefreshCw,
  Cpu,
  Gauge,
  ChevronDown,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import ConfirmDialog from "./ui/ConfirmDialog";
import MarkdownMessage from "./ui/MarkdownMessage";
import { AppTooltip } from "@/components/ui/Tooltip";
import { todayInTimezone } from "../utils/formatters";

const PERGUNTAS_SUGERIDAS = [
  "Como está minha taxa de economia e meu comprometimento de renda este mês?",
  "Quais dívidas ou cartões merecem minha atenção agora?",
  "Onde estou gastando mais e como estão meus orçamentos?",
  "Estou no ritmo certo para atingir meus objetivos financeiros?",
];

export default function AssistenteIA() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs, updatePreferences } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";

  const [statusData, setStatusData] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [trocandoProvedor, setTrocandoProvedor] = useState(false);
  const [confirmLimpar, setConfirmLimpar] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // "limites" | "modelo" | null

  const fimChatRef = useRef(null);
  const dropdownContainerRef = useRef(null);
  const textareaRef = useRef(null);

  const authHeaders = useCallback(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token],
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [stRes, histRes] = await Promise.all([
        fetch(`${API_URL}/ia/status`, { headers: authHeaders(), cache: "no-store" }),
        fetch(`${API_URL}/ia/historico`, { headers: authHeaders(), cache: "no-store" }),
      ]);
      if (stRes.ok) setStatusData(await stRes.json());
      if (histRes.ok) {
        const hist = await histRes.json();
        setMensagens(Array.isArray(hist) ? hist : []);
      }
    } catch {
      toast.error("Não foi possível verificar o status do Teco.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, authHeaders]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    fimChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, enviando]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 136)}px`;
  }, [pergunta]);

  useEffect(() => {
    if (!openDropdown) return;
    const handleOutside = (e) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openDropdown]);

  const handleEnviar = async (textoDireto) => {
    const msg = String(textoDireto ?? pergunta).trim();
    if (!msg || enviando) return;

    if (!textoDireto) setPergunta("");
    const tempId = `tmp-${Date.now()}`;
    setMensagens((prev) => [...prev, { id: tempId, role: "user", content: msg, tools_used: [] }]);
    setEnviando(true);

    try {
      const res = await fetch(`${API_URL}/ia/chat`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          message: msg,
          refDate: todayInTimezone(timezone),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.usage || data.suggestedAlternativeProvider !== undefined) {
        setStatusData((prev) =>
          prev
            ? {
                ...prev,
                usage: data.usage || prev.usage,
                availableProviders: data.availableProviders || prev.availableProviders,
                suggestedAlternativeProvider:
                  data.suggestedAlternativeProvider !== undefined
                    ? data.suggestedAlternativeProvider
                    : prev.suggestedAlternativeProvider,
                operationalStatus:
                  data.code === "FREE_QUOTA_EXCEEDED"
                    ? "provider_quota_exhausted"
                    : prev.operationalStatus,
                statusMessage: data.error || prev.statusMessage,
              }
            : prev,
        );
      }

      if (!res.ok) {
        toast.error(data.error || "Não foi possível obter resposta do Teco.");
        setMensagens((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, erroLocal: data.error || "Falha na consulta" } : m,
          ),
        );
        carregar();
        return;
      }

      setMensagens((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          tools_used: data.toolsUsed || [],
          provider: data.provider,
          model: data.model,
        },
      ]);
    } catch {
      toast.error("Erro de conexão ao consultar o Teco.");
    } finally {
      setEnviando(false);
    }
  };

  const handleLimparHistorico = async () => {
    setLimpando(true);
    try {
      const res = await fetch(`${API_URL}/ia/historico`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Erro ao limpar histórico.");
      setMensagens([]);
      setConfirmLimpar(false);
      toast.success("Histórico de conversas limpo.");
    } catch (err) {
      toast.error(err.message || "Falha ao limpar histórico.");
    } finally {
      setLimpando(false);
    }
  };

  const handleTrocarProvedor = async (providerId, providerName) => {
    setTrocandoProvedor(true);
    setOpenDropdown(null);
    try {
      const ok = await updatePreferences({ ai: { preferredProvider: providerId } });
      if (!ok) throw new Error("Não foi possível alterar o provedor.");
      toast.success(`Provedor alterado para ${providerName}!`);
      await carregar();
    } catch (err) {
      toast.error(err.message || "Falha ao trocar provedor.");
    } finally {
      setTrocandoProvedor(false);
    }
  };

  const opStatus = statusData?.operationalStatus || "active";
  const podePerguntar = !loading && opStatus === "active";
  const appLimit = statusData?.usage?.applicationIndividualLimit;
  const provTier = statusData?.usage?.providerFreeTier;
  const altProvider = statusData?.suggestedAlternativeProvider;
  const allProviders = statusData?.availableProviders || [];
  const modelShort = provTier?.model ? provTier.model.split("/").pop() : "não configurado";

  return (
    <div className="w-full space-y-4">
      {/* Cabeçalho com destaque ao avatar do Teco */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <img
              src="/teco-avatar.jpg"
              alt="Teco"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-400/70 dark:border-lime-spark/70 shadow-md bg-slate-900"
            />
            <AppTooltip content={opStatus === "active" ? "Teco online" : "Indisponível"} side="right">
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-graphite-900 ${
                  opStatus === "active" ? "bg-emerald-500 dark:bg-lime-spark" : "bg-amber-500"
                }`}
              />
            </AppTooltip>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Teco · Assistente Financeiro
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Seu guia financeiro no MeFinance — interpreta apenas os cálculos determinísticos da sua conta.
            </p>
          </div>
        </div>

        {/* Barra compacta com os 2 Dropdowns (Limites + Modelo) e Ações */}
        <div ref={dropdownContainerRef} className="flex flex-wrap items-center gap-2 shrink-0">
          {appLimit && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((v) => (v === "limites" ? null : "limites"))}
                aria-expanded={openDropdown === "limites"}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Gauge size={14} className="text-emerald-600 dark:text-lime-spark shrink-0" />
                <span>
                  Limite: {appLimit.requestsUsedToday}/{appLimit.dailyRequestsLimit} hoje
                </span>
                <ChevronDown
                  size={13}
                  className={`text-slate-400 transition-transform ${openDropdown === "limites" ? "rotate-180" : ""}`}
                />
              </button>

              {openDropdown === "limites" && (
                <div className="absolute left-0 lg:left-auto lg:right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-40 p-4 space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-500 dark:text-slate-400">
                      {appLimit.scopeLabel}
                    </p>
                    <div className="flex items-baseline justify-between">
                      <strong className="text-sm text-slate-900 dark:text-slate-100">
                        {appLimit.requestsUsedToday} / {appLimit.dailyRequestsLimit} consultas hoje
                      </strong>
                      <span className="font-semibold text-emerald-600 dark:text-lime-spark">
                        {appLimit.requestsRemainingToday} restante(s)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 dark:bg-lime-spark transition-all"
                        style={{
                          width: `${Math.min(100, (appLimit.requestsUsedToday * 100) / Math.max(1, appLimit.dailyRequestsLimit))}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tokens registrados hoje nas suas perguntas: {appLimit.tokensRecordedToday.toLocaleString("pt-BR")}
                    </p>
                  </div>

                  {provTier && (
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      <p className="font-semibold text-slate-500 dark:text-slate-400">
                        {provTier.scopeLabel}
                      </p>
                      <p className="text-slate-700 dark:text-slate-200">
                        {provTier.dailyNeuronsLimit != null
                          ? `${provTier.dailyNeuronsLimit.toLocaleString("pt-BR")} Neurons/dia gratuitos (${provTier.neuronsRecordedByAppToday || 0} registrados pela app hoje · reset ${provTier.resetSchedule}).`
                          : `${provTier.summary} (${provTier.tokensRecordedByAppToday || 0} tokens registrados hoje).`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {provTier && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((v) => (v === "modelo" ? null : "modelo"))}
                aria-expanded={openDropdown === "modelo"}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Cpu size={14} className="text-emerald-600 dark:text-lime-spark shrink-0" />
                <span className="max-w-36 truncate">{modelShort}</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark">
                  Grátis
                </span>
                <ChevronDown
                  size={13}
                  className={`text-slate-400 transition-transform ${openDropdown === "modelo" ? "rotate-180" : ""}`}
                />
              </button>

              {openDropdown === "modelo" && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-40 p-2 space-y-1 text-xs">
                  <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                      Provedores gratuitos (sem cartão)
                    </span>
                  </div>
                  {allProviders.map((cp) => {
                    const ativo = cp.id === provTier.providerId;
                    return (
                      <button
                        key={cp.id}
                        type="button"
                        disabled={!cp.configured || trocandoProvedor}
                        onClick={() => !ativo && handleTrocarProvedor(cp.id, cp.name)}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-start justify-between gap-2 transition-colors ${
                          ativo
                            ? "bg-emerald-50 dark:bg-lime-spark/10 text-emerald-800 dark:text-lime-spark"
                            : cp.configured
                              ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                              : "opacity-50 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate">{cp.name}</p>
                          <p className="text-[11px] opacity-80 truncate">{cp.model || "—"}</p>
                          {!cp.configured ? (
                            <span className="text-[10px] text-slate-400">Não configurado no servidor</span>
                          ) : cp.quotaExhaustedToday ? (
                            <span className="text-[10px] text-amber-500">Cota gratuita diária atingida</span>
                          ) : null}
                        </div>
                        {ativo && <Check size={14} className="shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {mensagens.length > 0 && (
            <AppTooltip content="Limpar histórico de conversas" side="bottom">
              <button
                type="button"
                onClick={() => setConfirmLimpar(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Trash2 size={14} /> Limpar
              </button>
            </AppTooltip>
          )}
          <AppTooltip content="Preferências de IA" side="bottom">
            <Link
              to="/configuracoes?aba=ia"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Settings size={14} /> Config
            </Link>
          </AppTooltip>
        </div>
      </div>

      {/* Aviso de status quando indisponível, desativado ou cota atingida */}
      {!loading && opStatus !== "active" && (
        <div className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">Teco temporariamente indisponível para novas consultas</p>
              <p className="text-xs opacity-90 mt-0.5">{statusData?.statusMessage}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {altProvider && opStatus !== "disabled_by_user" && opStatus !== "user_limit_reached" && (
              <button
                type="button"
                disabled={trocandoProvedor}
                onClick={() => handleTrocarProvedor(altProvider.id, altProvider.name)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                <RefreshCw size={13} className={trocandoProvedor ? "animate-spin" : ""} />
                Trocar para {altProvider.name}
              </button>
            )}
            <Link
              to="/comparativo"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 text-xs font-semibold text-amber-800 dark:text-amber-200"
            >
              Ver Dashboard <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Faixa discreta de privacidade */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-600 dark:text-lime-spark shrink-0" />
          {prefs?.ai?.shareTransactionDetails
            ? "Modo detalhado: descrições das últimas transações podem ser incluídas no resumo enviado."
            : "Privacidade reforçada: apenas indicadores, categorias e totais agregados são consultados."}
        </span>
        <span className="text-slate-400 dark:text-slate-500">
          {prefs?.ai?.saveHistory === false ? "Histórico não salvo" : "Histórico salvo na conta"}
        </span>
      </div>

      {/* Área principal do Chat com maior aproveitamento vertical */}
      <div data-tour="assistente-chat" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col min-h-[480px] max-h-[72vh]">
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">
              Chamando o Teco e verificando histórico...
            </p>
          ) : mensagens.length === 0 ? (
            <div className="py-4 space-y-5 text-center max-w-2xl mx-auto">
              <div className="flex flex-col items-center gap-3">
                <img
                  src="/teco-avatar.jpg"
                  alt="Teco"
                  className="w-20 h-20 rounded-full object-cover border-2 border-emerald-400/70 dark:border-lime-spark/70 shadow-lg bg-slate-900"
                />
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Olá! Eu sou o Teco.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Estou de olho nos seus gastos, orçamentos, dívidas e metas. Escolha uma pergunta ou digite abaixo:
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {PERGUNTAS_SUGERIDAS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    disabled={!podePerguntar || enviando}
                    onClick={() => handleEnviar(sug)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:border-emerald-400 dark:hover:border-lime-spark/50 text-xs text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            mensagens.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col min-w-0 ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`flex items-start gap-2.5 max-w-full sm:max-w-[90%] min-w-0 ${
                    m.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {m.role === "assistant" && (
                    <AppTooltip content="Teco · Assistente Financeiro" side="top">
                      <img
                        src="/teco-avatar.jpg"
                        alt="Teco"
                        className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400/60 dark:border-lime-spark/60 shadow-xs shrink-0 mt-0.5 bg-slate-900"
                      />
                    </AppTooltip>
                  )}
                  <div className="flex flex-col gap-1 min-w-0 overflow-hidden">
                    {m.role === "assistant" && (
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-lime-spark pl-1">
                        Teco
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed overflow-hidden ${
                        m.role === "user"
                          ? "bg-emerald-600 dark:bg-lime-spark text-white dark:text-slate-900 font-medium"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      <MarkdownMessage content={m.content} isUser={m.role === "user"} />
                    </div>
                  </div>
                </div>
                {m.erroLocal && (
                  <span className="text-[11px] text-red-500 mt-1">{m.erroLocal}</span>
                )}
                {m.role === "assistant" && (m.model || (Array.isArray(m.tools_used) && m.tools_used.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pl-1 sm:pl-11 max-w-full">
                    {m.model && (
                      <AppTooltip content={`Provedor: ${m.provider || "gratuito"}`} side="bottom">
                        <span
                          className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-lime-spark/10 text-emerald-700 dark:text-lime-spark border border-emerald-200 dark:border-lime-spark/25 break-all"
                        >
                          <Cpu size={10} className="shrink-0" />
                          {m.provider ? `${m.provider} · ` : ""}
                          {m.model}
                        </span>
                      </AppTooltip>
                    )}
                    {Array.isArray(m.tools_used) && m.tools_used.length > 0 && (
                      <>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <Database size={10} /> Fontes:
                        </span>
                        {m.tools_used.map((t) => (
                          <span
                            key={t.name}
                            className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          >
                            {t.label}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {enviando && (
            <div className="flex items-start gap-2.5">
              <img
                src="/teco-avatar.jpg"
                alt="Teco"
                className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400/60 dark:border-lime-spark/60 shadow-xs shrink-0 mt-0.5 bg-slate-900 animate-pulse"
              />
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-lime-spark pl-1">
                  Teco
                </span>
                <div className="rounded-2xl px-4 py-3 text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 italic">
                  Analisando seus indicadores financeiros...
                </div>
              </div>
            </div>
          )}

          <div ref={fimChatRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEnviar();
          }}
          className="border-t border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 space-y-1.5"
        >
          <div className="flex items-end gap-2 min-w-0">
            <textarea
              ref={textareaRef}
              rows={1}
              maxLength={800}
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEnviar();
                }
              }}
              disabled={!podePerguntar || enviando}
              placeholder={
                podePerguntar
                  ? "Pergunte ao Teco sobre seus gastos, orçamentos, dívidas ou metas..."
                  : "Teco indisponível para novas perguntas no momento"
              }
              className="flex-1 min-w-0 w-full resize-none max-h-34 overflow-y-auto px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark disabled:opacity-60 leading-snug"
            />
            <button
              type="submit"
              aria-label={enviando ? "Analisando..." : "Perguntar"}
              disabled={!podePerguntar || enviando || !pergunta.trim()}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 h-10 sm:h-auto sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 font-semibold text-sm disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send size={15} className="shrink-0" />
              <span className="hidden min-[420px]:inline">
                {enviando ? "Analisando..." : "Perguntar"}
              </span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
            Suporta Markdown (**negrito**, listas, `código`) · Enter envia · Shift+Enter quebra linha
          </p>
        </form>
      </div>

      <ConfirmDialog
        isOpen={confirmLimpar}
        onClose={() => setConfirmLimpar(false)}
        onConfirm={handleLimparHistorico}
        loading={limpando}
        title="Limpar histórico de conversas"
        message="Todas as mensagens salvas com o Teco serão removidas da sua conta. Confirmar?"
        confirmText="Limpar"
      />
    </div>
  );
}
