import React, { useState, useContext } from "react";
import { AuthContext } from "../App";
import "./Modal.css"; // Reutilizaremos o CSS do outro modal

function ModalEditarCategoria({ categoria, onClose, onSave }) {
  const [nome, setNome] = useState(categoria.nome);
  const { token, API_URL } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/categorias/${categoria.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Erro ao salvar categoria");
      onSave(data); // Atualiza a lista no Dashboard
      onClose(); // Fecha o modal
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      alert(error.message);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Editar Categoria</h2>
        <form onSubmit={handleSubmit}>
          <label>Nome da Categoria:</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <div className="modal-actions">
            <button type="submit">Salvar</button>
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalEditarCategoria;
