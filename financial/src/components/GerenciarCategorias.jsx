import React, { useState, useContext } from "react";
import { AuthContext } from "../App";
import { Plus, Edit2, Trash2, Dices, AlertCircle, Tag } from "lucide-react";
import ConfirmDialog from "./ui/ConfirmDialog";
import { Button } from "@/components/ui/button";

// Paleta expandida com 40 cores otimizadas para leitura
const PALETTE = [
  "#ef4444",
  "#dc2626",
  "#f87171", // Vermelhos
  "#f97316",
  "#ea580c",
  "#fb923c", // Laranjas
  "#f59e0b",
  "#d97706",
  "#fbbf24", // Âmbares
  "#84cc16",
  "#65a30d",
  "#a3e635", // Limão
  "#22c55e",
  "#16a34a",
  "#4ade80", // Verdes
  "#10b981",
  "#059669",
  "#34d399", // Esmeraldas
  "#B6FFE2",
  "#14b8a6",
  "#0d9488", // Lime Spark & Teal
  "#06b6d4",
  "#0891b2",
  "#22d3ee", // Ciano
  "#0ea5e9",
  "#0284c7",
  "#38bdf8", // Sky
  "#3b82f6",
  "#2563eb",
  "#60a5fa", // Azuis
  "#6366f1",
  "#4f46e5",
  "#818cf8", // Índigos
  "#8b5cf6",
  "#7c3aed",
  "#a78bfa", // Violetas
  "#a855f7",
  "#9333ea",
  "#c084fc", // Roxos
  "#d946ef",
  "#c026d3",
  "#e879f9", // Fúcsias
  "#ec4899",
  "#db2777",
  "#f472b6", // Rosas
  "#f43f5e",
  "#e11d48",
  "#fb7185", // Roses
  "#64748b",
  "#475569", // Slates
];

function GerenciarCategorias({ categorias, onCategoriaChange, onEdit }) {
  const [novaCategoria, setNovaCategoria] = useState("");
  const [cor, setCor] = useState("#B6FFE2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const { token, API_URL } = useContext(AuthContext);

  const getRandomColor = () => {
    const coresEmUso = categorias.map((c) => c.cor?.toLowerCase());
    const coresDisponiveis = PALETTE.filter((c) => !coresEmUso.includes(c));

    if (coresDisponiveis.length > 0) {
      setCor(
        coresDisponiveis[Math.floor(Math.random() * coresDisponiveis.length)],
      );
    } else {
      setCor(
        "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0"),
      );
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/categorias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: novaCategoria.trim(), cor: cor }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Erro ao adicionar categoria.");

      onCategoriaChange();
      setNovaCategoria("");
      getRandomColor();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmarExcluir = async () => {
    if (!categoriaParaExcluir) return;
    setExcluindo(true);
    try {
      const res = await fetch(
        `${API_URL}/categorias/${categoriaParaExcluir.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erro ao deletar categoria.");
      }
      setCategoriaParaExcluir(null);
      onCategoriaChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="bg-white dark:bg-graphite-800 p-5 sm:p-7 rounded-2xl shadow-xs border border-slate-200/80 dark:border-graphite-600 flex flex-col h-fit transition-colors duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-graphite-600 pb-3 mb-4">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Tag size={18} className="text-[#059669] dark:text-lime-spark" />
          Categorias
        </h3>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-graphite-900 text-slate-600 dark:text-graphite-300 border border-slate-200 dark:border-graphite-600">
          {categorias.length}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-500/20 mb-4">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulário de Nova Categoria */}
      <form
        onSubmit={handleAdd}
        className="flex gap-2 mb-4 items-center w-full"
      >
        <div className="flex flex-1 items-center gap-2 border border-slate-200 dark:border-graphite-600 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-lime-spark/40 focus-within:border-lime-spark bg-slate-50/50 dark:bg-graphite-900 shadow-xs transition-all">
          {/* Seletor de cor */}
          <div
            className="relative w-7 h-7 shrink-0 rounded-full shadow-xs border border-white/40 overflow-hidden cursor-pointer flex items-center justify-center transition-transform hover:scale-105"
            style={{ backgroundColor: cor }}
            title="Escolher cor manualmente"
          >
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className="absolute inset-0 w-14 h-14 -top-3 -left-3 opacity-0 cursor-pointer"
            />
          </div>

          <input
            type="text"
            className="flex-1 w-full px-1 py-1 text-sm bg-transparent outline-none min-w-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-graphite-400"
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            placeholder="Nova categoria..."
            maxLength={50}
          />

          <button
            type="button"
            onClick={getRandomColor}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-lime-spark hover:bg-slate-200 dark:hover:bg-graphite-700 transition-colors cursor-pointer"
            title="Sortear cor aleatória"
          >
            <Dices size={16} />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !novaCategoria.trim()}
          className="shrink-0 bg-lime-spark hover:bg-lime-spark-hover text-graphite-900 p-2.5 rounded-xl font-bold shadow-xs hover:shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
          title="Adicionar Categoria"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </form>

      {/* Lista de Categorias Cadastradas */}
      <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {categorias.map((cat) => (
          <li
            key={cat.id}
            className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-graphite-900 rounded-xl border border-slate-200/60 dark:border-graphite-600 hover:border-slate-300 dark:hover:border-graphite-500 transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: cat.cor || "#B6FFE2" }}
              />
              <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm truncate">
                {cat.nome}
              </span>
            </div>

            <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-80 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(cat)}
                className="text-slate-500 dark:text-graphite-300 hover:text-[#059669] dark:hover:text-lime-spark p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-graphite-700 transition-colors cursor-pointer"
                title="Editar Categoria"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => setCategoriaParaExcluir(cat)}
                className="text-slate-500 dark:text-graphite-300 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Excluir Categoria"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
        {categorias.length === 0 && (
          <p className="text-center text-xs text-slate-400 dark:text-graphite-300 py-4">
            Você ainda não tem categorias cadastradas.
          </p>
        )}
      </ul>

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        isOpen={!!categoriaParaExcluir}
        onClose={() => setCategoriaParaExcluir(null)}
        onConfirm={confirmarExcluir}
        loading={excluindo}
        title="Excluir Categoria"
        message={`Deseja realmente excluir a categoria "${categoriaParaExcluir?.nome}"?`}
        confirmText="Sim, excluir"
      />
    </div>
  );
}

export default GerenciarCategorias;
