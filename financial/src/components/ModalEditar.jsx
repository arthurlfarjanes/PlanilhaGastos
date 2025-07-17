import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import "./Modal.css";

function ModalEditar({ transacao, onClose, onSave, categorias }) {
  const [formData, setFormData] = useState({
    ...transacao,
    data: transacao.data.split("T")[0],
  });
  const { token, API_URL } = useContext(AuthContext);

  useEffect(() => {
    // Formata a data para o input tipo 'date'
    const dataFormatada = transacao.data ? transacao.data.split("T")[0] : "";
    setFormData({ ...transacao, data: dataFormatada });
  }, [transacao]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/transacoes/${transacao.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          valor: parseFloat(formData.valor),
          categoria_id:
            formData.tipo === "despesa"
              ? parseInt(formData.categoria_id)
              : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao salvar");
      onSave(data);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert(error.message);
    }
  };

  if (!transacao) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Editar Transação</h2>
        <form onSubmit={handleSubmit}>
          <label>Descrição:</label>
          <input
            type="text"
            name="descricao"
            value={formData.descricao || ""}
            onChange={handleChange}
            required
          />

          <label>Valor:</label>
          <input
            type="number"
            step="0.01"
            name="valor"
            value={formData.valor || ""}
            onChange={handleChange}
            required
          />

          <label>Data:</label>
          <input
            type="date"
            name="data"
            value={formData.data || ""}
            onChange={handleChange}
            required
          />

          <label>Tipo:</label>
          <select
            name="tipo"
            value={formData.tipo || "despesa"}
            onChange={handleChange}
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>

          {formData.tipo === "despesa" && (
            <>
              <label>Categoria:</label>
              <select
                name="categoria_id"
                value={formData.categoria_id || ""}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Selecione
                </option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="modal-actions">
            <button type="submit">Salvar Alterações</button>
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalEditar;
