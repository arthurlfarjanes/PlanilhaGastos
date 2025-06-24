// src/App.js
import React, { useState, createContext, useContext, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import ListaTransacoes from "./components/ListaTransacoes";
import FormTransacao from "./components/FormTransacao";
import Login from "./components/Login";
import Register from "./components/Register";
import Comparativo from "./components/Comparativo"; // Novo componente
import "./App.css"; // Mantenha ou remova se não for usar estilos

// --- Contexto de Autenticação ---
// Usaremos um contexto para compartilhar o estado de autenticação entre componentes
export const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [token, setToken] = useState(localStorage.getItem("token")); // Tenta pegar o token do localStorage
  const [username, setUsername] = useState(localStorage.getItem("username")); // Tenta pegar o username

  // Função para fazer login e salvar o token
  const login = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem("token", newToken); // Salva no localStorage para persistir o login
    localStorage.setItem("username", newUsername);
  };

  // Função para fazer logout e remover o token
  const logout = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  };

  return (
    <AuthContext.Provider value={{ token, username, login, logout, API_URL }}>
      <Router>
        <div className="App">
          <Header /> {/* Componente de cabeçalho com navegação */}
          <div className="content">
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
              {/* Página inicial protegida */}
              <Route
                path="/comparativo"
                element={
                  <PrivateRoute>
                    <Comparativo />
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

// --- Componente de Cabeçalho (Navegação) ---
function Header() {
  const { token, username, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login"); // Redireciona para a tela de login após o logout
  };

  return (
    <header>
      <div>
        <Link to="/" style={{ marginRight: "15px" }}>
          Início
        </Link>
        {token && <Link to="/comparativo">Comparativo</Link>}
      </div>
      <nav>
        {!token ? (
          <>
            <Link to="/login" style={{ marginRight: "10px" }}>
              Login
            </Link>
            <Link to="/register">Registrar</Link>
          </>
        ) : (
          <>
            <span>Olá, {username}!</span>
            <button onClick={handleLogout}>Sair</button>
          </>
        )}
      </nav>
    </header>
  );
}

// --- Componente de Rota Privada ---
// Este componente garante que apenas usuários logados possam acessar certas rotas
function PrivateRoute({ children }) {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login"); // Redireciona para login se não houver token
    }
  }, [token, navigate]);

  return token ? children : null; // Só renderiza os filhos se houver token
}

// --- Componente Dashboard (Página Inicial com Formulário e Lista) ---
function Dashboard() {
  const [atualizarLista, setAtualizarLista] = useState(0); // Estado para forçar a atualização

  const handleTransacaoAdicionada = (novaTransacao) => {
    setAtualizarLista((prev) => prev + 1); // Força a ListaTransacoes a recarregar
  };

  return (
    <div style={{ padding: "20px" }}>
      <FormTransacao onTransacaoAdicionada={handleTransacaoAdicionada} />
      <hr/>
      <ListaTransacoes key={atualizarLista} /> {/* Key para forçar re-render */}
    </div>
  );
}

export default App;
