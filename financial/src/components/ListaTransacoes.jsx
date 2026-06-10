// import React from "react";
// import { Edit2, Trash2 } from "lucide-react"; // Importando ícones de ação

// const formatCurrency = (value) => {
//   const numberValue = parseFloat(value);
//   if (isNaN(numberValue)) return "R$ 0,00";
//   return new Intl.NumberFormat("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//   }).format(numberValue);
// };

// function ListaTransacoes({ transacoes, onEdit, onDelete }) {
//   if (transacoes.length === 0) {
//     return (
//       <p
//         style={{
//           textAlign: "center",
//           color: "var(--color-text-muted)",
//           padding: "40px 0",
//         }}
//       >
//         Nenhuma transação encontrada.
//       </p>
//     );
//   }

//   return (
//     <div className="lista-transacoes">
//       <ul>
//         {transacoes.map((transacao) => (
//           <li key={transacao.id} className={`transacao-item ${transacao.tipo}`}>
//             <div className="transacao-info">
//               <span className="transacao-descricao">{transacao.descricao}</span>
//               <span className="transacao-categoria">
//                 {transacao.tipo === "despesa"
//                   ? transacao.categoria_nome || "Sem Categoria"
//                   : "Receita"}
//               </span>
//               <span className="transacao-data">
//                 {new Date(transacao.data).toLocaleDateString("pt-BR", {
//                   timeZone: "UTC",
//                 })}
//               </span>
//             </div>

//             <div className="transacao-valor-acoes">
//               <span className={`transacao-valor ${transacao.tipo}`}>
//                 {formatCurrency(transacao.valor)}
//               </span>
//               <div className="transacao-acoes">
//                 <button
//                   className="btn-editar flex-icon"
//                   onClick={() => onEdit(transacao)}
//                 >
//                   <Edit2 size={14} /> Editar
//                 </button>
//                 <button
//                   className="btn-excluir flex-icon"
//                   onClick={() => onDelete(transacao.id)}
//                 >
//                   <Trash2 size={14} /> Excluir
//                 </button>
//               </div>
//             </div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default ListaTransacoes;

import React from "react";
import { Edit2, Trash2 } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    parseFloat(value) || 0,
  );

function ListaTransacoes({ transacoes, onEdit, onDelete }) {
  if (transacoes.length === 0)
    return (
      <p className="text-center text-slate-500 py-10">
        Nenhuma transação encontrada.
      </p>
    );

  return (
    <div className="flex flex-col gap-3.5">
      {transacoes.map((t) => (
        <div
          key={t.id}
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-xl shadow-sm border border-slate-200 border-l-[6px] transition-all hover:shadow-md hover:translate-x-1 ${t.tipo === "receita" ? "border-l-emerald-500" : "border-l-red-500"}`}
        >
          {/* Informações da Transação (Esquerda) */}
          <div className="flex flex-col gap-1.5 mb-2 sm:mb-0">
            <span className="font-bold text-lg text-slate-800">
              {t.descricao}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.75rem] font-bold px-3 py-1 bg-slate-100 text-slate-500 rounded-full">
                {t.tipo === "despesa"
                  ? t.categoria_nome || "S/ Categoria"
                  : "Receita"}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {new Date(t.data).toLocaleDateString("pt-BR", {
                  timeZone: "UTC",
                })}
              </span>
            </div>
          </div>

          {/* Valor e Ações (Direita no Desktop, Embaixo no Mobile) */}
          <div className="flex flex-col sm:items-end gap-3 sm:gap-2 pt-3 sm:pt-0 mt-2 sm:mt-0 border-t border-slate-100 sm:border-0 w-full sm:w-auto">
            <span
              className={`text-2xl sm:text-xl font-extrabold self-start sm:self-end ${t.tipo === "receita" ? "text-emerald-500" : "text-red-500"}`}
            >
              {formatCurrency(t.valor)}
            </span>

            <div className="flex gap-2 w-full sm:w-auto mt-1 sm:mt-0">
              <button
                onClick={() => onEdit(t)}
                className="flex-1 sm:flex-none justify-center bg-blue-500 hover:bg-blue-600 text-white py-2.5 sm:py-1.5 px-3 rounded-lg text-sm sm:text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Edit2 size={16} className="sm:w-3.5 sm:h-3.5" /> Editar
              </button>

              <button
                onClick={() => onDelete(t.id)}
                className="flex-1 sm:flex-none justify-center bg-red-500 hover:bg-red-600 text-white py-2.5 sm:py-1.5 px-3 rounded-lg text-sm sm:text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={16} className="sm:w-3.5 sm:h-3.5" /> Excluir
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ListaTransacoes;
