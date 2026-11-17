import React, { useContext, useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  Palette,
  LayoutDashboard,
  Wallet,
  UserCircle,
  Lock,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Bell,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Trash2,
  ShieldCheck,
  Download,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import { ModalTrocarSenha } from "./ModalTrocarSenha";
import { Modal } from "./ui/Modal";
import { formatCurrency, formatDate, todayInTimezone } from "../utils/formatters";
import { AppTooltip } from "@/components/ui/Tooltip";

const TABS_BASE = [
  { id: "perfil", label: "Perfil e conta", icon: UserCircle },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "financeiro", label: "Preferências financeiras", icon: Wallet },
  { id: "ia", label: "Inteligência Artificial", icon: Sparkles },
  { id: "privacidade", label: "Privacidade e dados", icon: ShieldCheck },
];

const ACCENTS = [
  { id: "emerald", label: "Esmeralda", color: "#059669" },
  { id: "blue", label: "Azul", color: "#2563eb" },
  { id: "violet", label: "Violeta", color: "#7c3aed" },
  { id: "amber", label: "Âmbar", color: "#d97706" },
  { id: "rose", label: "Rosa", color: "#e11d48" },
];

const TIMEZONES = [
  "America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "America/Cuiaba", "America/Rio_Branco",
  "America/Noronha", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/Lisbon",
  "Europe/London", "Europe/Madrid", "Europe/Paris", "UTC",
];

const CARD_LABELS = { receitas: "Receitas filtradas", despesas: "Despesas filtradas", saldo: "Saldo do extrato" };

const field = "w-full rounded-xl border border-slate-200 dark:border-graphite-600 bg-white dark:bg-graphite-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)]";

