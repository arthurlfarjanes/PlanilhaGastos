import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  Lock,
  Settings,
} from "lucide-react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Comparativo from "./components/Comparativo";
import GerenciarGastosFixos from "./components/GerenciarGastosFixos";
import AdminPanel from "./components/AdminPanel";
import NotFound from "./components/NotFound";
import ServerError from "./components/ServerError";
import LandingPage from "./components/LandingPage";
import CookieBanner from "./components/CookieBanner";
import Footer from "./components/Footer";
import ScrollUpButton from "./components/ScrollUpButton";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { ModalTrocarSenha } from "./components/ModalTrocarSenha";
import Configuracoes from "./components/Configuracoes";
import Orcamentos from "./components/Orcamentos";
import Dividas from "./components/Dividas";
import Cartoes from "./components/Cartoes";
import Sidebar, { NAV_ITEMS, NavIcon } from "./components/Sidebar";
import { PreferencesProvider, usePreferences } from "./context/PreferencesContext";
import { todayInTimezone } from "./utils/formatters";
import "./index.css";

export const AuthContext = createContext(null);
export const ThemeContext = createContext(null);

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Rotas onde o Header NÃO deve aparecer
const AUTH_ROUTES = ["/login", "/register", "/"];

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username"));
  const [profilePic, setProfilePic] = useState(
    localStorage.getItem("profilePic"),
  );
  const [role, setRole] = useState(localStorage.getItem("role") || "user");

  const login = (newToken, newUsername, newProfilePic = null, newRole = "user") => {
    setToken(newToken);
    setUsername(newUsername);
    setProfilePic(newProfilePic);
    setRole(newRole);
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", newUsername);
    localStorage.setItem("role", newRole);
    if (newProfilePic) {
      localStorage.setItem("profilePic", newProfilePic);
    } else {
      localStorage.removeItem("profilePic");
    }
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    setProfilePic(null);
    setRole("user");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("profilePic");
    localStorage.removeItem("role");
  };

  return (
    <GoogleOAuthProvider
      clientId={
        import.meta.env.VITE_GOOGLE_CLIENT_ID || "COLE_SEU_CLIENT_ID_AQUI"
      }
    >
      <AuthContext.Provider
        value={{ token, username, profilePic, role, login, logout, API_URL }}
      >
        <PreferencesProvider token={token} apiUrl={API_URL}>
          <ThemeBridge>
            <TooltipProvider>
              <Router>
                <Toaster position="top-right" />
                <AppShell />
              </Router>
            </TooltipProvider>
          </ThemeBridge>
        </PreferencesProvider>
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

// Mantém a API do ThemeContext (theme/toggleTheme) alimentada pelas preferências do servidor.
// A key remonta a árvore quando formato de moeda/data muda, para refletir nos formatadores.
function ThemeBridge({ children }) {
  const { prefs, resolvedTheme, toggleTheme } = usePreferences();
  const { currency, locale, dateFormat } = prefs.financial;
  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, toggleTheme }}>
      <React.Fragment key={`${currency}|${locale}|${dateFormat}`}>{children}</React.Fragment>
    </ThemeContext.Provider>
  );
}

