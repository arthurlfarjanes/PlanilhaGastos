import React, { useState, useContext } from "react";
import { AuthContext } from "../App";
import { PlusCircle, AlertCircle } from "lucide-react";
import { CurrencyInput } from "./CurrencyInput";
import { Button } from "@/components/ui/Button";

const getTodayDateString = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  return new Date(today.getTime() - offset * 60 * 1000)
    .toISOString()
    .split("T")[0];
};

function FormularioTransacao({ onTransacaoAdicionada, categorias }) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("despesa");
  const [data, setData] = useState(getTodayDateString());
  const [categoriaId, setCategoriaId] = useState("");
  const [ehParcelado, setEhParcelado] = useState(false);
  const [parcelas, setParcelas] = useState(2);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const { token, API_URL } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (tipo === "despesa" && !categoriaId) {
      setFormError("Por favor, selecione uma categoria para a despesa.");
      return;
    }
    if (!valor || parseFloat(valor) <= 0) {
      setFormError("Insira um valor maior que zero.");
      return;
    }

    setLoading(true);
    const endpoint = ehParcelado
      ? `${API_URL}/transacoes/parcelada`
      : `${API_URL}/transacoes`;

    const transacaoData = {
      descricao,
      valor: parseFloat(valor),
      tipo,
      data,
      categoria_id: tipo === "despesa" ? parseInt(categoriaId) : null,
      ...(ehParcelado && { parcelas: parseInt(parcelas) }),
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transacaoData),
      });
      const dataResp = await res.json();
      if (!res.ok)
        throw new Error(dataResp.error || "Erro ao salvar transação");

      onTransacaoAdicionada();
      setDescricao("");
      setValor("");
      setTipo("despesa");
      setData(getTodayDateString());
      setCategoriaId("");
      setEhParcelado(false);
      setParcelas(2);
      setFormError("");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full p-3 border border-slate-200 dark:border-[#2E3342] rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-[#14171F] focus:outline-none focus:border-[#B6FFE2] focus:ring-4 focus:ring-[#B6FFE2]/15 transition-all shadow-xs placeholder-slate-400 dark:placeholder-[#687082]";
  const labelClass =
    "block mb-1.5 text-slate-500 dark:text-[#8E9AA8] font-bold uppercase tracking-wider text-[0.75rem]";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-graphite-800 p-6 sm:p-7 rounded-2xl shadow-xs border border-slate-200/80 dark:border-graphite-600 flex flex-col gap-5 transition-colors duration-200"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-graphite-600 pb-3">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
          Nova Transação
        </h3>
        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 dark:bg-graphite-700 text-slate-600 dark:text-graphite-300 border border-slate-200 dark:border-graphite-600">
          Rápido
        </span>
      </div>

      {formError && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-500/20">
          <AlertCircle size={16} className="shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Descrição */}
      <div>
        <label className={labelClass}>Descrição</label>
        <input
          type="text"
          className={inputClass}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          placeholder="Ex: Supermercado, Salário, Uber"
        />
      </div>

      {/* Valor e Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Valor</label>
          <CurrencyInput
            className={inputClass}
            value={valor}
            onValueChange={(val) => setValor(val)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Data</label>
          <input
            type="date"
            className={inputClass}
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Seletor Tipo: Despesa vs Receita */}
      <div>
        <label className={labelClass}>Tipo de Transação</label>
        <div className="grid grid-cols-2 bg-slate-100 dark:bg-graphite-900 p-1 rounded-xl border border-slate-200 dark:border-graphite-600">
          <button
            type="button"
            onClick={() => {
              setTipo("despesa");
              setEhParcelado(false);
            }}
            className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              tipo === "despesa"
                ? "bg-red-500 text-white shadow-xs"
                : "text-slate-500 dark:text-graphite-300 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => {
              setTipo("receita");
              setCategoriaId("");
              setEhParcelado(false);
            }}
            className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              tipo === "receita"
                ? "bg-lime-spark text-graphite-900 shadow-xs"
                : "text-slate-500 dark:text-graphite-300 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Receita
          </button>
        </div>
      </div>

      {/* Categorias (Exibido apenas para Despesa) */}
      {tipo === "despesa" && (
        <div className="animate-fade-in flex flex-col gap-2">
          <label className={labelClass}>Selecione a Categoria</label>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 py-1">
            {categorias.map((cat) => {
              const isSelected = categoriaId === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategoriaId(cat.id)}
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
            {categorias.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-graphite-300">
                Nenhuma categoria cadastrada ainda.
              </p>
            )}
          </div>

          {/* Opção de Parcelamento */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-graphite-900 p-3 rounded-xl border border-slate-200 dark:border-graphite-600 mt-2">
            <input
              id="parcela"
              type="checkbox"
              className="w-4 h-4 rounded text-[#059669] dark:text-lime-spark accent-lime-spark cursor-pointer"
              checked={ehParcelado}
              onChange={(e) => setEhParcelado(e.target.checked)}
            />
            <label
              htmlFor="parcela"
              className="text-slate-700 dark:text-slate-200 font-medium m-0 cursor-pointer text-xs sm:text-sm"
            >
              Compra Parcelada?
            </label>
          </div>

          {ehParcelado && (
            <div className="mt-1 animate-fade-in">
              <label className={labelClass}>Número de Parcelas (máx: 72)</label>
              <input
                type="number"
                min="2"
                max="72"
                className={inputClass}
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                required
              />
            </div>
          )}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={loading}
        className="w-full mt-2 cursor-pointer bg-lime-spark text-graphite-900 hover:bg-lime-spark-hover"
      >
        <PlusCircle size={18} />
        Adicionar Transação
      </Button>
    </form>
  );
}

export default FormularioTransacao;
