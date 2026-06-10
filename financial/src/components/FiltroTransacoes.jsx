import React from "react";
import { FilterX } from "lucide-react";

function FiltroTransacoes({ filtros, setFiltros, categorias }) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const limparFiltros = () => {
    setFiltros({
      descricao: "",
      tipo: "",
      categoriaId: "",
      dataInicio: "",
      dataFim: "",
    });
  };

  const hasFiltrosAtivos = Object.values(filtros).some((valor) => valor !== "");

  const inputClass =
    "w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none";
  const labelClass =
    "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100">
      <h3 className="font-semibold text-lg text-slate-800 border-b border-slate-100 pb-3 mb-5">
        Filtrar Transações
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
        <div className="lg:col-span-2">
          <label className={labelClass}>Descrição</label>
          <input
            type="text"
            name="descricao"
            placeholder="Pesquisar..."
            className={inputClass}
            value={filtros.descricao}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label className={labelClass}>Tipo</label>
          <select
            name="tipo"
            className={inputClass}
            value={filtros.tipo}
            onChange={handleInputChange}
          >
            <option value="">Todos</option>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Categoria</label>
          <select
            name="categoriaId"
            className={inputClass}
            value={filtros.categoriaId}
            onChange={handleInputChange}
            disabled={filtros.tipo === "receita"}
          >
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>De</label>
          <input
            type="date"
            name="dataInicio"
            className={inputClass}
            value={filtros.dataInicio}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label className={labelClass}>Até</label>
          <input
            type="date"
            name="dataFim"
            className={inputClass}
            value={filtros.dataFim}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {hasFiltrosAtivos && (
        <button
          onClick={limparFiltros}
          className="mt-5 w-full md:w-auto bg-slate-100 text-slate-600 font-semibold py-2.5 px-6 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2"
        >
          <FilterX size={16} /> Limpar Filtros
        </button>
      )}
    </div>
  );
}

export default FiltroTransacoes;
