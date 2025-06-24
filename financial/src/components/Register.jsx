// src/components/Register.js
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../App";

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { API_URL } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao registrar.");
      }

      setMessage(
        "Usuário registrado com sucesso! Você pode fazer login agora."
      );
      // Opcional: Redirecionar para o login após o registro
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error("Erro de registro:", err);
      setError(err.message || "Falha no registro. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <h2>Registrar</h2>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
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
          "Registrar"
        )}
      </button>
      </form>
    </div>
  );
}

export default Register;