function Section({ title, description, children }) {
  return (
    <section className="bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200/80 dark:border-graphite-600 p-5 sm:p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
        {description && <p className="text-sm text-slate-500 dark:text-graphite-300 mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, hint, children, htmlFor }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6">
      <label htmlFor={htmlFor} className="sm:max-w-xs">
        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
        {hint && <span className="block text-xs text-slate-500 dark:text-graphite-300 mt-0.5">{hint}</span>}
      </label>
      <div className="sm:w-64 shrink-0">{children}</div>
    </div>
  );
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl border border-slate-200 dark:border-graphite-600 overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${
            value === o.value
              ? "bg-[var(--accent-strong)] text-white dark:text-graphite-950"
              : "bg-white dark:bg-graphite-900 text-slate-600 dark:text-graphite-300 hover:bg-slate-50 dark:hover:bg-graphite-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${checked ? "bg-[var(--accent-strong)]" : "bg-slate-300 dark:bg-graphite-500"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

export default function Configuracoes() {
  const { username, role, token, logout, API_URL } = useContext(AuthContext);
  const navigate = useNavigate();
  const { prefs, loaded, updatePreferences, resetPreferences } = usePreferences();
  // A aba fica na URL: sobrevive à remontagem causada por mudança de moeda/data.
  const [params, setParams] = useSearchParams();
  const [senhaOpen, setSenhaOpen] = useState(false);
  const [lembretes, setLembretes] = useState([]);
  const [lembretesResumo, setLembretesResumo] = useState({ total: 0, alta: 0, media: 0, baixa: 0 });
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [iaStatus, setIaStatus] = useState(null);
  const [loadingIa, setLoadingIa] = useState(false);
  const [privResumo, setPrivResumo] = useState(null);
  const [loadingPriv, setLoadingPriv] = useState(false);
  const [exportandoDados, setExportandoDados] = useState(false);
  const [excluirModalOpen, setExcluirModalOpen] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delUsername, setDelUsername] = useState("");
  const [delPhrase, setDelPhrase] = useState("");
  const [excluindoConta, setExcluindoConta] = useState(false);

  const a = prefs.appearance;
  const d = prefs.dashboard;
  const f = prefs.financial;
  const n = prefs.notifications || {
    enabled: true,
    daysAhead: 5,
    remindBills: true,
    remindCards: true,
    remindBudgets: true,
    remindGoals: true,
  };
  const aiPrefs = prefs.ai || {
    enabled: true,
    responseStyle: "equilibrado",
    saveHistory: true,
    shareTransactionDetails: false,
  };
  const timezone = f?.timezone || "America/Sao_Paulo";

  const carregarLembretes = useCallback(async () => {
    if (!token) return;
    setLoadingNotif(true);
    try {
      const refToday = todayInTimezone(timezone);
      const res = await fetch(`${API_URL}/notificacoes?refDate=${encodeURIComponent(refToday)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setLembretes(Array.isArray(data.lembretes) ? data.lembretes : []);
      setLembretesResumo(data.resumo || { total: 0, alta: 0, media: 0, baixa: 0 });
    } catch {
      // silencioso
    } finally {
      setLoadingNotif(false);
    }
  }, [token, API_URL, timezone]);

  const carregarStatusIA = useCallback(async () => {
    if (!token) return;
    setLoadingIa(true);
    try {
      const res = await fetch(`${API_URL}/ia/status`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) setIaStatus(await res.json());
    } catch {
      // silencioso
    } finally {
      setLoadingIa(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    carregarLembretes();
  }, [carregarLembretes, prefs.notifications]);

  useEffect(() => {
    carregarStatusIA();
  }, [carregarStatusIA, prefs.ai]);

  const carregarResumoPrivacidade = useCallback(async () => {
    if (!token) return;
    setLoadingPriv(true);
    try {
      const res = await fetch(`${API_URL}/privacidade/resumo`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) setPrivResumo(await res.json());
    } catch {
      // silencioso
    } finally {
      setLoadingPriv(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    if (params.get("aba") === "privacidade" && !privResumo) {
      carregarResumoPrivacidade();
    }
  }, [params, privResumo, carregarResumoPrivacidade]);

  const exportarDadosConta = async () => {
    if (!token) return;
    setExportandoDados(true);
    try {
      const res = await fetch(`${API_URL}/privacidade/exportar`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Não foi possível exportar os dados.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mefinance-dados-conta-${todayInTimezone(timezone)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Pacote completo dos seus dados (.json) baixado com sucesso.");
    } catch (err) {
      toast.error(err.message || "Falha ao exportar dados.");
    } finally {
      setExportandoDados(false);
    }
  };

  const confirmarExcluirConta = async (e) => {
    e.preventDefault();
    if (!token) return;
    setExcluindoConta(true);
    try {
      const res = await fetch(`${API_URL}/privacidade/conta`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: delPassword || undefined,
          confirmUsername: delUsername,
          confirmPhrase: delPhrase,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível excluir a conta.");
      }
      setExcluirModalOpen(false);
      toast.success("Sua conta e todos os seus dados foram removidos permanentemente.");
      logout();
      navigate("/");
    } catch (err) {
      toast.error(err.message || "Erro ao excluir conta.");
    } finally {
      setExcluindoConta(false);
    }
  };

  const mostrarAbaNotificacoes =
    lembretesResumo.total > 0 ||
    params.get("aba") === "notificacoes" ||
    n.enabled === false;

  const tabsDisponiveis = mostrarAbaNotificacoes
    ? [
        ...TABS_BASE,
        {
          id: "notificacoes",
          label: "Notificações",
          icon: Bell,
          badge: lembretesResumo.total,
        },
      ]
    : TABS_BASE;

  const tab = tabsDisponiveis.some((x) => x.id === params.get("aba"))
    ? params.get("aba")
    : "perfil";
  const setTab = (id) => setParams({ aba: id }, { replace: true });

  const setA = (patch) => updatePreferences({ appearance: patch });
  const setD = (patch) => updatePreferences({ dashboard: patch });
  const setF = (patch) => updatePreferences({ financial: patch });
  const setN = async (patch) => {
    await updatePreferences({ notifications: patch });
    window.dispatchEvent(new Event("mefinance:notificacoes-updated"));
  };
  const setAI = async (patch) => {
    await updatePreferences({ ai: patch });
    carregarStatusIA();
  };
  const limparHistoricoIA = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/ia/historico`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Histórico de conversas com a IA limpo.");
    } catch {
      toast.error("Não foi possível limpar o histórico.");
    }
  };

  const moveCard = (id, delta) => {
    const order = [...d.cardOrder];
    const i = order.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setD({ cardOrder: order });
  };

  const toggleCard = (id, visible) => {
    const hidden = visible ? d.hiddenCards.filter((c) => c !== id) : [...d.hiddenCards, id];
    setD({ hiddenCards: hidden });
  };

  const restaurar = async () => {
    if (await resetPreferences()) toast.success("Preferências restauradas para o padrão.");
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-sm text-slate-500 dark:text-graphite-300 mt-1">
          Suas preferências são salvas na sua conta e aplicadas em qualquer dispositivo.
          {!loaded && " Carregando..."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-start">
        <nav aria-label="Seções de configurações" className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
          {tabsDisponiveis.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                tab === item.id
                  ? "bg-[var(--accent-strong)]/10 text-[var(--accent-strong)] dark:text-lime-spark font-semibold"
                  : "text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700"
              }`}
            >
              {React.createElement(item.icon, { size: 17, className: "shrink-0" })}
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="ml-auto text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-6 min-w-0">
          {tab === "perfil" && (
            <>
              <Section title="Perfil e conta">
                <Row label="Usuário"><p className="text-sm font-semibold text-slate-900 dark:text-white">{username}</p></Row>
                <Row label="Tipo de conta"><p className="text-sm text-slate-700 dark:text-slate-200">{role === "admin" ? "Administrador" : "Usuário"}</p></Row>
                <Row label="Senha" hint="Contas criadas com o Google não possuem senha local.">
                  <button type="button" onClick={() => setSenhaOpen(true)} className={`${field} flex items-center justify-center gap-2 font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-graphite-700`}>
                    <Lock size={15} /> Trocar senha
                  </button>
                </Row>
              </Section>
              <Section title="Restaurar padrões" description="Remove todas as suas personalizações salvas e volta às configurações originais.">
                <button type="button" onClick={restaurar} className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/10">
                  <RotateCcw size={15} /> Restaurar preferências
                </button>
              </Section>
              <ModalTrocarSenha isOpen={senhaOpen} onClose={() => setSenhaOpen(false)} />
            </>
          )}

          {tab === "aparencia" && (
            <>
              <Section title="Tema e cores">
                <Row label="Navegação" hint="Alterne entre menu suspenso no topo (Navbar) ou barra lateral fixa (Sidebar).">
                  <Segmented label="Navegação" value={a.navLayout || "navbar"} onChange={(v) => setA({ navLayout: v })}
                    options={[{ value: "navbar", label: "Navbar" }, { value: "sidebar", label: "Sidebar" }]} />
                </Row>
                <Row label="Tema" hint="Automático segue o modo do seu sistema.">
                  <Segmented label="Tema" value={a.theme} onChange={(v) => setA({ theme: v })}
                    options={[{ value: "light", label: "Claro" }, { value: "dark", label: "Escuro" }, { value: "auto", label: "Auto" }]} />
                </Row>
                <Row label="Cor de destaque">
                  <div className="flex gap-2.5" role="radiogroup" aria-label="Cor de destaque">
                    {ACCENTS.map((c) => (
                      <AppTooltip key={c.id} content={c.label}>
                        <button type="button" role="radio" aria-checked={a.accent === c.id} aria-label={c.label}
                          onClick={() => setA({ accent: c.id })}
                          style={{ backgroundColor: c.color }}
                          className={`w-9 h-9 rounded-full cursor-pointer transition-transform ${a.accent === c.id ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-graphite-800 scale-110" : "hover:scale-105"}`} />
                      </AppTooltip>
                    ))}
                  </div>
                </Row>
                <Row label="Densidade" hint="Compacta reduz espaçamentos para exibir mais informação.">
                  <Segmented label="Densidade" value={a.density} onChange={(v) => setA({ density: v })}
                    options={[{ value: "comfortable", label: "Confortável" }, { value: "compact", label: "Compacta" }]} />
                </Row>
              </Section>
              <Section title="Acessibilidade">
                <Row label="Tamanho do texto">
                  <Segmented label="Tamanho do texto" value={a.fontScale} onChange={(v) => setA({ fontScale: v })}
                    options={[{ value: "normal", label: "Normal" }, { value: "large", label: "Grande" }, { value: "xlarge", label: "Maior" }]} />
                </Row>
                <Row label="Alto contraste" hint="Reforça textos secundários e o foco do teclado." htmlFor="hc">
                  <Switch id="hc" checked={a.highContrast} onChange={(v) => setA({ highContrast: v })} />
                </Row>
                <Row label="Reduzir animações" hint="Desativa transições e animações." htmlFor="rm">
                  <Switch id="rm" checked={a.reduceMotion} onChange={(v) => setA({ reduceMotion: v })} />
                </Row>
              </Section>
            </>
          )}

          {tab === "dashboard" && (
            <>
              <Section title="Período padrão" description="Filtro de datas aplicado ao abrir o Dashboard. Você ainda pode alterá-lo pelos filtros da tela.">
                <Row label="Período inicial" htmlFor="periodo">
                  <select id="periodo" className={field} value={d.defaultPeriod} onChange={(e) => setD({ defaultPeriod: e.target.value })}>
                    <option value="all">Todo o histórico</option>
                    <option value="current_month">Período financeiro atual</option>
                    <option value="last_30_days">Últimos 30 dias</option>
                  </select>
                </Row>
              </Section>
              <Section title="Cards de resumo" description="Escolha quais cards exibir e a ordem em que aparecem.">
                <ul className="flex flex-col gap-2">
                  {d.cardOrder.map((id, i) => (
                    <li key={id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-graphite-600 px-3.5 py-2.5">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{CARD_LABELS[id]}</span>
                      <div className="flex items-center gap-1.5">
                        <button type="button" aria-label={`Mover ${CARD_LABELS[id]} para cima`} disabled={i === 0} onClick={() => moveCard(id, -1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-graphite-700 disabled:opacity-30 cursor-pointer"><ArrowUp size={16} /></button>
                        <button type="button" aria-label={`Mover ${CARD_LABELS[id]} para baixo`} disabled={i === d.cardOrder.length - 1} onClick={() => moveCard(id, 1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-graphite-700 disabled:opacity-30 cursor-pointer"><ArrowDown size={16} /></button>
                        <Switch checked={!d.hiddenCards.includes(id)} onChange={(v) => toggleCard(id, v)} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            </>
          )}

          {tab === "financeiro" && (
            <Section title="Preferências financeiras" description={`Pré-visualização: ${formatCurrency(1234.56)} · ${formatDate(new Date())}`}>
              <Row label="Moeda principal" hint="Altera a exibição dos valores. Não converte cotações." htmlFor="moeda">
                <select id="moeda" className={field} value={f.currency} onChange={(e) => setF({ currency: e.target.value })}>
                  <option value="BRL">Real (BRL)</option>
                  <option value="USD">Dólar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </Row>
              <Row label="Região e idioma de formatação" htmlFor="locale">
                <select id="locale" className={field} value={f.locale} onChange={(e) => setF({ locale: e.target.value })}>
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español (España)</option>
                </select>
              </Row>
              <Row label="Formato de data" htmlFor="datefmt">
                <select id="datefmt" className={field} value={f.dateFormat} onChange={(e) => setF({ dateFormat: e.target.value })}>
                  <option value="locale">Padrão da região</option>
                  <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                  <option value="MM/DD/YYYY">MM/DD/AAAA</option>
                  <option value="YYYY-MM-DD">AAAA-MM-DD</option>
                </select>
              </Row>
              <Row label="Fuso horário" hint="Define o que é “hoje” nos períodos do Dashboard." htmlFor="tz">
                <select id="tz" className={field} value={f.timezone} onChange={(e) => setF({ timezone: e.target.value })}>
                  {(TIMEZONES.includes(f.timezone) ? TIMEZONES : [f.timezone, ...TIMEZONES]).map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </Row>
              <Row label="Início do período financeiro" hint="Dia do mês em que seu mês financeiro começa (1 a 28)." htmlFor="startday">
                <select id="startday" className={field} value={f.periodStartDay} onChange={(e) => setF({ periodStartDay: Number(e.target.value) })}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Dia {n}</option>
                  ))}
                </select>
              </Row>
            </Section>
          )}

          {tab === "notificacoes" && (
            <>
              <Section
                title="Lembretes ativos"
                description="Alertas gerados automaticamente a partir das suas contas, faturas de cartão, orçamentos e prazos de objetivos."
              >
                {loadingNotif ? (
                  <p className="text-sm text-slate-500 dark:text-graphite-300">Carregando lembretes...</p>
                ) : lembretes.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-lime-spark/10 border border-emerald-200 dark:border-lime-spark/20 text-sm text-emerald-800 dark:text-lime-spark">
                    <CheckCircle2 size={18} className="shrink-0" />
                    <span>
                      {n.enabled === false
                        ? "Os lembretes automáticos estão desativados."
                        : "Tudo em dia! Nenhum lembrete pendente no momento."}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {lembretes.map((l) => {
                      const sevCls =
                        l.severidade === "alta"
                          ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-300"
                          : l.severidade === "media"
                            ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25 text-amber-800 dark:text-amber-300"
                            : "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/25 text-sky-800 dark:text-sky-300";
                      const sevLabel =
                        l.severidade === "alta"
                          ? "Urgente"
                          : l.severidade === "media"
                            ? "Atenção"
                            : "Informativo";

                      return (
                        <div
                          key={l.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-graphite-600 bg-slate-50/70 dark:bg-graphite-900/50"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${sevCls}`}>
                                <AlertTriangle size={11} /> {sevLabel}
                              </span>
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {l.titulo}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-graphite-300">{l.descricao}</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {l.valor != null && (
                              <strong className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {formatCurrency(l.valor)}
                              </strong>
                            )}
                            {l.link && (
                              <Link
                                to={l.link}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-graphite-800 border border-slate-200 dark:border-graphite-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-graphite-700"
                              >
                                Abrir <ArrowRight size={13} />
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>

              <Section
                title="Preferências de lembretes"
                description="Defina quais alertas financeiros deseja acompanhar e com quantos dias de antecedência."
              >
                <Row label="Ativar lembretes automáticos" hint="Quando desativado, oculta alertas de vencimento e metas." htmlFor="notif-enabled">
                  <Switch id="notif-enabled" checked={n.enabled !== false} onChange={(v) => setN({ enabled: v })} />
                </Row>
                <Row label="Antecedência para vencimentos" hint="Quantos dias antes do vencimento alertar contas, faturas e metas." htmlFor="notif-days">
                  <select
                    id="notif-days"
                    className={field}
                    disabled={n.enabled === false}
                    value={n.daysAhead || 5}
                    onChange={(e) => setN({ daysAhead: Number(e.target.value) })}
                  >
                    {[1, 3, 5, 7, 15, 30].map((dNum) => (
                      <option key={dNum} value={dNum}>
                        {dNum} dia(s) antes
                      </option>
                    ))}
                  </select>
                </Row>
                <Row label="Contas fixas e assinaturas" htmlFor="notif-bills">
                  <Switch id="notif-bills" checked={n.remindBills !== false} onChange={(v) => setN({ remindBills: v })} />
                </Row>
                <Row label="Faturas de cartão" htmlFor="notif-cards">
                  <Switch id="notif-cards" checked={n.remindCards !== false} onChange={(v) => setN({ remindCards: v })} />
                </Row>
                <Row label="Orçamentos em alerta ou excedidos" htmlFor="notif-budgets">
                  <Switch id="notif-budgets" checked={n.remindBudgets !== false} onChange={(v) => setN({ remindBudgets: v })} />
                </Row>
                <Row label="Prazos e ritmo de objetivos" htmlFor="notif-goals">
                  <Switch id="notif-goals" checked={n.remindGoals !== false} onChange={(v) => setN({ remindGoals: v })} />
                </Row>
              </Section>
            </>
          )}

          {tab === "ia" && (
            <>
              <Section
                title="Assistente Financeiro (100% Gratuito)"
                description="Configurações de privacidade, estilo e histórico. Os cálculos financeiros continuam sendo feitos pelo motor determinístico do sistema."
              >
                <Row
                  label="Ativar Assistente Financeiro"
                  hint="Permite enviar perguntas ao provedor gratuito usando consultas somente leitura."
                  htmlFor="ai-enabled"
                >
                  <Switch
                    id="ai-enabled"
                    checked={aiPrefs.enabled !== false}
                    onChange={(v) => setAI({ enabled: v })}
                  />
                </Row>
                <Row
                  label="Provedor gratuito"
                  hint="Escolha o provedor padrão ou alterne entre Cloudflare Workers AI e Groq Free Tier."
                  htmlFor="ai-provider"
                >
                  <select
                    id="ai-provider"
                    className={field}
                    value={aiPrefs.preferredProvider || "auto"}
                    onChange={(e) => setAI({ preferredProvider: e.target.value })}
                  >
                    <option value="auto">Padrão do servidor (Auto)</option>
                    {(iaStatus?.availableProviders || [
                      { id: "cloudflare", name: "Cloudflare Workers AI", configured: true },
                      { id: "groq", name: "Groq Free Tier", configured: true },
                    ]).map((p) => (
                      <option key={p.id} value={p.id} disabled={!p.configured}>
                        {p.name}
                        {!p.configured ? " (não configurado)" : p.quotaExhaustedToday ? " (cota esgotada hoje)" : ""}
                      </option>
                    ))}
                  </select>
                </Row>
                <Row label="Estilo de resposta" htmlFor="ai-style">
                  <Segmented
                    label="Estilo de resposta"
                    value={aiPrefs.responseStyle || "equilibrado"}
                    onChange={(v) => setAI({ responseStyle: v })}
                    options={[
                      { value: "direto", label: "Direto" },
                      { value: "equilibrado", label: "Equilibrado" },
                      { value: "detalhado", label: "Detalhado" },
                    ]}
                  />
                </Row>
                <Row
                  label="Salvar histórico de conversas"
                  hint="Desative para manter as perguntas apenas durante a sessão atual."
                  htmlFor="ai-history"
                >
                  <Switch
                    id="ai-history"
                    checked={aiPrefs.saveHistory !== false}
                    onChange={(v) => setAI({ saveHistory: v })}
                  />
                </Row>
                <Row
                  label="Compartilhar descrições das transações"
                  hint="Quando desligado (padrão), enviamos apenas totais, categorias e indicadores agregados."
                  htmlFor="ai-details"
                >
                  <Switch
                    id="ai-details"
                    checked={Boolean(aiPrefs.shareTransactionDetails)}
                    onChange={(v) => setAI({ shareTransactionDetails: v })}
                  />
                </Row>
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-graphite-600">
                  <Link
                    to="/assistente"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-strong)] text-white dark:text-graphite-950 text-sm font-semibold"
                  >
                    <Sparkles size={15} /> Abrir Assistente Financeiro
                  </Link>
                  <button
                    type="button"
                    onClick={limparHistoricoIA}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={15} /> Limpar histórico da IA
                  </button>
                </div>
              </Section>

              <Section
                title="Consumo e limites gratuitos"
                description="Separação transparente entre o limite individual da aplicação e a franquia gratuita global do provedor."
              >
                {loadingIa && !iaStatus ? (
                  <p className="text-sm text-slate-500 dark:text-graphite-300">Carregando uso de IA...</p>
                ) : iaStatus?.usage ? (
                  <div className="space-y-4 text-sm">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-graphite-600 bg-slate-50/70 dark:bg-graphite-900/50 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-graphite-300">
                        {iaStatus.usage.applicationIndividualLimit.scopeLabel}
                      </p>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {iaStatus.usage.applicationIndividualLimit.requestsUsedToday} de{" "}
                        {iaStatus.usage.applicationIndividualLimit.dailyRequestsLimit} consultas usadas hoje (UTC:{" "}
                        {iaStatus.usage.utcDate})
                      </p>
                      <p className="text-xs text-slate-500 dark:text-graphite-400">
                        Tokens registrados nas suas consultas de hoje:{" "}
                        {iaStatus.usage.applicationIndividualLimit.tokensRecordedToday.toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-graphite-600 bg-slate-50/70 dark:bg-graphite-900/50 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-graphite-300">
                        {iaStatus.usage.providerFreeTier.scopeLabel}
                      </p>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {iaStatus.usage.providerFreeTier.providerName}
                        {iaStatus.usage.providerFreeTier.model
                          ? ` (${iaStatus.usage.providerFreeTier.model})`
                          : ""}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-graphite-300">
                        {iaStatus.usage.providerFreeTier.summary}
                      </p>
                      {iaStatus.usage.providerFreeTier.dailyNeuronsLimit != null && (
                        <p className="text-xs text-slate-500 dark:text-graphite-400">
                          Franquia global gratuita:{" "}
                          {iaStatus.usage.providerFreeTier.dailyNeuronsLimit.toLocaleString("pt-BR")} Neurons/dia ·
                          Neurons registrados pela aplicação hoje:{" "}
                          {(iaStatus.usage.providerFreeTier.neuronsRecordedByAppToday || 0).toLocaleString("pt-BR")}
                        </p>
                      )}
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 pt-1">
                        Status operacional: {iaStatus.statusMessage}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-graphite-300">
                    Não foi possível carregar os dados de uso agora.
                  </p>
                )}
              </Section>
            </>
          )}

          {tab === "privacidade" && (
            <>
              <Section
                title="Dados armazenados na sua conta"
                description="Transparência sobre os registros vinculados exclusivamente à sua conta no MeFinance (LGPD)."
              >
                {loadingPriv && !privResumo ? (
                  <p className="text-sm text-slate-500 dark:text-graphite-300">Carregando resumo de dados...</p>
                ) : privResumo?.contagens ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                    {[
                      ["Transações", privResumo.contagens.transacoes],
                      ["Categorias", privResumo.contagens.categorias],
                      ["Contas fixas", privResumo.contagens.gastos_fixos],
                      ["Orçamentos", privResumo.contagens.orcamentos],
                      ["Cartões", privResumo.contagens.cartoes],
                      ["Dívidas", privResumo.contagens.dividas],
                      ["Patrimônio", privResumo.contagens.patrimonio_itens],
                      ["Objetivos", privResumo.contagens.objetivos],
                      ["Regras IA", privResumo.contagens.classificacao_regras],
                      ["Mensagens Teco", privResumo.contagens.ai_messages],
                    ].map(([lbl, qtd]) => (
                      <div
                        key={lbl}
                        className="p-3 rounded-xl border border-slate-200 dark:border-graphite-600 bg-slate-50/70 dark:bg-graphite-900/50"
                      >
                        <p className="text-[11px] text-slate-500 dark:text-graphite-300">{lbl}</p>
                        <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">{qtd}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-graphite-300">
                    Não foi possível carregar as contagens agora.
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-graphite-600 space-y-4">
                  <Row
                    label="Salvar histórico com o Teco"
                    hint="Desative para manter conversas somente durante a sessão."
                    htmlFor="priv-ai-history"
                  >
                    <Switch
                      id="priv-ai-history"
                      checked={aiPrefs.saveHistory !== false}
                      onChange={(v) => setAI({ saveHistory: v })}
                    />
                  </Row>
                  <Row
                    label="Compartilhar descrições na IA"
                    hint="Por padrão, apenas totais e categorias agregadas são consultados."
                    htmlFor="priv-ai-details"
                  >
                    <Switch
                      id="priv-ai-details"
                      checked={Boolean(aiPrefs.shareTransactionDetails)}
                      onChange={(v) => setAI({ shareTransactionDetails: v })}
                    />
                  </Row>
                </div>
              </Section>

              <Section
                title="Portabilidade e exportação de dados"
                description="Baixe uma cópia completa dos seus registros financeiros em JSON estruturado ou gere relatórios executivos em PDF/CSV."
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={exportarDadosConta}
                    disabled={exportandoDados}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-strong)] text-white dark:text-graphite-950 text-sm font-bold cursor-pointer disabled:opacity-50"
                  >
                    <Download size={16} />
                    {exportandoDados ? "Gerando arquivo..." : "Baixar meus dados completos (.json)"}
                  </button>
                  <Link
                    to="/relatorios"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-graphite-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-graphite-700"
                  >
                    <FileText size={16} /> Abrir Relatórios (PDF / CSV)
                  </Link>
                </div>
                <p className="text-xs text-slate-500 dark:text-graphite-400">
                  O arquivo JSON contém suas preferências, transações, orçamentos, cartões, dívidas, patrimônio, objetivos, regras de classificação e mensagens salvas — nunca inclui hashes de senha ou tokens de sessão.
                </p>
              </Section>

              <Section
                title="Excluir conta permanentemente"
                description="Remove definitivamente seu usuário e todos os registros financeiros associados. Esta operação é irreversível."
              >
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-red-800 dark:text-red-200 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={15} /> Ação irreversível (Zona de Perigo)
                    </p>
                    <p>
                      Recomendamos baixar seus dados em JSON ou exportar um PDF/CSV antes de excluir sua conta.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDelPassword("");
                      setDelUsername("");
                      setDelPhrase("");
                      setExcluirModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <Trash2 size={14} /> Excluir minha conta
                  </button>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={excluirModalOpen}
        onClose={() => !excluindoConta && setExcluirModalOpen(false)}
        title="Excluir conta permanentemente"
        maxWidth="max-w-md"
      >
        <form onSubmit={confirmarExcluirConta} className="space-y-4 text-sm">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 text-xs text-red-700 dark:text-red-300">
            Todos os seus lançamentos, cartões, faturas, dívidas, patrimônio, objetivos, orçamentos, regras e histórico com o Teco serão apagados definitivamente.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Confirme seu nome de usuário (<span className="font-bold">{username}</span>)
            </label>
            <input
              type="text"
              required
              value={delUsername}
              onChange={(e) => setDelUsername(e.target.value)}
              placeholder={username}
              className={field}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Digite <span className="font-bold text-red-600 dark:text-red-400">EXCLUIR</span> para confirmar
            </label>
            <input
              type="text"
              required
              value={delPhrase}
              onChange={(e) => setDelPhrase(e.target.value)}
              placeholder="EXCLUIR"
              className={field}
            />
          </div>

          {privResumo?.conta?.hasLocalPassword !== false && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Sua senha atual (ou deixe em branco apenas se a conta for exclusivamente Google)
              </label>
              <input
                type="password"
                required={Boolean(privResumo?.conta?.hasLocalPassword)}
                value={delPassword}
                onChange={(e) => setDelPassword(e.target.value)}
                placeholder="••••••••"
                className={field}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={excluindoConta}
              onClick={() => setExcluirModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-graphite-600 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={excluindoConta || delUsername.trim() !== username || delPhrase.trim().toUpperCase() !== "EXCLUIR"}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {excluindoConta ? "Excluindo..." : "Confirmar exclusão definitiva"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
