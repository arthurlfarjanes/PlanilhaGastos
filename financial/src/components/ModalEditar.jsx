import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import { X, Save } from "lucide-react";

function ModalEditar({ transacao, onClose, onSave, categorias }) {
  const [formData, setFormData] = useState({
    ...transacao,
    data: transacao.data.split("T")[0],
  });
  const [isClosing, setIsClosing] = useState(false); // NOVO: Controle de saída
  const { token, API_URL } = useContext(AuthContext);

  useEffect(() => {
    const dataFormatada = transacao.data ? transacao.data.split("T")[0] : "";
    setFormData({ ...transacao, data: dataFormatada });
  }, [transacao]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // NOVO: Função que roda a animação e depois fecha
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200); // 200ms é o exato tempo da nossa animação no CSS
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/transacoes/${transacao.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          valor: parseFloat(formData.valor),
          categoria_id:
            formData.tipo === "despesa"
              ? parseInt(formData.categoria_id)
              : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao salvar");
      onSave(data);
      handleClose(); // Usa a nova função de fechamento suave
    } catch (error) {
      alert(error.message);
    }
  };

  if (!transacao) return null;

  const inputClass =
    "w-full p-3 border border-slate-200 rounded-xl text-[0.95rem] text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all";
  const labelClass = "block mb-1.5 text-slate-500 font-medium text-[0.85rem]";

  return (
    // Fundo do Modal recebe Fade In/Out
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
    >
      {/* Caixa do Modal recebe Scale In/Out */}
      <div
        className={`bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isClosing ? "animate-scale-out" : "animate-scale-in"}`}
      >
        <div className="flex justify-between items-center p-6 md:px-8 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Editar Transação</h2>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 md:p-8 flex flex-col gap-5 overflow-y-auto max-h-[70vh]"
        >
          <div>
            <label className={labelClass}>Descrição</label>
            <input
              type="text"
              name="descricao"
              className={inputClass}
              value={formData.descricao || ""}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Valor</label>
              <input
                type="number"
                step="0.01"
                name="valor"
                className={inputClass}
                value={formData.valor || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Data</label>
              <input
                type="date"
                name="data"
                className={inputClass}
                value={formData.data || ""}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Tipo</label>
            <select
              name="tipo"
              className={inputClass}
              value={formData.tipo || "despesa"}
              onChange={handleChange}
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
          </div>

          {formData.tipo === "despesa" && (
            <div>
              <label className={labelClass}>Categoria</label>
              <select
                name="categoria_id"
                className={inputClass}
                value={formData.categoria_id || ""}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Selecione
                </option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors flex items-center gap-2 shadow-md"
            >
              <Save size={18} /> Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalEditar;
