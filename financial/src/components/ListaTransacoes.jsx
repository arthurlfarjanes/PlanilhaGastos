// src/components/ListaTransacoes.jsx
import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../App";

function ListaTransacoes() {
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token, API_URL } = useContext(AuthContext);

  useEffect(() => {
    const fetchTransacoes = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/transacoes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || `Erro HTTP! status: ${response.status}`
          );
        }

        setTransacoes(data);
      } catch (err) {
        console.error("Erro ao buscar transações:", err);
        setError(
          "Não foi possível carregar as transações. Por favor, faça login novamente."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTransacoes();
  }, [token, API_URL]);

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja deletar esta transação?")) {
      return;
    }
    try {
      const response = await fetch(`${API_URL}/transacoes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      setTransacoes(transacoes.filter((transacao) => transacao.id !== id));
      alert("Transação deletada com sucesso!");
    } catch (err) {
      console.error("Erro ao deletar transação:", err);
      setError(
        err.message || "Não foi possível deletar a transação. Tente novamente."
      );
    }
  };

  if (loading) return <p>Carregando transações...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <h2>Minhas Transações</h2>
      {transacoes.length === 0 ? (
        <p>
          Nenhuma transação cadastrada ainda. Adicione uma receita ou despesa!
        </p>
      ) : (
        <ul>
          {transacoes.map((transacao) => (
            <li
              key={transacao.id}
              style={{
                fontWeight: "bold",
                color:
                  transacao.tipo === "receita"
                    ? "var(--color-revenue)"
                    : "var(--color-expense)",
              }}
            >
              <span>
                {transacao.tipo === "receita" ? "Receita" : "Despesa"}:{" "}
                {transacao.descricao}
                {transacao.tipo === "despesa" && ` - ${transacao.categoria}`}-
                R$ {parseFloat(transacao.valor).toFixed(2)} (
                {new Date(transacao.data + "T00:00:00Z").toLocaleDateString(
                  "pt-BR",
                  { timeZone: "UTC" }
                )}
                )
              </span>
              <button
                onClick={() => handleDelete(transacao.id)}
                style={{ marginLeft: "10px" }}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ListaTransacoes;
