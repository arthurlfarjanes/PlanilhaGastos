import React from "react";
import { Edit2, Trash2, ArrowUpRight, ArrowDownRight, Tag } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    parseFloat(value) || 0,
  );

function ListaTransacoes({ transacoes, onEdit, onDelete }) {
  if (transacoes.length === 0)
    return (
      <div className="bg-white dark:bg-graphite-800 p-12 rounded-2xl border border-slate-200/80 dark:border-graphite-600 text-center shadow-xs">
        <p className="text-slate-400 dark:text-graphite-300 font-medium">
          Nenhuma transação encontrada para os filtros selecionados.
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3 max-h-228.75 overflow-y-auto pr-1 custom-scrollbar">
      {transacoes.map((t) => {
        const isReceita = t.tipo === "receita";

        return (
          <div
            key={t.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-white dark:bg-graphite-800 rounded-2xl shadow-xs border border-slate-200/80 dark:border-graphite-600 border-l-4 sm:border-l-[6px] transition-all duration-150 hover:shadow-md hover:translate-x-0.5 ${
              isReceita
                ? "border-l-emerald-500 dark:border-l-lime-spark"
                : "border-l-red-500"
            }`}
          >
            {/* Informações da Transação */}
            <div className="flex items-start gap-3.5 mb-3 sm:mb-0 min-w-0">
              <div
                className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  isReceita
                    ? "bg-emerald-50 dark:bg-lime-spark/10 text-emerald-600 dark:text-lime-spark"
                    : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
                }`}
              >
                {isReceita ? (
                  <ArrowUpRight size={18} strokeWidth={2.5} />
                ) : (
                  <ArrowDownRight size={18} strokeWidth={2.5} />
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 truncate">
                  {t.descricao}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-graphite-900 text-slate-600 dark:text-graphite-300 border border-slate-200 dark:border-graphite-600">
                    {isReceita ? (
                      "Receita"
                    ) : (
                      <>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: t.categoria_cor || "#10b981",
                          }}
                        />
                        {t.categoria_nome || "Sem Categoria"}
                      </>
                    )}
                  </span>

                  <span className="text-xs text-slate-400 dark:text-graphite-400 font-medium">
                    {new Date(t.data).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Valor e Ações */}
            <div className="flex flex-col sm:items-end gap-2.5 pt-3 sm:pt-0 border-t border-slate-100 dark:border-graphite-600 sm:border-0 w-full sm:w-auto">
              <span
                className={`text-xl sm:text-xl font-black self-start sm:self-end ${
                  isReceita
                    ? "text-emerald-600 dark:text-lime-spark"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {isReceita ? "+" : "-"} {formatCurrency(t.valor)}
              </span>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onEdit(t)}
                  className="flex-1 sm:flex-none justify-center bg-slate-100 dark:bg-graphite-700 hover:bg-slate-200 dark:hover:bg-graphite-600 text-slate-700 dark:text-slate-200 py-2 sm:py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200 dark:border-graphite-600 cursor-pointer"
                >
                  <Edit2 size={13} /> Editar
                </button>

                <button
                  onClick={() => onDelete(t.id)}
                  className="flex-1 sm:flex-none justify-center bg-red-50 dark:bg-red-500/10 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white text-red-600 dark:text-red-400 py-2 sm:py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-red-200/60 dark:border-red-500/20 cursor-pointer"
                >
                  <Trash2 size={13} /> Excluir
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ListaTransacoes;
