import React, { useState, useContext } from "react";
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
      return alert("Selecione uma categoria");
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

      // Reseta o formulário
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
  const labelClass = "block mb-1.5 text-slate-500 font-medium text-[0.85rem]";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100 flex flex-col gap-5"
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

      <div>
        <label className={labelClass}>Valor (Total)</label>
        <NumericFormat
          className={inputClass}
          value={valor}
          onValueChange={(values) => {
            setValor(values.value);
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
        <label className={labelClass}>Tipo</label>
        <select
          className={inputClass}
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            setCategoriaId("");
            setEhParcelado(false);
          }}
          required
        >
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
      </div>

      {tipo === "despesa" && (
        <>
          <div>
            <label className={labelClass}>Categoria</label>
            <select
              className={inputClass}
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
            >
              <option value="" disabled>
                Selecione uma categoria
              </option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <input
              id="parcela"
              type="checkbox"
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
              checked={ehParcelado}
              onChange={(e) => setEhParcelado(e.target.checked)}
            />
            <label
              htmlFor="parcela"
              className="text-slate-700 font-medium m-0 cursor-pointer text-sm"
            >
              É compra parcelada?
            </label>
          </div>
          {ehParcelado && (
            <div>
              <label className={labelClass}>Parcelas</label>
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
        </>
      )}
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
