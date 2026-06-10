import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import FormTransacao from "./FormTransacao";
import ListaTransacoes from "./ListaTransacoes";
import FiltroTransacoes from "./FiltroTransacoes";
import GerenciarCategorias from "./GerenciarCategorias";
import ModalEditar from "./ModalEditar";
import ModalEditarCategoria from "./ModalEditarCategoria";

function Dashboard() {
  const [transacoes, setTransacoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [transacaoParaEditar, setTransacaoParaEditar] = useState(null);
  const [categoriaParaEditar, setCategoriaParaEditar] = useState(null);

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
        Object.entries(filtros).filter(([_, v]) => v != null && v !== ""),
      ),
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
    if (token) fetchCategorias();
  }, [token]);
  useEffect(() => {
    if (token) fetchTransacoes();
  }, [token, filtros]);

  const handleSave = () => fetchTransacoes();
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
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 w-full">
      <div className="flex flex-col gap-8">
        <FormTransacao
          onTransacaoAdicionada={handleSave}
          categorias={categorias}
        />
        <GerenciarCategorias
          categorias={categorias}
          onCategoriaChange={handleCategoriaSaved}
          onEdit={setCategoriaParaEditar}
        />
      </div>
      <div className="flex flex-col gap-8">
        <FiltroTransacoes
          filtros={filtros}
          setFiltros={setFiltros}
          categorias={categorias}
        />

        {loading && (
          <p className="text-slate-500 text-center animate-pulse">
            Carregando transações...
          </p>
        )}
        {error && (
          <p className="text-red-500 bg-red-50 p-4 rounded-xl text-center border border-red-100">
            {error}
          </p>
        )}
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
