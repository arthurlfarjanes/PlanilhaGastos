import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import { Dices, Save, AlertCircle } from "lucide-react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

// Paleta expandida com cores otimizadas
const PALETTE = [
  "#ef4444", "#dc2626", "#f87171",
  "#f97316", "#ea580c", "#fb923c",
  "#f59e0b", "#d97706", "#fbbf24",
  "#84cc16", "#65a30d", "#a3e635",
  "#22c55e", "#16a34a", "#4ade80",
  "#10b981", "#059669", "#34d399",
  "#B6FFE2", "#14b8a6", "#0d9488",
  "#06b6d4", "#0891b2", "#22d3ee",
  "#0ea5e9", "#0284c7", "#38bdf8",
  "#3b82f6", "#2563eb", "#60a5fa",
  "#6366f1", "#4f46e5", "#818cf8",
  "#8b5cf6", "#7c3aed", "#a78bfa",
  "#a855f7", "#9333ea", "#c084fc",
  "#d946ef", "#c026d3", "#e879f9",
  "#ec4899", "#db2777", "#f472b6",
  "#f43f5e", "#e11d48", "#fb7185",
  "#64748b", "#475569",
];

function ModalEditarCategoria({ onClose, categoria, onSave }) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#B6FFE2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { token, API_URL } = useContext(AuthContext);

  useEffect(() => {
    if (categoria) {
      setNome(categoria.nome);
      setCor(categoria.cor || "#B6FFE2");
    }
  }, [categoria]);

  if (!categoria) return null;

  const getRandomColor = () => {
    setCor(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  };

  const handleSaveClick = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError("O nome da categoria não pode ficar vazio.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/categorias/${categoria.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: nome.trim(), cor }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao salvar a categoria");

      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={!!categoria} onClose={onClose} title="Editar Categoria">
      <form onSubmit={handleSaveClick} className="flex flex-col gap-5">
        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-500/20">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Nome da categoria */}
        <div>
          <label className="block mb-1.5 text-slate-500 dark:text-[#8E9AA8] font-bold uppercase tracking-wider text-[0.75rem]">
            Nome da Categoria
          </label>
          <input
            type="text"
            className="w-full p-3 border border-slate-200 dark:border-[#2E3342] rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-[#14171F] focus:outline-none focus:border-[#B6FFE2] focus:ring-4 focus:ring-[#B6FFE2]/15 transition-all shadow-xs"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={50}
          />
        </div>

        {/* Cor da categoria */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-slate-500 dark:text-[#8E9AA8] font-bold uppercase tracking-wider text-[0.75rem]">
              Cor de Identificação
            </label>
            <button
              type="button"
              onClick={getRandomColor}
              className="text-xs font-bold text-slate-500 dark:text-[#8E9AA8] hover:text-[#059669] dark:hover:text-[#B6FFE2] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Dices size={14} /> Cor Aleatória
            </button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#14171F] rounded-xl border border-slate-200 dark:border-[#2E3342]">
            <div
              className="w-8 h-8 rounded-full border-2 border-white/60 shadow-xs cursor-pointer relative shrink-0 overflow-hidden"
              style={{ backgroundColor: cor }}
            >
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="absolute -top-4 -left-4 w-16 h-16 opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
              {cor}
            </span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#2E3342]">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Save size={16} /> Salvar Alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ModalEditarCategoria;
