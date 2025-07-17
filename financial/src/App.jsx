import React, { useState, createContext, useContext, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation, // Importar o useLocation
} from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Comparativo from "./components/Comparativo";
import "./App.css";
import "./components/Modal.css";

export const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username"));

  const login = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", newUsername);
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  };

  return (
    <AuthContext.Provider value={{ token, username, login, logout, API_URL }}>
      <Router>
        <div className="App-container">
          <Header />
          <main className="content">
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
  );
}

// =================================================================
// COMPONENTE HEADER ATUALIZADO COM LÓGICA DE MENU RESPONSIVO
// =================================================================
function Header() {
  const { token, username, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation(); // Hook para saber a página atual

  // Estado para controlar a visibilidade do menu mobile
  const [menuAberto, setMenuAberto] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuAberto(false); // Fecha o menu ao deslogar
    navigate("/login");
  };

  // Efeito para fechar o menu ao navegar para outra página
  useEffect(() => {
    setMenuAberto(false);
  }, [location]);

  return (
    <header>
      <div className="logo">
        <Link to="/">MeFinance</Link>
      </div>

      {/* Botão Hambúrguer - visível apenas em telas pequenas */}
      <button
        className="menu-hamburger"
        onClick={() => setMenuAberto(!menuAberto)}
      >
        <span className="hamburguer-linha"></span>
        <span className="hamburguer-linha"></span>
        <span className="hamburguer-linha"></span>
      </button>

      {/* Container do menu - a classe 'aberto' controla a visibilidade */}
      <div className={`menu-container ${menuAberto ? "aberto" : ""}`}>
        <nav>
          {token && (
            <>
              <Link to="/">Dashboard</Link>
              <Link to="/comparativo">Comparativo</Link>
            </>
          )}
        </nav>
        <div className="user-area">
          {!token ? (
            <>
              <Link to="/login" className="btn-login">
                Login
              </Link>
              <Link to="/register" className="btn-register">
                Registrar
              </Link>
            </>
          ) : (
            <>
              <span>Olá, {username}!</span>
              <button onClick={handleLogout} className="btn-sair">
                Sair
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
// =================================================================

function PrivateRoute({ children }) {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  return token ? children : null;
}

export default App;
