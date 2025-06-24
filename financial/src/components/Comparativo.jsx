// src/components/Comparativo.js
import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../App";

function Comparativo() {
  const [transacoes, setTransacoes] = useState([]); // Agora vamos buscar todas as transações
  const [comparativo, setComparativo] = useState(null); // O resumo ainda será calculado
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token, API_URL } = useContext(AuthContext);

  useEffect(() => {
    const fetchDadosComparativo = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setTransacoes([]); // Limpa as transações anteriores
      setComparativo(null); // Limpa o comparativo anterior

      try {
        // 1. Buscar todas as transações do usuário
        const transacoesResponse = await fetch(`${API_URL}/transacoes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const transacoesData = await transacoesResponse.json();

        if (!transacoesResponse.ok) {
          throw new Error(
            transacoesData.error ||
              `Erro HTTP! status: ${transacoesResponse.status}`
          );
        }

        // Ordenar as transações por data (cronológica)
        const sortedTransacoes = transacoesData.sort((a, b) => {
          // Converte as datas para objetos Date para comparação
          const dateA = new Date(a.data);
          const dateB = new Date(b.data);
          return dateA - dateB; // Ordem crescente (mais antiga primeiro)
        });

        setTransacoes(sortedTransacoes);

        // 2. Calcular o comparativo de receitas e despesas a partir das transações buscadas
        let totalReceitas = 0;
        let totalDespesas = 0;

        sortedTransacoes.forEach((transacao) => {
          const valor = parseFloat(transacao.valor);
          if (transacao.tipo === "receita") {
            totalReceitas += valor;
          } else if (transacao.tipo === "despesa") {
            totalDespesas += valor;
          }
        });

        const balanco = totalReceitas - totalDespesas;

        setComparativo({
          totalReceitas: totalReceitas.toFixed(2),
          totalDespesas: totalDespesas.toFixed(2),
          balanco: balanco.toFixed(2),
        });
      } catch (err) {
        console.error("Erro ao buscar dados do comparativo:", err);
        setError(
          "Não foi possível carregar o comparativo. Por favor, tente novamente."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDadosComparativo();
  }, [token, API_URL]); // Depende do token e API_URL

  if (loading) return <p>Carregando comparativo e transações...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!comparativo) return <p>Nenhum dado para o comparativo ainda.</p>;

  const balancoColorClass =
    parseFloat(comparativo.balanco) >= 0
      ? "balanco-positivo"
      : "balanco-negativo";

  return (
    <div className="comparativo-card">
      <h2>Seu Comparativo de Gastos e Receitas</h2>
      <p>
        Total de Receitas:{" "}
        <strong style={{ color: "var(--color-revenue)" }}>
          R$ {comparativo.totalReceitas}
        </strong>
      </p>
      <p>
        Total de Despesas:{" "}
        <strong style={{ color: "var(--color-expense)" }}>
          R$ {comparativo.totalDespesas}
        </strong>
      </p>
      <hr />
      <h3>
        Balanço Atual:{" "}
        <strong className={balancoColorClass}>R$ {comparativo.balanco}</strong>
      </h3>
      {parseFloat(comparativo.balanco) >= 0 ? (
        <p style={{ color: "var(--color-revenue)" }}>
          Parabéns! Suas receitas superam suas despesas.
        </p>
      ) : (
        <p style={{ color: "var(--color-expense)" }}>
          Atenção: Suas despesas superam suas receitas.
        </p>
      )}

      {/* Nova seção da Tabela de Transações */}
      {transacoes.length > 0 && (
        <div className="transacoes-table-container">
          <h3>Todas as Transações</h3>
          <table className="transacoes-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {transacoes.map((transacao) => (
                <tr key={transacao.id}>
                  <td>
                    {new Date(transacao.data + "T00:00:00Z").toLocaleDateString(
                      "pt-BR",
                      { timeZone: "UTC" }
                    )}
                  </td>
                  <td
                    style={{
                      color:
                        transacao.tipo === "receita"
                          ? "var(--color-revenue)"
                          : "var(--color-expense)",
                    }}
                  >
                    {transacao.tipo === "receita" ? "Receita" : "Despesa"}
                  </td>
                  <td>{transacao.descricao}</td>
                  <td
                    style={{
                      color:
                        transacao.tipo === "receita"
                          ? "var(--color-revenue)"
                          : "var(--color-expense)",
                    }}
                  >
                    R$ {parseFloat(transacao.valor).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Comparativo;
