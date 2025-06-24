// src/components/FormularioTransacao.js
import React, { useState, useContext } from "react";
import { AuthContext } from "../App";

function FormularioTransacao({ onTransacaoAdicionada }) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("despesa"); // Padrão para despesa
  const [data, setData] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { token, API_URL } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validação
    if (!descricao || !valor || !tipo || !data) {
      setError("Por favor, preencha todos os campos!");
      return;
    }
    if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
      setError("O valor deve ser um número positivo!");
      return;
    }

    const novaTransacao = {
      descricao,
      valor: parseFloat(valor),
      tipo,
      data,
    };

    try {
      const response = await fetch(`${API_URL}/transacoes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Envia o token JWT
        },
        body: JSON.stringify(novaTransacao),
      });

      const dataAdicionada = await response.json();

      if (!response.ok) {
        throw new Error(
          dataAdicionada.error || `HTTP error! status: ${response.status}`
        );
      }

      onTransacaoAdicionada(dataAdicionada); // Chama a função para atualizar a lista
      alert("Transação adicionada com sucesso!");

      // Limpa o formulário
      setDescricao("");
      setValor("");
      setTipo("despesa");
      setData("");
    } catch (err) {
      console.error("Erro ao adicionar transação:", err);
      setError(
        err.message ||
          "Não foi possível adicionar a transação. Verifique o console."
      );
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Adicionar Nova Transação</h3>
      {error && <p className="error">{error}</p>}
      <div>
        <label>Descrição:</label>
        <input
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Valor:</label>
        <input
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Tipo:</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
      </div>
      <div>
        <label>Data:</label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>
      <button style={{ marginBottom: "15px" }} disabled={loading} type="submit">
        {loading ? (
          <div className="align-spinner">
            <div className="spinner" />
          </div>
        ) : (
          "Adicionar Transição"
        )}
      </button>
    </form>
  );
}

export default FormularioTransacao;
