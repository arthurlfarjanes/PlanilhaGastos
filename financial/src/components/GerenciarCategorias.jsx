// import React, { useState, useContext } from "react";
// import { AuthContext } from "../App";
// import { Plus, Edit2, Trash2 } from "lucide-react";

// function GerenciarCategorias({ categorias, onCategoriaChange, onEdit }) {
//   const [novaCategoria, setNovaCategoria] = useState("");
//   const { token, API_URL } = useContext(AuthContext);

//   const handleAdd = async (e) => {
//     e.preventDefault();
//     if (!novaCategoria.trim()) return;
//     try {
//       const response = await fetch(`${API_URL}/categorias`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ nome: novaCategoria }),
//       });
//       if (!response.ok) throw new Error("Erro ao adicionar categoria");
//       onCategoriaChange();
//       setNovaCategoria("");
//     } catch (error) {
//       alert(error.message);
//     }
//   };

//   const handleDelete = async (id) => {
//     if (
//       !window.confirm(
//         "As transações associadas a esta categoria não serão excluídas, mas ficarão 'sem categoria'. Deseja continuar?",
//       )
//     )
//       return;
//     try {
//       const response = await fetch(`${API_URL}/categorias/${id}`, {
//         method: "DELETE",
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (!response.ok) throw new Error("Erro ao deletar categoria");
//       onCategoriaChange();
//     } catch (error) {
//       alert(error.message);
//     }
//   };

//   return (
//     <div className="categorias-container">
//       <h3 style={{ marginBottom: "16px" }}>Gerenciar Categorias</h3>

//       <form onSubmit={handleAdd} className="add-categoria">
//         <input
//           type="text"
//           value={novaCategoria}
//           onChange={(e) => setNovaCategoria(e.target.value)}
//           placeholder="Nome da nova categoria"
//         />
//         <button type="submit" className="flex-icon">
//           <Plus size={16} /> Adicionar
//         </button>
//       </form>

//       <ul className="lista-categorias">
//         {categorias.map((cat) => (
//           <li key={cat.id}>
//             <span style={{ fontWeight: 500 }}>{cat.nome}</span>
//             <div className="categoria-acoes">
//               <button
//                 onClick={() => onEdit(cat)}
//                 className="btn-editar-cat flex-icon"
//               >
//                 <Edit2 size={12} /> Editar
//               </button>
//               <button
//                 onClick={() => handleDelete(cat.id)}
//                 className="btn-excluir-cat flex-icon"
//               >
//                 <Trash2 size={12} /> Excluir
//               </button>
//             </div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default GerenciarCategorias;

import React, { useState, useContext } from "react";
import { AuthContext } from "../App";
import { Plus, Edit2, Trash2 } from "lucide-react";

function GerenciarCategorias({ categorias, onCategoriaChange, onEdit }) {
  const [novaCategoria, setNovaCategoria] = useState("");
  const { token, API_URL } = useContext(AuthContext);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    try {
      await fetch(`${API_URL}/categorias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: novaCategoria }),
      });
      onCategoriaChange();
      setNovaCategoria("");
    } catch (error) {}
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100">
      <h3 className="font-semibold text-lg text-slate-800 border-b border-slate-100 pb-3 mb-5">
        Categorias
      </h3>
      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <input
          type="text"
          className="flex-1 p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          value={novaCategoria}
          onChange={(e) => setNovaCategoria(e.target.value)}
          placeholder="Nova categoria..."
        />
        <button
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Adicionar
        </button>
      </form>
      <ul className="flex flex-col gap-2 max-h-75 overflow-y-auto pr-2">
        {categorias.map((cat) => (
          <li
            key={cat.id}
            className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-slate-200/60"
          >
            <span className="font-medium text-slate-700 text-sm">
              {cat.nome}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(cat)}
                className="bg-blue-500 hover:brightness-90 text-white p-1.5 rounded-lg transition-all"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={async () => {
                  if (window.confirm("Deseja excluir?")) {
                    await fetch(`${API_URL}/categorias/${cat.id}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    onCategoriaChange();
                  }
                }}
                className="bg-red-500 hover:brightness-90 text-white p-1.5 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
export default GerenciarCategorias;
