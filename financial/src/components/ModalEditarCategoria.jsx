import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import { X, Dices, Save } from "lucide-react";

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

function ModalEditarCategoria({ onClose, categoria, onSave }) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#3b82f6");
  const { token, API_URL } = useContext(AuthContext);

  useEffect(() => {
    if (categoria) {
      setNome(categoria.nome);
      setCor(categoria.cor || "#3b82f6");
    }
  }, [categoria]);

  if (!categoria) return null;

  const getRandomColor = () => {
    setCor(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  };

  const handleSaveClick = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    try {
      const response = await fetch(`${API_URL}/categorias/${categoria.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome, cor }),
      });

      if (!response.ok) throw new Error("Erro ao salvar a categoria");

      // AQUI FOI A CORREÇÃO: Chamando onSave em vez de onUpdate
      onSave();
      onClose();
    } catch (error) {
      alert("Erro ao editar categoria");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 md:p-6 border-b border-slate-100">
          <h2 className="font-bold text-lg text-slate-800">Editar Categoria</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSaveClick}
          className="p-5 md:p-6 flex flex-col gap-5"
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nome e Cor
            </label>

            <div className="flex flex-1 items-center gap-2 border border-slate-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 bg-white shadow-sm transition-all">
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
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da categoria..."
                required
              />

              <button
                type="button"
                onClick={getRandomColor}
                className="shrink-0 bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-blue-500 p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-300"
                title="Sortear cor aleatória"
              >
                <Dices size={18} />
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
            >
              <Save size={18} />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalEditarCategoria;
