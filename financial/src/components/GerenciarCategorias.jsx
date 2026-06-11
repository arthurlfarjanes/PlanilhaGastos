import React, { useState, useContext } from "react";
import { AuthContext } from "../App";
import { Plus, Edit2, Trash2, Dices } from "lucide-react";

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
  "#fbbf24", // Âmbares/Amarelos
  "#84cc16",
  "#65a30d",
  "#a3e635", // Limão
  "#22c55e",
  "#16a34a",
  "#4ade80", // Verdes
  "#10b981",
  "#059669",
  "#34d399", // Esmeraldas
  "#14b8a6",
  "#0d9488",
  "#2dd4bf", // Teal (Verde-azulado)
  "#06b6d4",
  "#0891b2",
  "#22d3ee", // Ciano
  "#0ea5e9",
  "#0284c7",
  "#38bdf8", // Sky (Azul Céu)
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
  "#475569", // Slates (Cinzento-azulado)
];

function GerenciarCategorias({ categorias, onCategoriaChange, onEdit }) {
  const [novaCategoria, setNovaCategoria] = useState("");
  const [cor, setCor] = useState("#3b82f6");
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
    try {
      await fetch(`${API_URL}/categorias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: novaCategoria, cor: cor }),
      });
      onCategoriaChange();
      setNovaCategoria("");
      getRandomColor();
    } catch (error) {
      alert("Erro ao adicionar");
    }
  };

  return (
    <div className="bg-white p-5 md:p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col h-fit">
      <h3 className="font-semibold text-lg text-slate-800 border-b border-slate-100 pb-3 mb-5">
        Categorias
      </h3>

      <form
        onSubmit={handleAdd}
        className="flex gap-2.5 mb-6 items-center w-full"
      >
        <div className="flex flex-1 items-center gap-2 border border-slate-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 bg-white shadow-sm transition-all">
          <div
            className="relative w-8 h-8 shrink-0 rounded-full shadow-sm border border-slate-200 overflow-hidden cursor-pointer flex items-center justify-center transition-transform hover:scale-105"
            style={{ backgroundColor: cor }}
            title="Escolher cor manualmente"
          >
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className="absolute inset-0 w-16 h-16 -top-4 -left-4 opacity-0 cursor-pointer"
            />
          </div>

          <input
            type="text"
            className="flex-1 w-full px-1 py-1.5 outline-none text-sm bg-transparent min-w-0 text-slate-700 placeholder:text-slate-400"
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            placeholder="Nome da categoria..."
          />

          <button
            type="button"
            onClick={getRandomColor}
            className="shrink-0 bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-emerald-500 p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-300"
            title="Sortear cor aleatória"
          >
            <Dices size={18} />
          </button>
        </div>

        <button
          type="submit"
          className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl transition-all hover:-translate-y-0.5 shadow-md flex items-center justify-center"
          title="Adicionar Categoria"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </form>

      <ul className="flex flex-col gap-2.5 max-h-87.5 overflow-y-auto pr-2 custom-scrollbar">
        {categorias.map((cat) => (
          <li
            key={cat.id}
            className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-3.5 h-3.5 rounded-full shadow-sm"
                style={{ backgroundColor: cat.cor || "#10b981" }}
              ></div>
              <span className="font-semibold text-slate-700 text-sm">
                {cat.nome}
              </span>
            </div>

            <div className="flex gap-2 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(cat)}
                className="bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white p-1.5 rounded-lg transition-all"
                title="Editar"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={async () => {
                  if (window.confirm("Deseja mesmo excluir esta categoria?")) {
                    await fetch(`${API_URL}/categorias/${cat.id}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    onCategoriaChange();
                  }
                }}
                className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white p-1.5 rounded-lg transition-all"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
        {categorias.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-4">
            Você ainda não tem categorias.
          </p>
        )}
      </ul>
    </div>
  );
}

export default GerenciarCategorias;
