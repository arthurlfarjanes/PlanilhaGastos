import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeftRight,
  LayoutDashboard,
  CalendarDays,
  Target,
  CreditCard,
  Landmark,
  Wallet,
  Flag,
  LineChart,
  Bell,
  Activity,
  Tags,
  SlidersHorizontal,
  FileText,
  ShieldAlert,
  Settings,
  Lock,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
} from "lucide-react";
import { AppTooltip } from "@/components/ui/Tooltip";

export const NAV_GROUPS = [
  {
    id: "visao_geral",
    label: "Visão Geral",
    items: [{ to: "/comparativo", label: "Dashboard", iconId: "dashboard" }],
  },
  {
    id: "gestao",
    label: "Gestão",
    items: [
      { to: "/dashboard", label: "Transações", iconId: "transacoes", end: true },
      { to: "/gastos-fixos", label: "Transações Fixas", iconId: "fixas" },
      { to: "/cartoes", label: "Cartões", iconId: "cartoes" },
      { to: "/dividas", label: "Dívidas", iconId: "dividas" },
      { to: "/patrimonio", label: "Patrimônio", iconId: "patrimonio" },
    ],
  },
  {
    id: "planejamento",
    label: "Planejamento",
    items: [
      { to: "/orcamentos", label: "Orçamentos", iconId: "orcamentos", hasAlertDot: true },
      { to: "/objetivos", label: "Objetivos", iconId: "objetivos" },
      { to: "/projecoes", label: "Projeções", iconId: "projecoes" },
    ],
  },
  {
    id: "inteligencia",
    label: "Inteligência",
    items: [
      { to: "/diagnosticos", label: "Diagnósticos", iconId: "diagnosticos" },
      { to: "/classificacao", label: "Classificação", iconId: "classificacao" },
      { to: "/otimizacao", label: "Otimização", iconId: "otimizacao" },
      { to: "/relatorios", label: "Relatórios", iconId: "relatorios" },
      { to: "/assistente", label: "Teco · Assistente", iconId: "inteligencia" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      {
        to: "/configuracoes?aba=notificacoes",
        label: "Notificações",
        iconId: "notificacoes",
        hasNotifDot: true,
        onlyWhenNotif: true,
      },
      { to: "/configuracoes", label: "Configurações", iconId: "configuracoes" },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function isNavItemActive(item, location) {
  if (!location) return false;
  const aba = new URLSearchParams(location.search || "").get("aba");
  if (item.to === "/configuracoes?aba=notificacoes") {
    return location.pathname === "/configuracoes" && aba === "notificacoes";
  }
  if (item.to === "/configuracoes") {
    return location.pathname === "/configuracoes" && aba !== "notificacoes";
  }
  return location.pathname === item.to;
}

function TecoOwlIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      {/* Orelhas / sobrancelhas estilizadas da coruja */}
      <path d="M5 4.5 9 8c1-.5 2-.75 3-.75s2 .25 3 .75l4-3.5" />
      {/* Contorno da cabeça e corpo arredondado */}
      <path d="M5 4.5C4.2 7 4 9.2 4 11.5a8 8 0 0 0 16 0c0-2.3-.2-4.5-1-7" />
      {/* Olhos expressivos */}
      <circle cx="9" cy="12" r="2.2" />
      <circle cx="15" cy="12" r="2.2" />
      <circle cx="9" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="0.6" fill="currentColor" stroke="none" />
      {/* Bico */}
      <path d="M12 13.8v2.2" />
      <path d="M10.9 14.3 12 16l1.1-1.7" />
    </svg>
  );
}

export function NavIcon({ id, size = 18 }) {
  switch (id) {
    case "transacoes":
      return <ArrowLeftRight size={size} className="shrink-0" />;
    case "dashboard":
      return <LayoutDashboard size={size} className="shrink-0" />;
    case "fixas":
      return <CalendarDays size={size} className="shrink-0" />;
    case "orcamentos":
      return <Target size={size} className="shrink-0" />;
    case "cartoes":
      return <CreditCard size={size} className="shrink-0" />;
    case "dividas":
      return <Landmark size={size} className="shrink-0" />;
    case "patrimonio":
      return <Wallet size={size} className="shrink-0" />;
    case "objetivos":
      return <Flag size={size} className="shrink-0" />;
    case "projecoes":
      return <LineChart size={size} className="shrink-0" />;
    case "notificacoes":
      return <Bell size={size} className="shrink-0" />;
    case "configuracoes":
      return <Settings size={size} className="shrink-0" />;
    case "diagnosticos":
      return <Activity size={size} className="shrink-0" />;
    case "classificacao":
      return <Tags size={size} className="shrink-0" />;
    case "otimizacao":
      return <SlidersHorizontal size={size} className="shrink-0" />;
    case "relatorios":
      return <FileText size={size} className="shrink-0" />;
    case "inteligencia":
      return <TecoOwlIcon size={size} />;
    case "admin":
      return <ShieldAlert size={size} className="shrink-0" />;
    default:
      return <LayoutDashboard size={size} className="shrink-0" />;
  }
}

export function NavGroupsMenu({
  location,
  role,
  alertasVisiveis = 0,
  lembretesVisiveis = 0,
  reduceMotion = false,
  compact = false,
  iconSize = 17,
}) {
  return (
    <div className="flex flex-col gap-3">
      {NAV_GROUPS.map((group) => {
        const baseItems = group.items.filter((it) => !it.onlyWhenNotif || lembretesVisiveis > 0);
        const showAdmin = group.id === "sistema" && role === "admin";
        if (baseItems.length === 0 && !group.comingSoon && !showAdmin) return null;

        return (
          <div key={group.id} className="flex flex-col gap-1">
            {!compact ? (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-graphite-400">
                {group.label}
              </p>
            ) : (
              <div className="mx-3 border-t border-slate-200/70 dark:border-graphite-700 my-0.5" />
            )}

            {baseItems.map((item) => {
              const active = isNavItemActive(item, location);
              return (
                <AppTooltip key={item.to} content={compact ? item.label : null} side="right">
                  <Link
                    to={item.to}
                    className={`relative flex items-center ${
                      compact ? "justify-center px-2.5" : "gap-3 px-3.5"
                    } py-2 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? "bg-lime-spark text-graphite-900 font-bold shadow-[0_2px_12px_rgba(182,255,226,0.3)]"
                        : "text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <NavIcon id={item.iconId} size={iconSize} />
                    {!compact && <span className="truncate">{item.label}</span>}

                    {item.hasAlertDot && alertasVisiveis > 0 && (
                      <span
                        aria-label={`${alertasVisiveis} orçamento(s) em alerta`}
                        className={`${compact ? "absolute top-1.5 right-1.5" : "ml-auto"} flex items-center gap-1.5`}
                      >
                        <span className="relative flex items-center justify-center h-2 w-2">
                          <span
                            className={`${reduceMotion ? "hidden" : "animate-ping"} absolute inset-0 rounded-full bg-amber-400/60`}
                          />
                          <span className="relative rounded-full h-1.5 w-1.5 bg-amber-400" />
                        </span>
                        {!compact && (
                          <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                            {alertasVisiveis}
                          </span>
                        )}
                      </span>
                    )}

                    {item.hasNotifDot && lembretesVisiveis > 0 && (
                      <span
                        aria-label={`${lembretesVisiveis} lembrete(s) ativo(s)`}
                        className={`${compact ? "absolute top-1.5 right-1.5" : "ml-auto"} flex items-center gap-1.5`}
                      >
                        {!compact && (
                          <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                            {lembretesVisiveis}
                          </span>
                        )}
                        {compact && <span className="rounded-full h-2 w-2 bg-rose-500" />}
                      </span>
                    )}
                  </Link>
                </AppTooltip>
              );
            })}

            {group.comingSoon && !compact && (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-slate-400 dark:text-graphite-400 italic select-none">
                <Sparkles size={14} className="shrink-0 opacity-60" />
                <span className="truncate">{group.comingSoon}</span>
              </div>
            )}

            {showAdmin && (
              <AppTooltip content={compact ? "Painel Admin" : null} side="right">
                <Link
                  to="/admin"
                  className={`flex items-center ${
                    compact ? "justify-center px-2.5" : "gap-3 px-3.5"
                  } py-2 rounded-xl text-sm font-semibold transition-all ${
                    location.pathname === "/admin"
                      ? "bg-red-500 text-white font-bold shadow-[0_2px_12px_rgba(239,68,68,0.3)]"
                      : "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  }`}
                >
                <NavIcon id="admin" size={iconSize} />
                {!compact && <span className="truncate">Painel Admin</span>}
              </Link>
              </AppTooltip>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getInitials(name) {
  if (!name) return "U";
  return name.substring(0, 2).toUpperCase();
}

export default function Sidebar({
  username,
  profilePic,
  role,
  theme,
  toggleTheme,
  alertasVisiveis,
  lembretesVisiveis = 0,
  reduceMotion,
  onOpenTrocarSenha,
  onLogout,
}) {
  const [colapsada, setColapsada] = useState(false);
  const [mobileAberta, setMobileAberta] = useState(false);
  const [contaMenuAberto, setContaMenuAberto] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileAberta(false);
    setContaMenuAberto(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!contaMenuAberto) return;
    const handleOutside = (e) => {
      if (!e.target.closest?.("[data-sidebar-account-menu]")) {
        setContaMenuAberto(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setContaMenuAberto(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contaMenuAberto]);

  const renderLinks = (compact) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar" aria-label="Menu principal">
      <NavGroupsMenu
        location={location}
        role={role}
        alertasVisiveis={alertasVisiveis}
        lembretesVisiveis={lembretesVisiveis}
        reduceMotion={reduceMotion}
        compact={compact}
        iconSize={18}
      />
    </nav>
  );

  const renderAccountMenuItems = (compact) => (
    <div
      className={
        compact
          ? "absolute left-full bottom-0 ml-2 w-52 bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200 dark:border-graphite-600 shadow-xl z-50 overflow-hidden animate-scale-in origin-bottom-left"
          : "mt-2 bg-white dark:bg-graphite-900 rounded-2xl border border-slate-200 dark:border-graphite-600 shadow-lg overflow-hidden"
      }
    >
      {compact && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-graphite-600">
          <p className="text-xs font-semibold text-slate-500 dark:text-graphite-300 uppercase tracking-wide">
            Conta
          </p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
            {username}
          </p>
        </div>
      )}

      <Link
        to="/configuracoes"
        onClick={() => setContaMenuAberto(false)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-graphite-800 transition-colors cursor-pointer"
      >
        <Settings size={16} className="text-lime-spark shrink-0" />
        Configurações
      </Link>

      <button
        type="button"
        onClick={() => {
          setContaMenuAberto(false);
          onOpenTrocarSenha();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-graphite-800 transition-colors cursor-pointer"
      >
        <Lock size={16} className="text-lime-spark shrink-0" />
        Trocar Senha
      </button>

      <button
        type="button"
        onClick={() => {
          toggleTheme();
          setContaMenuAberto(false);
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-graphite-800 transition-colors cursor-pointer"
      >
        {theme === "dark" ? (
          <>
            <Sun size={16} className="text-amber-400 shrink-0" />
            Modo Claro
          </>
        ) : (
          <>
            <Moon size={16} className="text-slate-500 dark:text-graphite-300 shrink-0" />
            Modo Escuro
          </>
        )}
        <span className="ml-auto text-[0.65rem] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-graphite-700 text-slate-500 dark:text-graphite-300">
          {theme === "dark" ? "DARK" : "LIGHT"}
        </span>
      </button>

      <div className="border-t border-slate-100 dark:border-graphite-600" />

      <button
        type="button"
        onClick={() => {
          setContaMenuAberto(false);
          onLogout();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
      >
        <LogOut size={16} className="shrink-0" />
        Sair da conta
      </button>
    </div>
  );

  const renderFooter = (compact) => (
    <div
      data-sidebar-account-menu="true"
      className="relative border-t border-slate-200/80 dark:border-graphite-600 p-3"
    >
      <AppTooltip
        content={compact ? `${username} (${role === "admin" ? "Administrador" : "Conta pessoal"})` : null}
        side="right"
      >
        <button
          type="button"
          onClick={() => setContaMenuAberto((v) => !v)}
          aria-haspopup="true"
          aria-expanded={contaMenuAberto}
          className={`w-full flex items-center ${
            compact ? "justify-center p-2 rounded-2xl" : "justify-between gap-2.5 px-3 py-2 rounded-full"
          } bg-slate-100 dark:bg-graphite-900 hover:bg-slate-200 dark:hover:bg-graphite-700 border border-slate-200 dark:border-graphite-600 transition-all cursor-pointer`}
        >
        <div className="flex items-center gap-2.5 min-w-0">
          {profilePic ? (
            <img
              src={profilePic}
              alt="Perfil"
              className="w-8 h-8 rounded-full object-cover border-2 border-lime-spark shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-lime-spark/20 text-[var(--accent-strong)] dark:text-lime-spark font-extrabold flex items-center justify-center border border-lime-spark/40 text-xs shrink-0">
              {getInitials(username)}
            </div>
          )}
          {!compact && (
            <div className="min-w-0 text-left">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {username}
              </p>
              <p className="text-[0.65rem] text-slate-500 dark:text-graphite-400">
                {role === "admin" ? "Administrador" : "Conta pessoal"}
              </p>
            </div>
          )}
        </div>
        {!compact && (
          <ChevronDown
            size={15}
            className={`text-slate-400 dark:text-graphite-400 shrink-0 transition-transform duration-200 ${
              contaMenuAberto ? "rotate-180" : ""
            }`}
          />
        )}
        </button>
      </AppTooltip>

      {contaMenuAberto && renderAccountMenuItems(compact)}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col shrink-0 sticky top-0 h-screen bg-white/95 dark:bg-graphite-800/95 backdrop-blur-md border-r border-slate-200/80 dark:border-graphite-600 transition-all duration-200 z-40 ${
          colapsada ? "w-20" : "w-64"
        }`}
      >
        <div
          className={`flex items-center ${colapsada ? "justify-center px-2" : "justify-between px-4"} h-20 border-b border-slate-200/80 dark:border-graphite-600`}
        >
          {!colapsada && (
            <Link
              to="/dashboard"
              className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-graphite-600 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                <img src="/logo.png" alt="MeFinance Logo" className="w-8 h-8 object-scale-down" />
              </div>
              <span>
                Me<span className="text-[var(--accent-strong)] dark:text-lime-spark">Finance</span>
              </span>
            </Link>
          )}
          <AppTooltip content={colapsada ? "Expandir sidebar" : "Recolher sidebar"} side={colapsada ? "right" : "bottom"}>
            <button
              type="button"
              onClick={() => setColapsada((v) => !v)}
              aria-label={colapsada ? "Expandir sidebar" : "Recolher sidebar"}
              className="p-2 rounded-xl text-slate-500 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors cursor-pointer"
            >
              {colapsada ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </AppTooltip>
        </div>

        {renderLinks(colapsada)}
        {renderFooter(colapsada)}
      </aside>

      {/* Mobile Topbar + Slide-over Drawer */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-white/90 dark:bg-graphite-800/90 backdrop-blur-md border-b border-slate-200/80 dark:border-graphite-600">
        <Link
          to="/dashboard"
          className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2"
        >
          <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-graphite-600 flex items-center justify-center shadow-xs overflow-hidden">
            <img src="/logo.png" alt="MeFinance Logo" className="w-8 h-8 object-scale-down" />
          </div>
          <span>
            Me<span className="text-[var(--accent-strong)] dark:text-lime-spark">Finance</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {lembretesVisiveis > 0 && (
            <Link
              to="/configuracoes?aba=notificacoes"
              aria-label={`${lembretesVisiveis} lembrete(s)`}
              className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {lembretesVisiveis}
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileAberta(true)}
            aria-label="Abrir menu lateral"
            className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors"
          >
            <Menu size={22} />
            {alertasVisiveis > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>
      </div>

      {mobileAberta && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileAberta(false)}
          />
          <aside className="relative z-10 flex flex-col w-72 max-w-[85vw] h-full bg-white dark:bg-graphite-800 border-r border-slate-200 dark:border-graphite-600 shadow-2xl">
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200/80 dark:border-graphite-600">
              <span className="font-extrabold text-xl text-slate-900 dark:text-white">
                Me<span className="text-[var(--accent-strong)] dark:text-lime-spark">Finance</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileAberta(false)}
                aria-label="Fechar menu lateral"
                className="p-2 rounded-xl text-slate-500 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700"
              >
                <X size={20} />
              </button>
            </div>
            {renderLinks(false)}
            {renderFooter(false)}
          </aside>
        </div>
      )}
    </>
  );
}
