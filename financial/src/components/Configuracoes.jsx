import React, { useContext, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Palette, LayoutDashboard, Wallet, UserCircle, Lock, RotateCcw, ArrowUp, ArrowDown } from "lucide-react";
import toast from "react-hot-toast";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import { ModalTrocarSenha } from "./ModalTrocarSenha";
import { formatCurrency, formatDate } from "../utils/formatters";

const TABS = [
  { id: "perfil", label: "Perfil e conta", icon: UserCircle },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "financeiro", label: "Preferências financeiras", icon: Wallet },
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
  const { username, role } = useContext(AuthContext);
  const { prefs, loaded, updatePreferences, resetPreferences } = usePreferences();
  // A aba fica na URL: sobrevive à remontagem causada por mudança de moeda/data.
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((x) => x.id === params.get("aba")) ? params.get("aba") : "perfil";
  const setTab = (id) => setParams({ aba: id }, { replace: true });
  const [senhaOpen, setSenhaOpen] = useState(false);
  const a = prefs.appearance;
  const d = prefs.dashboard;
  const f = prefs.financial;

  const setA = (patch) => updatePreferences({ appearance: patch });
  const setD = (patch) => updatePreferences({ dashboard: patch });
  const setF = (patch) => updatePreferences({ financial: patch });

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
          {TABS.map((item) => (
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
              {item.label}
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
                      <button key={c.id} type="button" role="radio" aria-checked={a.accent === c.id} aria-label={c.label} title={c.label}
                        onClick={() => setA({ accent: c.id })}
                        style={{ backgroundColor: c.color }}
                        className={`w-9 h-9 rounded-full cursor-pointer transition-transform ${a.accent === c.id ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-graphite-800 scale-110" : "hover:scale-105"}`} />
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
        </div>
      </div>
    </div>
  );
}
