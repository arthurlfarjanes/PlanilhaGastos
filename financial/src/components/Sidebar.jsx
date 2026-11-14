import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowLeftRight,
  LayoutDashboard,
  CalendarDays,
  Target,
  CreditCard,
  Landmark,
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
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Transações", iconId: "transacoes", end: true },
  { to: "/comparativo", label: "Dashboard", iconId: "dashboard" },
  { to: "/gastos-fixos", label: "Transações Fixas", iconId: "fixas" },
  { to: "/orcamentos", label: "Orçamentos", iconId: "orcamentos", hasAlertDot: true },
  { to: "/cartoes", label: "Cartões", iconId: "cartoes" },
  { to: "/dividas", label: "Dívidas", iconId: "dividas" },
];

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
    case "admin":
      return <ShieldAlert size={size} className="shrink-0" />;
    default:
      return <LayoutDashboard size={size} className="shrink-0" />;
  }
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
  reduceMotion,
  onOpenTrocarSenha,
  onLogout,
}) {
  const [colapsada, setColapsada] = useState(false);
  const [mobileAberta, setMobileAberta] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileAberta(false);
  }, [location.pathname]);

  const renderLinks = (compact) => (
    <nav className="flex flex-col gap-1 flex-1 overflow-y-auto px-3 py-4 custom-scrollbar" aria-label="Menu principal">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          title={compact ? item.label : undefined}
          className={({ isActive }) =>
            `relative flex items-center ${compact ? "justify-center px-2.5" : "gap-3 px-3.5"} py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? "bg-lime-spark text-graphite-900 font-bold shadow-[0_2px_12px_rgba(182,255,226,0.3)]"
                : "text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 hover:text-slate-900 dark:hover:text-white"
            }`
          }
        >
          <NavIcon id={item.iconId} size={18} />
          {!compact && <span className="truncate">{item.label}</span>}
          {item.hasAlertDot && alertasVisiveis > 0 && (
            <span
              aria-label={`${alertasVisiveis} orçamento(s) em alerta`}
              className={`${compact ? "absolute top-2 right-2" : "ml-auto"} flex items-center gap-1.5`}
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
        </NavLink>
      ))}

      {role === "admin" && (
        <NavLink
          to="/admin"
          title={compact ? "Painel Admin" : undefined}
          className={({ isActive }) =>
            `flex items-center ${compact ? "justify-center px-2.5" : "gap-3 px-3.5"} py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? "bg-red-500 text-white font-bold shadow-[0_2px_12px_rgba(239,68,68,0.3)]"
                : "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
            }`
          }
        >
          <NavIcon id="admin" size={18} />
          {!compact && <span className="truncate">Painel Admin</span>}
        </NavLink>
      )}
    </nav>
  );

  const renderFooter = (compact) => (
    <div className="border-t border-slate-200/80 dark:border-graphite-600 p-3 flex flex-col gap-1">
      <div
        className={`flex items-center ${compact ? "justify-center" : "gap-2.5 px-2.5"} py-2 mb-1 rounded-xl bg-slate-50 dark:bg-graphite-900/60 border border-slate-200/60 dark:border-graphite-600/60`}
        title={compact ? username : undefined}
      >
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
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {username}
            </p>
            <p className="text-[0.65rem] text-slate-500 dark:text-graphite-400">
              {role === "admin" ? "Administrador" : "Conta pessoal"}
            </p>
          </div>
        )}
      </div>

      <NavLink
        to="/configuracoes"
        title={compact ? "Configurações" : undefined}
        className={({ isActive }) =>
          `flex items-center ${compact ? "justify-center px-2.5" : "gap-3 px-3"} py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
            isActive
              ? "bg-[var(--accent-strong)]/10 text-[var(--accent-strong)] dark:text-lime-spark font-semibold"
              : "text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700"
          }`
        }
      >
        <Settings size={16} className="text-lime-spark shrink-0" />
        {!compact && <span>Configurações</span>}
      </NavLink>

      <button
        type="button"
        onClick={onOpenTrocarSenha}
        title={compact ? "Trocar Senha" : undefined}
        className={`flex items-center ${compact ? "justify-center px-2.5" : "gap-3 px-3"} py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors cursor-pointer`}
      >
        <Lock size={16} className="text-lime-spark shrink-0" />
        {!compact && <span>Trocar Senha</span>}
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        title={compact ? (theme === "dark" ? "Modo Claro" : "Modo Escuro") : undefined}
        className={`flex items-center ${compact ? "justify-center px-2.5" : "gap-3 px-3"} py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors cursor-pointer`}
      >
        {theme === "dark" ? (
          <Sun size={16} className="text-amber-400 shrink-0" />
        ) : (
          <Moon size={16} className="text-slate-500 dark:text-graphite-300 shrink-0" />
        )}
        {!compact && <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>}
      </button>

      <button
        type="button"
        onClick={onLogout}
        title={compact ? "Sair da conta" : undefined}
        className={`flex items-center ${compact ? "justify-center px-2.5" : "gap-3 px-3"} py-2 rounded-xl text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer`}
      >
        <LogOut size={16} className="shrink-0" />
        {!compact && <span>Sair da conta</span>}
      </button>
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
          <button
            type="button"
            onClick={() => setColapsada((v) => !v)}
            aria-label={colapsada ? "Expandir sidebar" : "Recolher sidebar"}
            title={colapsada ? "Expandir sidebar" : "Recolher sidebar"}
            className="p-2 rounded-xl text-slate-500 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors cursor-pointer"
          >
            {colapsada ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
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

