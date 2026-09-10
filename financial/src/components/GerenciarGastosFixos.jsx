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
} from "lucide-react";

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

  // Buscar categorias do usuário
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

  // Buscar gastos fixos cadastrados
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

  // Limpar formulário e estado de edição
  const limparFormulario = () => {
    setGastoEditando(null);
    setDescricao("");
    setValor("");
    setDiaVencimento("");
    setCategoriaId("");
  };

  // Cadastrar ou Editar gasto fixo
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descricao || !valor || !diaVencimento) {
      alert("Preencha descrição, valor e dia do vencimento.");
      return;
    }

    setLoading(true);

    const endpoint = gastoEditando
      ? `${API_URL}/gastos-fixos/${gastoEditando.id}`
      : `${API_URL}/gastos-fixos`;
    const method = gastoEditando ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method: method,
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
        alert(errData.error || "Erro ao salvar gasto fixo.");
      }
    } catch (error) {
      console.error("Erro ao salvar gasto fixo:", error);
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
  };

  // Excluir gasto fixo
  const handleExcluir = async (id) => {
    if (!window.confirm("Deseja realmente remover este gasto fixo?")) return;

    try {
      const response = await fetch(`${API_URL}/gastos-fixos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        carregarGastos();
      }
    } catch (error) {
      console.error("Erro ao deletar gasto fixo:", error);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="text-emerald-500" size={28} />{" "}
            Gerenciamento de Gastos Fixos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre suas despesas recorrentes mensais para melhor controle
            financeiro.
          </p>
        </div>
      </div>

      {/* Formulário de Cadastro/Edição */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          {gastoEditando ? (
            <>
              <Pencil size={20} className="text-blue-500" /> Editar Gasto Fixo
            </>
          ) : (
            <>
              <PlusCircle size={20} className="text-emerald-500" /> Novo Gasto
              Fixo
            </>
          )}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-6 gap-4"
        >
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <FileText size={14} /> Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Aluguel, Internet..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 transition-colors text-sm bg-slate-50/50 cursor-text"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <DollarSign size={14} /> Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 transition-colors text-sm bg-slate-50/50 cursor-text"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <CalendarDays size={14} /> Vencimento
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 10"
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 transition-colors text-sm bg-slate-50/50 cursor-text"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Tag size={14} /> Categoria
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 transition-colors text-sm bg-slate-50/50 cursor-pointer"
            >
              <option value="">Sem Categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2 md:col-span-1">
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-semibold py-2.5 px-4 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.25)] transition-all flex items-center justify-center gap-2 text-sm h-10.5 cursor-pointer hover:-translate-y-0.5 ${
                gastoEditando
                  ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/25"
                  : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25"
              }`}
            >
              {loading ? "Salvando..." : gastoEditando ? "Salvar" : "Adicionar"}
            </button>

            {gastoEditando && (
              <button
                type="button"
                onClick={limparFormulario}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl transition-all h-10.5 flex items-center justify-center cursor-pointer hover:-translate-y-0.5"
                title="Cancelar Edição"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tabela de Listagem */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            Gastos Fixos Cadastrados
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="py-4 px-6">Vencimento</th>
                <th className="py-4 px-6">Descrição</th>
                <th className="py-4 px-6">Categoria</th>
                <th className="py-4 px-6">Valor</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {gastos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    Nenhum gasto fixo cadastrado.
                  </td>
                </tr>
              ) : (
                gastos.map((gasto) => (
                  <tr
                    key={gasto.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-slate-700">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                        Dia {gasto.dia_vencimento}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {gasto.descricao}
                    </td>
                    <td className="py-4 px-6">
                      {gasto.categoria_nome ? (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm inline-block"
                          style={{
                            backgroundColor: gasto.categoria_cor || "#10b981",
                          }}
                        >
                          {gasto.categoria_nome}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          Sem categoria
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-bold text-red-500">
                      R$ {parseFloat(gasto.valor).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleEditarClick(gasto)}
                        className="cursor-pointer p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-500 hover:text-white hover:scale-110 transition-all shadow-sm"
                        title="Editar Gasto"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleExcluir(gasto.id)}
                        className="cursor-pointer p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white hover:scale-110 transition-all shadow-sm"
                        title="Excluir Gasto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
