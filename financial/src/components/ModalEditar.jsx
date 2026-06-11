import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import { X, Save } from "lucide-react";
import { NumericFormat } from "react-number-format";

function ModalEditar({ transacao, onClose, onSave, categorias }) {
  const [formData, setFormData] = useState({
    ...transacao,
    data: transacao.data.split("T")[0],
  });
  const [isClosing, setIsClosing] = useState(false);
  const { token, API_URL } = useContext(AuthContext);

  useEffect(() => {
    const dataFormatada = transacao.data ? transacao.data.split("T")[0] : "";
    // Garantir que categoria_id seja um número para a comparação no layout de pílulas funcionar perfeitamente
    setFormData({
      ...transacao,
      data: dataFormatada,
      categoria_id: transacao.categoria_id
        ? parseInt(transacao.categoria_id)
        : "",
    });
  }, [transacao]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.tipo === "despesa" && !formData.categoria_id) {
      return alert("Selecione uma categoria clicando na cor desejada.");
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      return alert("Insira um valor válido");
    }

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
      handleClose();
    } catch (error) {
      alert(error.message);
    }
  };

  if (!transacao) return null;

  const inputClass =
    "w-full p-3 border border-slate-200 rounded-xl text-[0.95rem] text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all";
  const labelClass =
    "block mb-2 text-slate-500 font-bold uppercase tracking-wider text-[0.75rem]";

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
    >
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
          className="p-6 md:p-8 flex flex-col gap-6 overflow-y-auto max-h-[75vh]"
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
              <NumericFormat
                className={inputClass}
                value={formData.valor || ""}
                onValueChange={(values) => {
                  setFormData((prev) => ({ ...prev, valor: values.value }));
                }}
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale={true}
                placeholder="R$ 0,00"
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
            <label className={labelClass}>Tipo de Transação</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, tipo: "despesa" }))
                }
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${formData.tipo === "despesa" ? "bg-white shadow-sm text-red-500" : "text-slate-500 hover:text-slate-700"}`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    tipo: "receita",
                    categoria_id: "",
                  }))
                }
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${formData.tipo === "receita" ? "bg-white shadow-sm text-emerald-500" : "text-slate-500 hover:text-slate-700"}`}
              >
                Receita
              </button>
            </div>
          </div>

          {formData.tipo === "despesa" && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className={labelClass}>Categoria</label>
              <div className="flex flex-wrap gap-2.5 mt-2">
                {categorias.map((cat) => {
                  const isSelected = formData.categoria_id === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          categoria_id: cat.id,
                        }))
                      }
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 hover:-translate-y-0.5`}
                      style={{
                        backgroundColor: isSelected
                          ? `${cat.cor}15`
                          : "#ffffff",
                        borderColor: isSelected ? cat.cor : "#e2e8f0",
                        color: isSelected ? cat.cor : "#64748b",
                        boxShadow: isSelected
                          ? `0 0 0 2px ${cat.cor}30`
                          : "none",
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ backgroundColor: cat.cor || "#10b981" }}
                      ></span>
                      {cat.nome}
                    </button>
                  );
                })}
                {categorias.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Nenhuma categoria encontrada.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2 pt-6 border-t border-slate-100">
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
