import React, { useState, useContext } from "react";
import { AuthContext } from "../App";

const getTodayDateString = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const todayWithOffset = new Date(today.getTime() - offset * 60 * 1000);
  return todayWithOffset.toISOString().split("T")[0];
};

function FormularioTransacao({ onTransacaoAdicionada, categorias }) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("despesa");
  const [data, setData] = useState(getTodayDateString());
  const [categoriaId, setCategoriaId] = useState("");

  const [ehParcelado, setEhParcelado] = useState(false);
  const [parcelas, setParcelas] = useState(2);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { token, API_URL } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (tipo === "despesa" && !categoriaId) {
      setError("Por favor, selecione uma categoria para a despesa.");
      return;
    }
    if (ehParcelado && parcelas <= 1) {
      setError("O número de parcelas deve ser maior que 1.");
      return;
    }

    setLoading(true);

    const endpoint = ehParcelado
      ? `${API_URL}/transacoes/parcelada`
      : `${API_URL}/transacoes`;

    const transacaoData = {
      descricao,
      valor: parseFloat(valor),
      tipo,
      data,
      categoria_id: tipo === "despesa" ? parseInt(categoriaId) : null,
      ...(ehParcelado && { parcelas: parseInt(parcelas) }),
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
      if (!response.ok)
        throw new Error(dataAdicionada.error || "Erro ao processar transação");

      onTransacaoAdicionada();
      alert(dataAdicionada.message || "Transação adicionada com sucesso!");

      // Limpa formulário, mas mantém a data de hoje
      setDescricao("");
      setValor("");
      setTipo("despesa");
      setData(getTodayDateString()); // Reseta para a data de hoje
      setCategoriaId("");
      setEhParcelado(false);
      setParcelas(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-transacao">
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
        <select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            setCategoriaId("");
            setEhParcelado(false);
          }}
          required
        >
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
      </div>

      {tipo === "despesa" && (
        <>
          <div>
            <label>Categoria:</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
            >
              <option value="" disabled>
                Selecione uma categoria
              </option>
              {categorias.length > 0 ? (
                categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))
              ) : (
                <option disabled>Cadastre uma categoria</option>
              )}
            </select>
          </div>

          <div className="checkbox-container">
            <input
              id="parcelado-checkbox"
              type="checkbox"
              checked={ehParcelado}
              onChange={(e) => setEhParcelado(e.target.checked)}
            />
            <label htmlFor="parcelado-checkbox">É uma compra parcelada?</label>
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
        <label>
          {ehParcelado ? "Data da Primeira Parcela:" : "Data da Transação:"}
        </label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>

      <button disabled={loading} type="submit">
        {loading ? "Processando..." : "Adicionar Transação"}
      </button>
    </form>
  );
}

export default FormularioTransacao;
