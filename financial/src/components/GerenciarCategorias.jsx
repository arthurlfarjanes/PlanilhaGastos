import React, { useState, useContext } from "react";
import { AuthContext } from "../App";

function GerenciarCategorias({ categorias, onCategoriaChange }) {
  const [novaCategoria, setNovaCategoria] = useState("");
  const { token, API_URL } = useContext(AuthContext);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    try {
      const response = await fetch(`${API_URL}/categorias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: novaCategoria }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Erro ao adicionar categoria");
      onCategoriaChange();
      setNovaCategoria("");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Atenção: as transações associadas a esta categoria não serão excluídas, mas ficarão 'sem categoria'. Deseja continuar?"
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`${API_URL}/categorias/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Erro ao deletar categoria");
      onCategoriaChange();
      alert("Categoria deletada.");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="categorias-container">
      <h3>Gerenciar Categorias</h3>
      <form onSubmit={handleAdd} className="add-categoria">
        <input
          type="text"
          value={novaCategoria}
          onChange={(e) => setNovaCategoria(e.target.value)}
          placeholder="Nome da nova categoria"
        />
        <button type="submit">Adicionar</button>
      </form>
      <ul className="lista-categorias">
        {categorias.map((cat) => (
          <li key={cat.id}>
            <span>{cat.nome}</span>
            <button
              onClick={() => handleDelete(cat.id)}
              className="btn-excluir-cat"
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GerenciarCategorias;
