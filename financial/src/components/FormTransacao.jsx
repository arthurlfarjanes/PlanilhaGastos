// src/components/FormTransacao.jsx
import React, { useState, useContext } from "react";
import { AuthContext } from "../App";

function FormularioTransacao({ onTransacaoAdicionada }) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("despesa");
  const [data, setData] = useState("");
  const [categoria, setCategoria] = useState("Lazer"); // Categoria padrão
  const [ehParcelado, setEhParcelado] = useState(false); // Novo estado
  const [parcelas, setParcelas] = useState(2); // Novo estado

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { token, API_URL } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (
      !descricao ||
      !valor ||
      !tipo ||
      !data ||
      (tipo === "despesa" && !categoria)
    ) {
      setError("Por favor, preencha todos os campos obrigatórios!");
      setLoading(false);
      return;
    }
    if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
      setError("O valor deve ser um número positivo!");
      setLoading(false);
      return;
    }
    if (ehParcelado && (isNaN(parseInt(parcelas)) || parseInt(parcelas) <= 1)) {
      setError("O número de parcelas deve ser maior que 1.");
      setLoading(false);
      return;
    }

    const endpoint = ehParcelado
      ? `${API_URL}/transacoes/parcelada`
      : `${API_URL}/transacoes`;

    const transacaoData = {
      descricao,
      valor: parseFloat(valor),
      tipo,
      data,
      ...(tipo === "despesa" && { categoria }), // Adiciona categoria se for despesa
      ...(ehParcelado && { parcelas: parseInt(parcelas) }), // Adiciona parcelas se for compra parcelada
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transacaoData),
      });

      const dataAdicionada = await response.json();

      if (!response.ok) {
        throw new Error(
          dataAdicionada.error || `HTTP error! status: ${response.status}`
        );
      }

      onTransacaoAdicionada(dataAdicionada);
      alert("Transação adicionada com sucesso!");

      // Limpa o formulário
      setDescricao("");
      setValor("");
      setTipo("despesa");
      setData("");
      setCategoria("Lazer");
      setEhParcelado(false);
      setParcelas(2);
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
        <label>Valor (Total):</label>
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

      {tipo === "despesa" && (
        <>
          <div>
            <label>Categoria:</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
            >
              <option value="Lazer">Lazer</option>
              <option value="Casa">Casa</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Transporte">Transporte</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              id="parcelado"
              checked={ehParcelado}
              onChange={(e) => setEhParcelado(e.target.checked)}
              style={{ width: "auto", marginRight: "10px" }}
            />
            <label htmlFor="parcelado" style={{ marginBottom: "0" }}>
              Compra Parcelada?
            </label>
          </div>

          {ehParcelado && (
            <div>
              <label>Número de Parcelas:</label>
              <input
                type="number"
                min="2"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                required
              />
            </div>
          )}
        </>
      )}

      <div>
        <label>Data da Transação/Primeira Parcela:</label>
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
          "Adicionar Transação"
        )}
      </button>
    </form>
  );
}

export default FormularioTransacao;
