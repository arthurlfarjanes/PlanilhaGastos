// src/components/Login.js
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../App"; // Importa o contexto de autenticação

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, API_URL } = useContext(AuthContext); // Pega a função login e API_URL do contexto
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // Limpa erros anteriores

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao fazer login.");
      }

      login(data.token, username); // Chama a função login do contexto
      navigate("/"); // Redireciona para a página inicial após o login
    } catch (err) {
      console.error("Erro de login:", err);
      setError(err.message || "Falha no login. Verifique suas credenciais.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Usuário:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Senha:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button disabled={loading} type="submit">
          {loading ? (
            <div className="align-spinner">
              <div className="spinner" />
            </div>
          ) : (
            "Entrar"
          )}
        </button>
      </form>
    </div>
  );
}

export default Login;
