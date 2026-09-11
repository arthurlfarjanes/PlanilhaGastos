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
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  LogIn,
  UserPlus,
  Wallet,
  Menu,
  X,
  CalendarDays,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Comparativo from "./components/Comparativo";
import GerenciarGastosFixos from "./components/GerenciarGastosFixos";
import NotFound from "./components/NotFound";
import ServerError from "./components/ServerError";
import CookieBanner from "./components/CookieBanner";
import "./index.css";

export const AuthContext = createContext(null);
export const ThemeContext = createContext(null);

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Rotas onde o Header NÃO deve aparecer
const AUTH_ROUTES = ["/login", "/register"];

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username"));
  const [profilePic, setProfilePic] = useState(
    localStorage.getItem("profilePic"),
  );

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("mefinance-theme");
    if (savedTheme) return savedTheme;
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("mefinance-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const login = (newToken, newUsername, newProfilePic = null) => {
    setToken(newToken);
    setUsername(newUsername);
    setProfilePic(newProfilePic);
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", newUsername);
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
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("profilePic");
  };

  return (
    <GoogleOAuthProvider
      clientId={
        import.meta.env.VITE_GOOGLE_CLIENT_ID || "COLE_SEU_CLIENT_ID_AQUI"
      }
    >
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <AuthContext.Provider
          value={{ token, username, profilePic, login, logout, API_URL }}
        >
          <Router>
            <AppShell />
          </Router>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </GoogleOAuthProvider>
  );
}

// Shell que decide se mostra o Header ou não baseado na rota atual
function AppShell() {
  const location = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-graphite-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {!isAuthPage && <Header />}
      <main
        className={`grow w-full max-w-7xl mx-auto ${
          isAuthPage
            ? "flex items-center justify-center p-4 sm:p-6 min-h-screen"
            : "p-4 sm:p-6 md:p-8"
        }`}
      >
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
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

          {/* Rota Pega-Tudo para 404 */}
          <Route path="*" element={<NotFound />} />

          {/* Rota para erros 500 */}
          <Route path="/500" element={<ServerError />} />
        </Routes>
      </main>

      <CookieBanner />
    </div>
  );
}

function Header() {
  const { token, username, profilePic, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fecha menus ao trocar de rota
  useEffect(() => {
    setMenuAberto(false);
    setDropdownAberto(false);
  }, [location]);

  const handleLogout = () => {
    setDropdownAberto(false);
    setMenuAberto(false);
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-8 md:px-10 h-20 bg-white/90 dark:bg-graphite-800/90 backdrop-blur-md border-b border-slate-200/80 dark:border-graphite-600 shadow-xs transition-colors duration-200">
      {/* Logo */}
      <div className="logo">
        <Link
          to="/"
          className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight hover:opacity-90 transition-opacity flex items-center gap-2.5"
        >
          <div className="w-10 h-10 rounded-xl bg-graphite-700 dark:bg-graphite-900 border border-slate-200 dark:border-graphite-600 flex items-center justify-center text-lime-spark shadow-xs">
            <Wallet
              size={22}
              className="drop-shadow-[0_0_8px_rgba(182,255,226,0.4)]"
            />
          </div>
          <span>
            Me
            <span className="text-[#059669] dark:text-lime-spark">Finance</span>
          </span>
        </Link>
      </div>

      {/* Botão hamburger mobile */}
      <button
        className="flex items-center text-slate-700 dark:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-graphite-700 md:hidden transition-colors"
        onClick={() => setMenuAberto(!menuAberto)}
        aria-label="Abrir menu"
      >
        {menuAberto ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Navegação + Ações */}
      <div
        className={`absolute top-20 left-0 w-full bg-white dark:bg-graphite-800 shadow-xl border-b border-slate-200 dark:border-graphite-600 md:static md:w-auto md:bg-transparent md:dark:bg-transparent md:shadow-none md:border-none flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-3 p-5 md:p-0 transition-all ${
          menuAberto ? "flex" : "hidden md:flex"
        }`}
      >
        {/* Nav links */}
        <nav className="flex flex-col md:flex-row gap-1 w-full md:w-auto">
          {token && (
            <>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-lime-spark text-graphite-900 font-bold shadow-[0_2px_12px_rgba(182,255,226,0.3)]"
                      : "text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 hover:text-slate-900 dark:hover:text-white"
                  }`
                }
              >
                <ArrowLeftRight size={17} /> Transações
              </NavLink>
              <NavLink
                to="/comparativo"
                className={({ isActive }) =>
                  `flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-lime-spark text-graphite-900 font-bold shadow-[0_2px_12px_rgba(182,255,226,0.3)]"
                      : "text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 hover:text-slate-900 dark:hover:text-white"
                  }`
                }
              >
                <LayoutDashboard size={17} /> Dashboard
              </NavLink>
              <NavLink
                to="/gastos-fixos"
                className={({ isActive }) =>
                  `flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-lime-spark text-graphite-900 font-bold shadow-[0_2px_12px_rgba(182,255,226,0.3)]"
                      : "text-slate-600 dark:text-graphite-300 hover:bg-slate-100 dark:hover:bg-graphite-700 hover:text-slate-900 dark:hover:text-white"
                  }`
                }
              >
                <CalendarDays size={17} /> Gastos Fixos
              </NavLink>
            </>
          )}
        </nav>

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
                {/* Avatar */}
                {profilePic ? (
                  <img
                    src={profilePic}
                    alt="Perfil"
                    className="w-7 h-7 rounded-full object-cover border-2 border-lime-spark shadow-xs shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-lime-spark/20 text-[#059669] dark:text-lime-spark font-extrabold flex items-center justify-center border border-lime-spark/40 text-xs shrink-0">
                    {getInitials(username)}
                  </div>
                )}
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {username}
                </span>
                <ChevronDown
                  size={15}
                  className={`hidden md:block text-slate-400 dark:text-graphite-400 transition-transform duration-200 ${
                    dropdownAberto ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Painel do dropdown */}
              {dropdownAberto && (
                <div className="hidden md:block absolute right-0 mt-2 w-52 bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200 dark:border-graphite-600 shadow-xl z-50 overflow-hidden animate-scale-in origin-top-right">
                  {/* Cabeçalho do dropdown */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-graphite-600">
                    <p className="text-xs font-semibold text-slate-500 dark:text-graphite-300 uppercase tracking-wide">
                      Conta
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                      {username}
                    </p>
                  </div>

                  {/* Item: Alternar tema */}
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
                    {/* Indicador visual do modo atual */}
                    <span className="ml-auto text-[0.65rem] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-graphite-700 text-slate-500 dark:text-graphite-300">
                      {theme === "dark" ? "DARK" : "LIGHT"}
                    </span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-graphite-600" />

                  {/* Item: Sair */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut size={16} className="shrink-0" />
                    Sair da conta
                  </button>
                </div>
              )}

              {/* Mobile: items expandidos diretamente (sem dropdown flutuante) */}
              <div className="md:hidden mt-2 flex flex-col gap-1 border-t border-slate-100 dark:border-graphite-600 pt-3">
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

export default App;
