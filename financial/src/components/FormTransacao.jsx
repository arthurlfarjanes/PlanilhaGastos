import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../App";
import { PlusCircle } from "lucide-react";
import { NumericFormat } from "react-number-format";

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

  const { token, API_URL } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tipo === "despesa" && !categoriaId)
      return alert("Selecione uma categoria clicando na cor desejada.");
    if (!valor || parseFloat(valor) <= 0)
      return alert("Insira um valor válido");

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
      if (!res.ok) throw new Error("Erro ao salvar transação");

      onTransacaoAdicionada();
      setDescricao("");
      setValor("");
      setTipo("despesa");
      setData(getTodayDateString());
      setCategoriaId("");
      setEhParcelado(false);
      setParcelas(2);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full p-3 border border-slate-200 rounded-xl text-[0.95rem] text-slate-900 bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all";
  const labelClass =
    "block mb-2 text-slate-500 font-bold uppercase tracking-wider text-[0.75rem]";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col gap-6"
    >
      <h3 className="font-semibold text-lg text-slate-800 border-b border-slate-100 pb-3">
        Adicionar Transação
      </h3>

      <div>
        <label className={labelClass}>Descrição</label>
        <input
          type="text"
          className={inputClass}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          placeholder="Ex: Mercado"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Valor</label>
          <NumericFormat
            className={inputClass}
            value={valor}
            onValueChange={(v) => setValor(v.value)}
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
            className={inputClass}
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tipo de Transação</label>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTipo("despesa");
              setEhParcelado(false);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tipo === "despesa" ? "bg-white shadow-sm text-red-500" : "text-slate-500 hover:text-slate-700"}`}
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
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tipo === "receita" ? "bg-white shadow-sm text-emerald-500" : "text-slate-500 hover:text-slate-700"}`}
          >
            Receita
          </button>
        </div>
      </div>

      {tipo === "despesa" && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <label className={labelClass}>Selecione a Categoria</label>

          {/* UI de Pílulas Inteligentes */}
          <div className="flex flex-wrap gap-2.5 mt-2">
            {categorias.map((cat) => {
              const isSelected = categoriaId === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategoriaId(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 hover:-translate-y-0.5`}
                  style={{
                    backgroundColor: isSelected ? `${cat.cor}15` : "#ffffff",
                    borderColor: isSelected ? cat.cor : "#e2e8f0",
                    color: isSelected ? cat.cor : "#64748b",
                    boxShadow: isSelected ? `0 0 0 2px ${cat.cor}30` : "none",
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow-sm"
                    style={{ backgroundColor: cat.cor }}
                  ></span>
                  {cat.nome}
                </button>
              );
            })}
            {categorias.length === 0 && (
              <p className="text-sm text-slate-400">
                Cadastre categorias primeiro.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-5">
            <input
              id="parcela"
              type="checkbox"
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
              checked={ehParcelado}
              onChange={(e) => setEhParcelado(e.target.checked)}
            />
            <label
              htmlFor="parcela"
              className="text-slate-700 font-medium m-0 cursor-pointer text-sm normal-case tracking-normal"
            >
              É compra parcelada?
            </label>
          </div>
          {ehParcelado && (
            <div className="mt-3">
              <label className={labelClass}>Número de Parcelas</label>
              <input
                type="number"
                min="2"
                className={inputClass}
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                required
              />
            </div>
          )}
        </div>
      )}

      <button
        disabled={loading}
        type="submit"
        className="w-full mt-2 bg-emerald-500 text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-emerald-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-md"
      >
        <PlusCircle size={20} />{" "}
        {loading ? "Processando..." : "Adicionar Transação"}
      </button>
    </form>
  );
}

export default FormularioTransacao;