// Shell que decide se mostra Navbar ou Sidebar baseado na rota atual e preferências
function AppShell() {
  const { token, username, profilePic, role, logout, API_URL } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { prefs } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);
  const isLanding = location.pathname === "/";
  const useSidebar = Boolean(token && !isAuthPage && prefs?.appearance?.navLayout === "sidebar");

  const [modalSenhaOpen, setModalSenhaOpen] = useState(false);
  const [alertasOrcamento, setAlertasOrcamento] = useState(0);

  const reduceMotion = Boolean(prefs?.appearance?.reduceMotion);
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";
  const alertasVisiveis = token ? alertasOrcamento : 0;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const checarAlertas = () => {
      const [ano, mes] = todayInTimezone(timezone).split("-").map(Number);
      fetch(`${API_URL}/orcamentos?mes=${mes}&ano=${ano}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data?.resumo?.contagem) return;
          const total =
            (data.resumo.contagem.em_alerta || 0) +
            (data.resumo.contagem.excedidos || 0);
          setAlertasOrcamento(total);
        })
        .catch(() => { });
    };

    checarAlertas();
    window.addEventListener("mefinance:orcamentos-updated", checarAlertas);
    return () => {
      cancelled = true;
      window.removeEventListener("mefinance:orcamentos-updated", checarAlertas);
    };
  }, [token, API_URL, timezone, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className={`flex min-h-screen w-full bg-slate-50 dark:bg-graphite-900 text-slate-900 dark:text-slate-100 transition-colors duration-200 ${
        useSidebar ? "flex-col md:flex-row" : "flex-col"
      }`}
    >
      {!isAuthPage && useSidebar && (
        <Sidebar
          username={username}
          profilePic={profilePic}
          role={role}
          theme={theme}
          toggleTheme={toggleTheme}
          alertasVisiveis={alertasVisiveis}
          reduceMotion={reduceMotion}
          onOpenTrocarSenha={() => setModalSenhaOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {!isAuthPage && !useSidebar && (
        <Header
          alertasVisiveis={alertasVisiveis}
          reduceMotion={reduceMotion}
          onOpenTrocarSenha={() => setModalSenhaOpen(true)}
          onLogout={handleLogout}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <main
          className={
            isLanding
              ? "grow w-full"
              : `grow w-full max-w-7xl mx-auto ${isAuthPage
                ? "flex items-center justify-center p-4 sm:p-6 min-h-screen"
                : "p-4 sm:p-6 md:p-8"
              }`
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/comparativo"
              element={
                <PrivateRoute>
                  <Comparativo />
                </PrivateRoute>
              }
            />
            <Route
              path="/gastos-fixos"
              element={
                <PrivateRoute>
                  <GerenciarGastosFixos />
                </PrivateRoute>
              }
            />
            <Route
              path="/orcamentos"
              element={
                <PrivateRoute>
                  <Orcamentos />
                </PrivateRoute>
              }
            />
            <Route
              path="/cartoes"
              element={
                <PrivateRoute>
                  <Cartoes />
                </PrivateRoute>
              }
            />
            <Route
              path="/dividas"
              element={
                <PrivateRoute>
                  <Dividas />
                </PrivateRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <PrivateRoute>
                  <Configuracoes />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />

            {/* Rota Pega-Tudo para 404 */}
            <Route path="*" element={<NotFound />} />

            {/* Rota para erros 500 */}
            <Route path="/500" element={<ServerError />} />
          </Routes>
        </main>

        {!isAuthPage && <Footer />}
      </div>

      {!isAuthPage && <ScrollUpButton />}
      <CookieBanner />
      <ModalTrocarSenha isOpen={modalSenhaOpen} onClose={() => setModalSenhaOpen(false)} />
    </div>
  );
}

function Header({ alertasVisiveis, reduceMotion, onOpenTrocarSenha, onLogout }) {
  const { token, username, profilePic, role } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const [navDropdownAberto, setNavDropdownAberto] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const navDropdownRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fecha os dropdowns ao clicar fora ou apertar Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
      if (navDropdownRef.current && !navDropdownRef.current.contains(e.target)) {
        setNavDropdownAberto(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setDropdownAberto(false);
        setNavDropdownAberto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Fecha menus ao trocar de rota
  useEffect(() => {
    setMenuAberto(false);
    setNavDropdownAberto(false);
    setDropdownAberto(false);
  }, [location]);

  const handleLogout = () => {
    setDropdownAberto(false);
    setNavDropdownAberto(false);
    setMenuAberto(false);
    onLogout();
  };

  const activeNav =
    NAV_ITEMS.find((item) => item.to === location.pathname) ||
    (location.pathname === "/admin" ? { label: "Painel Admin", iconId: "admin" } : null) ||
    (location.pathname === "/configuracoes" ? { label: "Configurações", iconId: "dashboard" } : null);

  const getInitials = (name) => {
    if (!name) return "U";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-8 md:px-10 h-20 bg-white/90 dark:bg-graphite-800/90 backdrop-blur-md border-b border-slate-200/80 dark:border-graphite-600 shadow-xs transition-colors duration-200">
      {/* Logo + Menu Suspenso Desktop */}
      <div className="flex items-center gap-4">
        <div className="logo">
          <Link
            to="/"
            className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight hover:opacity-90 transition-opacity flex items-center gap-2.5"
          >
            <div className="w-11 h-11 rounded-xl border border-slate-200 dark:border-graphite-600 flex items-center justify-center shadow-xs overflow-hidden">
              <img src="/logo.png" alt="MeFinance Logo" className="w-10 h-10 object-scale-down" />
            </div>
            <span>
              Me
              <span className="text-[var(--accent-strong)] dark:text-lime-spark">Finance</span>
            </span>
          </Link>
        </div>

        {/* Menu suspenso de navegação no desktop */}
        {token && (
          <div className="hidden md:block relative" ref={navDropdownRef}>
            <button
              type="button"
              onClick={() => setNavDropdownAberto((v) => !v)}
              aria-haspopup="true"
              aria-expanded={navDropdownAberto}
              className="relative flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-graphite-900 hover:bg-slate-200 dark:hover:bg-graphite-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-graphite-600 transition-all cursor-pointer"
            >
              <Menu size={17} className="text-[var(--accent-strong)] dark:text-lime-spark" />
              <span>{activeNav ? activeNav.label : "Navegação"}</span>
              {alertasVisiveis > 0 && (
                <span
                  aria-label={`${alertasVisiveis} orçamento(s) em alerta`}
                  className="relative flex items-center justify-center h-2 w-2"
                >
                  <span
                    className={`${reduceMotion ? "hidden" : "animate-ping"} absolute inset-0 rounded-full bg-amber-400/60`}
                  />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-amber-400" />
                </span>
              )}
              <ChevronDown
                size={15}
                className={`text-slate-400 dark:text-graphite-400 transition-transform duration-200 ${
                  navDropdownAberto ? "rotate-180" : ""
                }`}
              />
            </button>

            {navDropdownAberto && (
              <nav
                aria-label="Menu de navegação"
                className="absolute left-0 mt-2 w-64 bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200 dark:border-graphite-600 shadow-xl z-50 p-2 flex flex-col gap-1"
              >
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-lime-spark text-graphite-900 font-bold shadow-[0_2px_12px_rgba(182,255,226,0.3)]"
                          : "text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 hover:text-slate-900 dark:hover:text-white"
                      }`
                    }
                  >
                    <NavIcon id={item.iconId} size={17} />
                    <span>{item.label}</span>
                    {item.hasAlertDot && alertasVisiveis > 0 && (
                      <span className="ml-auto flex items-center gap-1.5">
                        <span className="relative flex items-center justify-center h-2 w-2">
                          <span
                            className={`${reduceMotion ? "hidden" : "animate-ping"} absolute inset-0 rounded-full bg-amber-400/60`}
                          />
                          <span className="relative rounded-full h-1.5 w-1.5 bg-amber-400" />
                        </span>
                        <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          {alertasVisiveis}
                        </span>
                      </span>
                    )}
                  </NavLink>
                ))}
                {role === "admin" && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-red-500 text-white font-bold shadow-[0_2px_12px_rgba(239,68,68,0.3)]"
                          : "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                      }`
                    }
                  >
                    <NavIcon id="admin" size={17} />
                    <span>Painel Admin</span>
                  </NavLink>
                )}
              </nav>
            )}
          </div>
        )}
      </div>

      {/* Botão hamburger mobile */}
      <button
        className="flex items-center text-slate-700 dark:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-graphite-700 md:hidden transition-colors"
        onClick={() => setMenuAberto(!menuAberto)}
        aria-label="Abrir menu"
      >
        {menuAberto ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Navegação mobile + Ações */}
      <div
        className={`absolute top-20 left-0 w-full bg-white dark:bg-graphite-800 shadow-xl border-b border-slate-200 dark:border-graphite-600 md:static md:w-auto md:bg-transparent md:dark:bg-transparent md:shadow-none md:border-none flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-3 p-5 md:p-0 transition-all ${menuAberto ? "flex" : "hidden md:flex"
          }`}
      >
        {/* Nav links apenas no drawer mobile */}
        {token && (
          <nav className="flex flex-col gap-1 w-full md:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-lime-spark text-graphite-900 font-bold shadow-[0_2px_12px_rgba(182,255,226,0.3)]"
                      : "text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 hover:text-slate-900 dark:hover:text-white"
                  }`
                }
              >
                <NavIcon id={item.iconId} size={17} />
                <span>{item.label}</span>
                {item.hasAlertDot && alertasVisiveis > 0 && (
                  <span className="ml-auto text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    {alertasVisiveis}
                  </span>
                )}
              </NavLink>
            ))}
            {role === "admin" && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-red-500 text-white font-bold shadow-[0_2px_12px_rgba(239,68,68,0.3)]"
                      : "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  }`
                }
              >
                <NavIcon id="admin" size={17} /> Painel Admin
              </NavLink>
            )}
          </nav>
        )}

        {/* Ações: login/register ou dropdown do usuário */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
          {!token ? (
            <>
              <Link
                to="/login"
                className="flex items-center gap-2 font-semibold px-4 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors justify-center text-sm"
              >
                <LogIn size={17} /> Login
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl bg-lime-spark text-graphite-900 shadow-[0_4px_14px_rgba(182,255,226,0.3)] hover:bg-lime-spark-hover hover:-translate-y-0.5 transition-all justify-center text-sm"
              >
                <UserPlus size={17} /> Registrar
              </Link>
            </>
          ) : (
            /* ── Dropdown do usuário ── */
            <div className="relative w-full md:w-auto" ref={dropdownRef}>
              <button
                onClick={() => setDropdownAberto(!dropdownAberto)}
                className="flex items-center gap-2.5 w-full md:w-auto bg-slate-100 dark:bg-graphite-900 hover:bg-slate-200 dark:hover:bg-graphite-700 px-3.5 py-2 rounded-full border border-slate-200 dark:border-graphite-600 transition-all pointer-events-none md:pointer-events-auto cursor-pointer group"
                aria-haspopup="true"
                aria-expanded={dropdownAberto}
              >
                {profilePic ? (
                  <img
                    src={profilePic}
                    alt="Perfil"
                    className="w-7 h-7 rounded-full object-cover border-2 border-lime-spark shadow-xs shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-lime-spark/20 text-[var(--accent-strong)] dark:text-lime-spark font-extrabold flex items-center justify-center border border-lime-spark/40 text-xs shrink-0">
                    {getInitials(username)}
                  </div>
                )}
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {username}
                </span>
                <ChevronDown
                  size={15}
                  className={`hidden md:block text-slate-400 dark:text-graphite-400 transition-transform duration-200 ${dropdownAberto ? "rotate-180" : ""
                    }`}
                />
              </button>

              {dropdownAberto && (
                <div className="hidden md:block absolute right-0 mt-2 w-52 bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200 dark:border-graphite-600 shadow-xl z-50 overflow-hidden animate-scale-in origin-top-right">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-graphite-600">
                    <p className="text-xs font-semibold text-slate-500 dark:text-graphite-300 uppercase tracking-wide">
                      Conta
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                      {username}
                    </p>
                  </div>

                  <Link
                    to="/configuracoes"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-graphite-900 transition-colors cursor-pointer"
                  >
                    <Settings size={16} className="text-lime-spark shrink-0" />
                    Configurações
                  </Link>

                  <button
                    onClick={() => {
                      onOpenTrocarSenha();
                      setDropdownAberto(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-graphite-900 transition-colors cursor-pointer"
                  >
                    <Lock size={16} className="text-lime-spark shrink-0" />
                    Trocar Senha
                  </button>

                  <button
                    onClick={() => {
                      toggleTheme();
                      setDropdownAberto(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-graphite-900 transition-colors cursor-pointer"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun size={16} className="text-amber-400 shrink-0" />
                        Modo Claro
                      </>
                    ) : (
                      <>
                        <Moon
                          size={16}
                          className="text-slate-500 dark:text-graphite-300 shrink-0"
                        />
                        Modo Escuro
                      </>
                    )}
                    <span className="ml-auto text-[0.65rem] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-graphite-700 text-slate-500 dark:text-graphite-300">
                      {theme === "dark" ? "DARK" : "LIGHT"}
                    </span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-graphite-600" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut size={16} className="shrink-0" />
                    Sair da conta
                  </button>
                </div>
              )}

              {/* Mobile: items expandidos diretamente */}
              <div className="md:hidden mt-2 flex flex-col gap-1 border-t border-slate-100 dark:border-graphite-600 pt-3">
                <Link
                  to="/configuracoes"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors"
                >
                  <Settings size={16} className="text-lime-spark shrink-0" />
                  Configurações
                </Link>
                <button
                  onClick={() => {
                    onOpenTrocarSenha();
                    setMenuAberto(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors"
                >
                  <Lock size={16} className="text-lime-spark shrink-0" />
                  Trocar Senha
                </button>
                <button
                  onClick={() => {
                    toggleTheme();
                    setMenuAberto(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-graphite-700 transition-colors"
                >
                  {theme === "dark" ? (
                    <Sun size={16} className="text-amber-400" />
                  ) : (
                    <Moon size={16} className="text-slate-500" />
                  )}
                  {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={16} />
                  Sair da conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function PrivateRoute({ children }) {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);
  return token ? children : null;
}

function AdminRoute({ children }) {
  const { token, role } = useContext(AuthContext);
  const navigate = useNavigate();
  useEffect(() => {
    if (!token) {
      navigate("/login");
    } else if (role !== "admin") {
      navigate("/");
    }
  }, [token, role, navigate]);
  return token && role === "admin" ? children : null;
}

export default App;
