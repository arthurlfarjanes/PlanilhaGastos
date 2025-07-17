import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";

import FormTransacao from "./FormTransacao";
import ListaTransacoes from "./ListaTransacoes";
import FiltroTransacoes from "./FiltroTransacoes";
import GerenciarCategorias from "./GerenciarCategorias";
import ModalEditar from "./ModalEditar";
import ModalEditarCategoria from "./ModalEditarCategoria"; // Importa o novo modal

function Dashboard() {
  const [transacoes, setTransacoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estados para os modais
  const [transacaoParaEditar, setTransacaoParaEditar] = useState(null);
  const [categoriaParaEditar, setCategoriaParaEditar] = useState(null); // Novo estado

  const [filtros, setFiltros] = useState({
    descricao: "",
    tipo: "",
    categoriaId: "",
    dataInicio: "",
    dataFim: "",
  });

  const { token, API_URL } = useContext(AuthContext);

  const fetchCategorias = async () => {
    try {
      const response = await fetch(`${API_URL}/categorias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Falha ao buscar categorias");
      setCategorias(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchTransacoes = async () => {
    setLoading(true);
    setError("");
    const queryParams = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filtros).filter(([_, v]) => v != null && v !== "")
      )
    ).toString();

    try {
      const response = await fetch(`${API_URL}/transacoes?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Falha ao buscar transações");
      setTransacoes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCategorias();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchTransacoes();
    }
  }, [token, filtros]);

  const handleSave = () => {
    fetchTransacoes();
  };

  // Função para atualizar a lista de categorias e transações após editar uma categoria
  const handleCategoriaSaved = () => {
    fetchCategorias();
    fetchTransacoes();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja deletar esta transação?"))
      return;
    try {
      await fetch(`${API_URL}/transacoes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTransacoes();
      alert("Transação deletada com sucesso!");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="dashboard">
      <div className="coluna-forms">
        <FormTransacao
          onTransacaoAdicionada={handleSave}
          categorias={categorias}
        />
        <hr />
        <GerenciarCategorias
          categorias={categorias}
          onCategoriaChange={fetchCategorias}
          onEdit={setCategoriaParaEditar} // Passa a função para abrir o modal
        />
      </div>
      <div className="coluna-transacoes">
        <FiltroTransacoes
          filtros={filtros}
          setFiltros={setFiltros}
          categorias={categorias}
        />
        {loading && <p>Carregando transações...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && (
          <ListaTransacoes
            transacoes={transacoes}
            onEdit={setTransacaoParaEditar}
            onDelete={handleDelete}
          />
        )}
      </div>
      {transacaoParaEditar && (
        <ModalEditar
          transacao={transacaoParaEditar}
          onClose={() => setTransacaoParaEditar(null)}
          onSave={handleSave}
          categorias={categorias}
        />
      )}
      {/* Renderiza o novo modal se uma categoria for selecionada para edição */}
      {categoriaParaEditar && (
        <ModalEditarCategoria
          categoria={categoriaParaEditar}
          onClose={() => setCategoriaParaEditar(null)}
          onSave={handleCategoriaSaved}
        />
      )}
    </div>
  );
}

export default Dashboard;
