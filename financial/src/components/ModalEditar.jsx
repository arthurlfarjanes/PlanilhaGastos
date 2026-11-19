import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../App";
import { Save, AlertCircle } from "lucide-react";
import { CurrencyInput } from "./CurrencyInput";
import Modal from "./ui/Modal";
import { Button } from "@/components/ui/Button";

function ModalEditar({ transacao, onClose, onSave, categorias, cartoes = [] }) {
  const [formData, setFormData] = useState({
    ...transacao,
    data: transacao?.data ? transacao.data.split("T")[0] : "",
    cartao_id: transacao?.cartao_id ? String(transacao.cartao_id) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { token, API_URL } = useContext(AuthContext);

  useEffect(() => {
    if (transacao) {
      const dataFormatada = transacao.data ? transacao.data.split("T")[0] : "";
      setFormData({
        ...transacao,
        data: dataFormatada,
        categoria_id: transacao.categoria_id
          ? parseInt(transacao.categoria_id)
          : "",
        cartao_id: transacao.cartao_id ? String(transacao.cartao_id) : "",
      });
    }
  }, [transacao]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.tipo === "despesa" && !formData.categoria_id) {
      setError("Por favor, selecione uma categoria para a despesa.");
      return;
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      setError("Insira um valor maior que zero.");
      return;
    }

    setLoading(true);

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
          cartao_id:
            formData.tipo === "despesa" && formData.cartao_id
              ? parseInt(formData.cartao_id, 10)
              : null,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Erro ao salvar transação");
      onSave(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!transacao) return null;

  const ehMovPatrimonio =
    formData.tipo === "aporte_patrimonio" || formData.tipo === "resgate_patrimonio";

  const inputClass =
    "w-full p-3 border border-slate-200 dark:border-[#2E3342] rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-[#14171F] focus:outline-none focus:border-[var(--color-lime-spark)] focus:ring-4 focus:ring-[var(--color-lime-spark)]/15 transition-all shadow-xs";
  const labelClass =
    "block mb-1.5 text-slate-500 dark:text-[#8E9AA8] font-bold uppercase tracking-wider text-[0.75rem]";

  return (
    <Modal
      isOpen={!!transacao}
      onClose={onClose}
      title="Editar Transação"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-500/20">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Descrição */}
        <div>
          <label className={labelClass}>Descrição</label>
          <input
            type="text"
            name="descricao"
            className={inputClass}
            value={formData.descricao || ""}
            onChange={handleChange}
            required
            maxLength={150}
          />
        </div>

        {/* Valor e Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Valor</label>
            <CurrencyInput
              className={`${inputClass} ${ehMovPatrimonio ? "opacity-60 cursor-not-allowed" : ""}`}
              value={formData.valor || ""}
              onValueChange={(val) => {
                setFormData((prev) => ({ ...prev, valor: val }));
              }}
              disabled={ehMovPatrimonio}
              required
            />
            {ehMovPatrimonio && (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Para alterar o valor, estorne e registre novamente na aba Patrimônio.
              </p>
            )}
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

        {/* Tipo de Transação */}
        <div>
          <label className={labelClass}>Tipo</label>
          {ehMovPatrimonio ? (
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-xs font-semibold text-sky-700 dark:text-sky-300">
              {formData.tipo === "aporte_patrimonio"
                ? "Aporte em Patrimônio / Reserva — descontado apenas do saldo disponível (não conta como despesa)."
                : "Resgate de Patrimônio — devolvido ao saldo disponível (não conta como receita)."}
            </div>
          ) : (
            <div className="grid grid-cols-2 bg-slate-100 dark:bg-graphite-900 p-1 rounded-xl border border-slate-200 dark:border-graphite-600">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, tipo: "despesa" }))
                }
                className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  formData.tipo === "despesa"
                    ? "bg-red-500 text-white shadow-xs"
                    : "text-slate-500 dark:text-graphite-300"
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    tipo: "receita",
                    categoria_id: null,
                    cartao_id: "",
                  }))
                }
                className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  formData.tipo === "receita"
                    ? "bg-lime-spark text-graphite-900 shadow-xs"
                    : "text-slate-500 dark:text-graphite-300"
                }`}
              >
                Receita
              </button>
            </div>
          )}
        </div>

        {/* Categoria */}
        {formData.tipo === "despesa" && (
          <div className="animate-fade-in flex flex-col gap-2">
            <label className={labelClass}>Categoria</label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 py-1">
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
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-offset-1 dark:ring-offset-graphite-800"
                        : "opacity-80 hover:opacity-100 hover:-translate-y-0.5"
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? `${cat.cor}25`
                        : "transparent",
                      borderColor: cat.cor || "#2E3342",
                      color: cat.cor || "#B6FFE2",
                      // @ts-ignore
                      "--tw-ring-color": cat.cor,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shadow-xs"
                      style={{ backgroundColor: cat.cor || "#10b981" }}
                    />
                    {cat.nome}
                  </button>
                );
              })}
            </div>

            {!formData.cartao_id && formData.cartao_excluido_nome && (
              <div className="mt-2 flex items-start justify-between gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-dashed border-amber-300 dark:border-amber-500/35 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>
                    Esta transação veio do cartão <strong>{formData.cartao_excluido_nome}</strong>, que não está mais cadastrado.
                    Você pode manter essa indicação histórica ou vinculá-la a outro cartão abaixo.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      cartao_excluido_nome: null,
                      limpar_cartao_excluido: true,
                    }))
                  }
                  className="shrink-0 font-bold underline hover:opacity-80 cursor-pointer"
                >
                  Limpar aviso
                </button>
              </div>
            )}

            {cartoes.some((c) => c.ativo !== false || String(c.id) === String(formData.cartao_id)) && (
              <div className="mt-2">
                <label className={labelClass}>Cartão vinculado (Opcional)</label>
                <select
                  name="cartao_id"
                  className={inputClass}
                  value={formData.cartao_id || ""}
                  onChange={handleChange}
                >
                  <option value="">Sem cartão (à vista / conta)</option>
                  {cartoes
                    .filter((c) => c.ativo !== false || String(c.id) === String(formData.cartao_id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                        {c.bandeira ? ` (${c.bandeira})` : ""}
                        {c.ativo === false ? " — Inativo" : ""}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-graphite-600">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            <Save size={16} /> Salvar Alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ModalEditar;
