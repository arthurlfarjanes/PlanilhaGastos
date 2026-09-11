import React, { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../App";
import FormTransacao from "./FormTransacao";
import ListaTransacoes from "./ListaTransacoes";
import FiltroTransacoes from "./FiltroTransacoes";
import GerenciarCategorias from "./GerenciarCategorias";
import ModalEditar from "./ModalEditar";
import ModalEditarCategoria from "./ModalEditarCategoria";
import ConfirmDialog from "./ui/ConfirmDialog";
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    parseFloat(value) || 0,
  );

function Dashboard() {
  const [transacoes, setTransacoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [transacaoParaEditar, setTransacaoParaEditar] = useState(null);
  const [categoriaParaEditar, setCategoriaParaEditar] = useState(null);
  const [transacaoParaDeletar, setTransacaoParaDeletar] = useState(null);
  const [deletando, setDeletando] = useState(false);

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

  const confirmarDeletar = async () => {
    if (!transacaoParaDeletar) return;
    setDeletando(true);
    try {
      const res = await fetch(`${API_URL}/transacoes/${transacaoParaDeletar}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erro ao deletar transação.");
      }
      setTransacaoParaDeletar(null);
      fetchTransacoes();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletando(false);
    }
  };

  // Cálculo de resumo instantâneo das transações exibidas
  const resumo = useMemo(() => {
    let rec = 0;
    let desp = 0;
    transacoes.forEach((t) => {
      const val = parseFloat(t.valor) || 0;
      if (t.tipo === "receita") rec += val;
      else if (t.tipo === "despesa") desp += val;
    });
    return {
      receitas: rec,
      despesas: desp,
      balanco: rec - desp,
    };
  }, [transacoes]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full">
      {/* 1. Barra de Estatísticas Rápidas no Topo (UX Booster) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Receitas */}
        <div className="bg-white dark:bg-[#1E222B] p-5 rounded-2xl border border-slate-200/80 dark:border-[#2E3342] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8E9AA8]">
              Receitas Filtradas
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-[#B6FFE2] mt-1">
              {formatCurrency(resumo.receitas)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-[#B6FFE2]/10 text-emerald-600 dark:text-[#B6FFE2] flex items-center justify-center border border-emerald-200/50 dark:border-[#B6FFE2]/20">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white dark:bg-[#1E222B] p-5 rounded-2xl border border-slate-200/80 dark:border-[#2E3342] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8E9AA8]">
              Despesas Filtradas
            </span>
            <p className="text-xl sm:text-2xl font-black text-red-500 dark:text-red-400 mt-1">
              {formatCurrency(resumo.despesas)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center border border-red-200/50 dark:border-red-500/20">
            <TrendingDown size={22} />
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-white dark:bg-[#1E222B] p-5 rounded-2xl border border-slate-200/80 dark:border-[#2E3342] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8E9AA8]">
              Saldo do Extrato
            </span>
            <p
              className={`text-xl sm:text-2xl font-black mt-1 ${
                resumo.balanco >= 0
                  ? "text-emerald-600 dark:text-[#B6FFE2]"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {formatCurrency(resumo.balanco)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#14171F] text-slate-700 dark:text-[#B6FFE2] flex items-center justify-center border border-slate-200 dark:border-[#2E3342]">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* 2. Grid de Conteúdo: Formulários à esquerda, Extrato à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 sm:gap-8 w-full items-start">
        {/* Painel Esquerdo */}
        <div className="flex flex-col gap-6 sm:gap-8">
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

        {/* Painel Direito: Filtros e Lista */}
        <div className="flex flex-col gap-6 sm:gap-8">
          <FiltroTransacoes
            filtros={filtros}
            setFiltros={setFiltros}
            categorias={categorias}
          />

          {loading && (
            <div className="bg-white dark:bg-[#1E222B] rounded-2xl p-8 text-center border border-slate-200/80 dark:border-[#2E3342]">
              <p className="text-slate-500 dark:text-[#8E9AA8] animate-pulse font-medium">
                Carregando transações...
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-500/20">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <ListaTransacoes
              transacoes={transacoes}
              onEdit={setTransacaoParaEditar}
              onDelete={(id) => setTransacaoParaDeletar(id)}
            />
          )}
        </div>
      </div>

      {/* Modais de Edição */}
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

      {/* Modal de Confirmação de Exclusão (Substitui window.confirm) */}
      <ConfirmDialog
        isOpen={!!transacaoParaDeletar}
        onClose={() => setTransacaoParaDeletar(null)}
        onConfirm={confirmarDeletar}
        loading={deletando}
        title="Excluir Transação"
        message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
        confirmText="Sim, excluir"
      />
    </div>
  );
}

export default Dashboard;
