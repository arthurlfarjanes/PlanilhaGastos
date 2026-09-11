import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import {
  PlusCircle,
  Pencil,
  Trash2,
  CalendarDays,
  Tag,
  DollarSign,
  FileText,
  X,
  AlertCircle,
} from "lucide-react";
import ConfirmDialog from "./ui/ConfirmDialog";

export default function GerenciarGastosFixos() {
  const { token, API_URL } = useContext(AuthContext);
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [gastoEditando, setGastoEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gastoParaDeletar, setGastoParaDeletar] = useState(null);
  const [deletando, setDeletando] = useState(false);

  const carregarCategorias = async () => {
    try {
      const response = await fetch(`${API_URL}/categorias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setCategorias(data);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
    }
  };

  const carregarGastos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/gastos-fixos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setGastos(data);
      } else {
        setError(data.error || "Erro ao carregar gastos fixos.");
      }
    } catch (err) {
      setError("Erro de conexão ao buscar gastos fixos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      carregarCategorias();
      carregarGastos();
    }
  }, [token]);

  const limparFormulario = () => {
    setGastoEditando(null);
    setDescricao("");
    setValor("");
    setDiaVencimento("");
    setCategoriaId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descricao || !valor || !diaVencimento) {
      setError("Preencha descrição, valor e dia do vencimento.");
      return;
    }
    setLoading(true);
    setError("");

    const endpoint = gastoEditando
      ? `${API_URL}/gastos-fixos/${gastoEditando.id}`
      : `${API_URL}/gastos-fixos`;
    const method = gastoEditando ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          descricao,
          valor: parseFloat(valor),
          dia_vencimento: parseInt(diaVencimento),
          categoria_id: categoriaId || null,
        }),
      });

      if (response.ok) {
        limparFormulario();
        carregarGastos();
      } else {
        const errData = await response.json();
        setError(errData.error || "Erro ao salvar gasto fixo.");
      }
    } catch (error) {
      setError("Erro de conexão ao salvar gasto fixo.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditarClick = (gasto) => {
    setGastoEditando(gasto);
    setDescricao(gasto.descricao);
    setValor(gasto.valor);
    setDiaVencimento(gasto.dia_vencimento);
    setCategoriaId(gasto.categoria_id || "");
    setError("");
  };

  const confirmarExcluir = async () => {
    if (!gastoParaDeletar) return;
    setDeletando(true);
    try {
      const response = await fetch(
        `${API_URL}/gastos-fixos/${gastoParaDeletar}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        setGastoParaDeletar(null);
        carregarGastos();
      }
    } catch (error) {
      console.error("Erro ao deletar gasto fixo:", error);
    } finally {
      setDeletando(false);
    }
  };

  // Estilos reutilizáveis alinhados com a paleta Lime Spark + Graphite
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2E3342] bg-slate-50 dark:bg-[#14171F] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-[#8E9AA8] focus:outline-none focus:ring-2 focus:ring-[#B6FFE2]/40 focus:border-[#B6FFE2] dark:focus:border-[#B6FFE2] transition-all text-sm";

  const labelClass =
    "text-xs font-semibold text-slate-500 dark:text-[#8E9AA8] flex items-center gap-1 mb-1.5";

  const totalMensal = gastos.reduce(
    (acc, g) => acc + parseFloat(g.valor || 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-graphite-800 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-graphite-600 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-lime-spark/15 dark:bg-lime-spark/10 text-[#059669] dark:text-lime-spark flex items-center justify-center border border-lime-spark/30">
              <CalendarDays size={22} />
            </span>
            Gastos Fixos
          </h1>
          <p className="text-sm text-slate-500 dark:text-graphite-300 mt-1 ml-12.5">
            Despesas recorrentes mensais cadastradas
          </p>
        </div>
        {/* Resumo total */}
        {gastos.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl border border-red-100 dark:border-red-500/20">
            <DollarSign
              size={18}
              className="text-red-500 dark:text-red-400 shrink-0"
            />
            <div>
              <p className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide">
                Total/mês
              </p>
              <p className="text-lg font-black text-red-600 dark:text-red-400">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalMensal)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alerta de erro */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-500/20">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Formulário de Cadastro/Edição */}
      <div
        className={`bg-white dark:bg-graphite-800 p-5 sm:p-6 rounded-2xl border shadow-xs transition-all ${
          gastoEditando
            ? "border-blue-300 dark:border-blue-500/40"
            : "border-slate-200/80 dark:border-graphite-600"
        }`}
      >
        <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-5 flex items-center gap-2">
          {gastoEditando ? (
            <>
              <Pencil size={18} className="text-blue-500" />
              Editar Gasto Fixo
            </>
          ) : (
            <>
              <PlusCircle
                size={18}
                className="text-[#059669] dark:text-lime-spark"
              />
              Novo Gasto Fixo
            </>
          )}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-6 gap-4"
        >
          {/* Descrição */}
          <div className="flex flex-col md:col-span-2">
            <label className={labelClass}>
              <FileText size={13} /> Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Aluguel, Internet..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Valor */}
          <div className="flex flex-col">
            <label className={labelClass}>
              <DollarSign size={13} /> Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Vencimento */}
          <div className="flex flex-col">
            <label className={labelClass}>
              <CalendarDays size={13} /> Dia Vcto.
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 10"
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Categoria */}
          <div className="flex flex-col md:col-span-1">
            <label className={labelClass}>
              <Tag size={13} /> Categoria
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className={inputClass + " cursor-pointer"}
            >
              <option value="">Sem Categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Botões */}
          <div className="flex items-end gap-2 md:col-span-1">
            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                gastoEditando
                  ? "bg-blue-500 hover:bg-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]"
                  : "bg-lime-spark hover:bg-lime-spark-hover text-graphite-900 shadow-[0_4px_12px_rgba(182,255,226,0.3)]"
              }`}
            >
              {loading ? "Salvando..." : gastoEditando ? "Salvar" : "Adicionar"}
            </button>

            {gastoEditando && (
              <button
                type="button"
                onClick={limparFormulario}
                className="bg-slate-100 dark:bg-graphite-700 hover:bg-slate-200 dark:hover:bg-graphite-600 text-slate-600 dark:text-slate-300 p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer hover:-translate-y-0.5 border border-slate-200 dark:border-graphite-600"
                title="Cancelar Edição"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tabela de Listagem */}
      <div className="bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200/80 dark:border-graphite-600 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-graphite-600 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-200">
            Gastos Fixos Cadastrados
          </h2>
          {gastos.length > 0 && (
            <span className="text-xs font-bold text-slate-400 dark:text-graphite-300 bg-slate-100 dark:bg-graphite-700 px-2.5 py-1 rounded-full">
              {gastos.length} item{gastos.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-graphite-900/60 border-b border-slate-100 dark:border-graphite-600 text-slate-400 dark:text-graphite-400 text-xs uppercase tracking-wider font-bold">
                <th className="py-3.5 px-5">Vencimento</th>
                <th className="py-3.5 px-5">Descrição</th>
                <th className="py-3.5 px-5">Categoria</th>
                <th className="py-3.5 px-5">Valor</th>
                <th className="py-3.5 px-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-graphite-600 text-sm">
              {loading && gastos.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="py-10 text-center text-slate-400 dark:text-graphite-300"
                  >
                    <p className="animate-pulse">Carregando...</p>
                  </td>
                </tr>
              ) : gastos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-graphite-300">
                      <CalendarDays size={30} className="opacity-40" />
                      <p className="font-medium">
                        Nenhum gasto fixo cadastrado.
                      </p>
                      <p className="text-xs">
                        Use o formulário acima para adicionar.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                gastos.map((gasto) => (
                  <tr
                    key={gasto.id}
                    className="hover:bg-slate-50 dark:hover:bg-graphite-900/40 transition-colors"
                  >
                    {/* Vencimento */}
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-lime-spark/15 dark:bg-lime-spark/10 text-[#059669] dark:text-lime-spark text-xs font-bold border border-lime-spark/30">
                        <CalendarDays size={12} />
                        Dia {gasto.dia_vencimento}
                      </span>
                    </td>

                    {/* Descrição */}
                    <td className="py-4 px-5 font-semibold text-slate-800 dark:text-slate-100">
                      {gasto.descricao}
                    </td>

                    {/* Categoria */}
                    <td className="py-4 px-5">
                      {gasto.categoria_nome ? (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm inline-block"
                          style={{
                            backgroundColor: gasto.categoria_cor || "#10b981",
                          }}
                        >
                          {gasto.categoria_nome}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-graphite-300 text-xs italic">
                          Sem categoria
                        </span>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="py-4 px-5 font-black text-red-500 dark:text-red-400">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(parseFloat(gasto.valor))}
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditarClick(gasto)}
                          className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white transition-all hover:scale-110 border border-blue-200/60 dark:border-blue-500/20 cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setGastoParaDeletar(gasto.id)}
                          className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all hover:scale-110 border border-red-200/60 dark:border-red-500/20 cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ConfirmDialog de exclusão */}
      <ConfirmDialog
        isOpen={!!gastoParaDeletar}
        onClose={() => setGastoParaDeletar(null)}
        onConfirm={confirmarExcluir}
        loading={deletando}
        title="Remover Gasto Fixo"
        message="Tem certeza que deseja remover este gasto fixo? Esta ação não pode ser desfeita."
        confirmText="Sim, remover"
      />
    </div>
  );
}
