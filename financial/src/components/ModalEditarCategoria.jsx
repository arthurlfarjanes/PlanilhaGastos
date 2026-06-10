import React, { useState, useContext } from "react";
import { AuthContext } from "../App";
import { X, Save } from "lucide-react";

function ModalEditarCategoria({ categoria, onClose, onSave }) {
  const [nome, setNome] = useState(categoria.nome);
  const [isClosing, setIsClosing] = useState(false);
  const { token, API_URL } = useContext(AuthContext);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/categorias/${categoria.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Erro ao salvar categoria");

      onSave(data);
      handleClose();
    } catch (error) {
      alert(error.message);
    }
  };

  const inputClass =
    "w-full p-3.5 border border-slate-200 rounded-xl text-[0.95rem] text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all";
  const labelClass = "block mb-1.5 text-slate-500 font-medium text-[0.85rem]";

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
    >
      <div
        className={`bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isClosing ? "animate-scale-out" : "animate-scale-in"}`}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Editar Categoria</h2>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className={labelClass}>Nome da Categoria</label>
            <input
              type="text"
              className={inputClass}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Ex: Alimentação"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-3 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-3 font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors flex items-center gap-2 shadow-md"
            >
              <Save size={18} /> Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalEditarCategoria;
