// import React, { useState, useContext } from "react";
// import { AuthContext } from "../App";
// import { PlusCircle } from "lucide-react"; // Importando o ícone

// const getTodayDateString = () => {
//   const today = new Date();
//   const offset = today.getTimezoneOffset();
//   const todayWithOffset = new Date(today.getTime() - offset * 60 * 1000);
//   return todayWithOffset.toISOString().split("T")[0];
// };

// function FormularioTransacao({ onTransacaoAdicionada, categorias }) {
//   const [descricao, setDescricao] = useState("");
//   const [valor, setValor] = useState("");
//   const [tipo, setTipo] = useState("despesa");
//   const [data, setData] = useState(getTodayDateString());
//   const [categoriaId, setCategoriaId] = useState("");
//   const [ehParcelado, setEhParcelado] = useState(false);
//   const [parcelas, setParcelas] = useState(2);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const { token, API_URL } = useContext(AuthContext);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");

//     if (tipo === "despesa" && !categoriaId) {
//       setError("Por favor, selecione uma categoria para a despesa.");
//       return;
//     }
//     if (ehParcelado && parcelas <= 1) {
//       setError("O número de parcelas deve ser maior que 1.");
//       return;
//     }

//     setLoading(true);
//     const endpoint = ehParcelado
//       ? `${API_URL}/transacoes/parcelada`
//       : `${API_URL}/transacoes`;

//     const transacaoData = {
//       descricao,
//       valor: parseFloat(valor),
//       tipo,
//       data,
//       categoria_id: tipo === "despesa" ? parseInt(categoriaId) : null,
//       ...(ehParcelado && { parcelas: parseInt(parcelas) }),
//     };

//     try {
//       const response = await fetch(endpoint, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(transacaoData),
//       });

//       const dataAdicionada = await response.json();
//       if (!response.ok)
//         throw new Error(dataAdicionada.error || "Erro ao processar transação");

//       onTransacaoAdicionada();
//       alert(dataAdicionada.message || "Transação adicionada com sucesso!");

//       setDescricao("");
//       setValor("");
//       setTipo("despesa");
//       setData(getTodayDateString());
//       setCategoriaId("");
//       setEhParcelado(false);
//       setParcelas(2);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="form-transacao">
//       <h3 style={{ marginBottom: "20px" }}>Adicionar Nova Transação</h3>
//       {error && <p className="error">{error}</p>}

//       <div>
//         <label>Descrição:</label>
//         <input
//           type="text"
//           value={descricao}
//           onChange={(e) => setDescricao(e.target.value)}
//           required
//         />
//       </div>
//       <div>
//         <label>Valor (Total):</label>
//         <input
//           type="number"
//           step="0.01"
//           value={valor}
//           onChange={(e) => setValor(e.target.value)}
//           required
//         />
//       </div>

//       <div>
//         <label>Tipo:</label>
//         <select
//           value={tipo}
//           onChange={(e) => {
//             setTipo(e.target.value);
//             setCategoriaId("");
//             setEhParcelado(false);
//           }}
//           required
//         >
//           <option value="despesa">Despesa</option>
//           <option value="receita">Receita</option>
//         </select>
//       </div>

//       {tipo === "despesa" && (
//         <>
//           <div>
//             <label>Categoria:</label>
//             <select
//               value={categoriaId}
//               onChange={(e) => setCategoriaId(e.target.value)}
//               required
//             >
//               <option value="" disabled>
//                 Selecione uma categoria
//               </option>
//               {categorias.length > 0 ? (
//                 categorias.map((cat) => (
//                   <option key={cat.id} value={cat.id}>
//                     {cat.nome}
//                   </option>
//                 ))
//               ) : (
//                 <option disabled>Cadastre uma categoria</option>
//               )}
//             </select>
//           </div>
//           <div className="checkbox-container">
//             <input
//               id="parcelado-checkbox"
//               type="checkbox"
//               checked={ehParcelado}
//               onChange={(e) => setEhParcelado(e.target.checked)}
//             />
//             <label
//               htmlFor="parcelado-checkbox"
//               style={{ margin: 0, cursor: "pointer" }}
//             >
//               É uma compra parcelada?
//             </label>
//           </div>
//           {ehParcelado && (
//             <div>
//               <label>Número de Parcelas:</label>
//               <input
//                 type="number"
//                 min="2"
//                 value={parcelas}
//                 onChange={(e) => setParcelas(e.target.value)}
//                 required
//               />
//             </div>
//           )}
//         </>
//       )}

//       <div>
//         <label>
//           {ehParcelado ? "Data da 1ª Parcela:" : "Data da Transação:"}
//         </label>
//         <input
//           type="date"
//           value={data}
//           onChange={(e) => setData(e.target.value)}
//           required
//         />
//       </div>

//       <button
//         disabled={loading}
//         type="submit"
//         className="flex-icon"
//         style={{ width: "100%", marginTop: "10px", padding: "14px" }}
//       >
//         <PlusCircle size={20} />
//         {loading ? "Processando..." : "Adicionar Transação"}
//       </button>
//     </form>
//   );
// }

// export default FormularioTransacao;

import React, { useState, useContext } from "react";
import { AuthContext } from "../App";
import { PlusCircle } from "lucide-react";

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
      if (!res.ok) throw new Error("Erro");
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
        />
      </div>
      <div>
        <label className={labelClass}>Valor (Total)</label>
        <input
          type="number"
          step="0.01"
          className={inputClass}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
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
              className="w-5 h-5 accent-emerald-500"
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
        className="w-full mt-2 bg-emerald-500 text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-emerald-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
      >
        <PlusCircle size={20} />{" "}
        {loading ? "Processando..." : "Adicionar Transação"}
      </button>
    </form>
  );
}
export default FormularioTransacao;
