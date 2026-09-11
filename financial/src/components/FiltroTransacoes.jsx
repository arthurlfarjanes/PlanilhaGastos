import React from "react";
import { FilterX, Search, Filter } from "lucide-react";

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
    "w-full p-2.5 border border-slate-200 dark:border-[#2E3342] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-[#14171F] focus:outline-none focus:border-[#B6FFE2] focus:ring-4 focus:ring-[#B6FFE2]/15 transition-all shadow-xs";
  const labelClass =
    "block text-[0.7rem] font-bold text-slate-500 dark:text-[#8E9AA8] uppercase tracking-wider mb-1";

  return (
    <div className="bg-white dark:bg-graphite-800 p-5 sm:p-7 rounded-2xl shadow-xs border border-slate-200/80 dark:border-graphite-600 transition-colors duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-graphite-600 pb-3 mb-4">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Filter size={18} className="text-[#059669] dark:text-lime-spark" />
          Filtrar Transações
        </h3>

        {hasFiltrosAtivos && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-200/50 dark:border-red-500/20"
          >
            <FilterX size={14} /> Limpar Filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
        {/* Busca por Descrição */}
        <div className="lg:col-span-2">
          <label className={labelClass}>Descrição</label>
          <div className="relative flex items-center">
            <Search
              size={16}
              className="absolute left-3 text-slate-400 dark:text-graphite-400 pointer-events-none"
            />
            <input
              type="text"
              name="descricao"
              placeholder="Pesquisar..."
              className={`${inputClass} pl-9`}
              value={filtros.descricao}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Tipo */}
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

        {/* Categoria */}
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

        {/* Data Início */}
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

        {/* Data Fim */}
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
    </div>
  );
}

export default FiltroTransacoes;
