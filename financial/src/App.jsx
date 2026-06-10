import React, { useState, createContext, useContext, useEffect } from "react";
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
} from "lucide-react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Comparativo from "./components/Comparativo";
import "./index.css";

export const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username"));
  const [profilePic, setProfilePic] = useState(
    localStorage.getItem("profilePic"),
  );

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
      <AuthContext.Provider
        value={{ token, username, profilePic, login, logout, API_URL }}
      >
        <Router>
          <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
            <Header />
            <main className="grow p-6 md:p-8 w-full mx-auto">
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
              </Routes>
            </main>
          </div>
        </Router>
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

function Header() {
  const { token, username, profilePic, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuAberto(false);
    navigate("/login");
  };
  useEffect(() => {
    setMenuAberto(false);
  }, [location]);

  // Função para pegar as iniciais (ex: "Arthur" -> "AR")
  const getInitials = (name) => {
    if (!name) return "U";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 h-20 bg-white/85 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="logo">
        <Link
          to="/"
          className="font-extrabold text-2xl text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-2"
        >
          <Wallet size={24} /> MeFinance
        </Link>
      </div>

      <button
        className="md:hidden text-slate-700"
        onClick={() => setMenuAberto(!menuAberto)}
      >
        {menuAberto ? <X size={28} /> : <Menu size={28} />}
      </button>

      <div
        className={`absolute top-20 left-0 w-full bg-white shadow-lg border-b border-slate-200 md:static md:w-auto md:bg-transparent md:shadow-none md:border-none flex flex-col md:flex-row items-start md:items-center gap-6 p-6 md:p-0 transition-all ${menuAberto ? "flex" : "hidden md:flex"}`}
      >
        <nav className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          {token && (
            <>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 font-semibold text-[0.95rem] px-5 py-2.5 rounded-full transition-colors ${isActive ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"}`
                }
              >
                <ArrowLeftRight size={18} /> Transações
              </NavLink>
              <NavLink
                to="/comparativo"
                className={({ isActive }) =>
                  `flex items-center gap-2 font-semibold text-[0.95rem] px-5 py-2.5 rounded-full transition-colors ${isActive ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"}`
                }
              >
                <LayoutDashboard size={18} /> Dashboard
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {!token ? (
            <>
              <Link
                to="/login"
                className="flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors w-full md:w-auto justify-center"
              >
                <LogIn size={18} /> Login
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 font-semibold px-6 py-2.5 rounded-xl bg-emerald-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:bg-emerald-600 hover:-translate-y-0.5 transition-all w-full md:w-auto justify-center"
              >
                <UserPlus size={18} /> Registrar
              </Link>
            </>
          ) : (
            <>
              {/* COMPONENTE DO AVATAR */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                {profilePic ? (
                  <img
                    src={profilePic}
                    alt="Perfil"
                    className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center border-2 border-emerald-200 shadow-sm text-xs">
                    {getInitials(username)}
                  </div>
                )}
                <span className="font-semibold text-slate-700 text-sm hidden sm:block pr-2">
                  {username}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all w-full md:w-auto justify-center"
              >
                <LogOut size={18} /> Sair
              </button>
            </>
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
