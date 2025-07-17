// src/components/Comparativo.jsx
import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../App";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

function Comparativo() {
  const [comparativo, setComparativo] = useState(null);
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
      setComparativo(null);

      try {
        const response = await fetch(`${API_URL}/transacoes/comparativo`, {
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
        setComparativo(data);
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
  }, [token, API_URL]);

  if (loading) return <p>Carregando comparativo...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!comparativo) return <p>Nenhum dado para o comparativo ainda.</p>;

  const balancoColorClass =
    parseFloat(comparativo.balanco) >= 0
      ? "balanco-positivo"
      : "balanco-negativo";

  const hasGastos =
    comparativo.gastosPorCategoria && comparativo.gastosPorCategoria.length > 0;

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

      {hasGastos && (
        <div className="grafico-container" style={{ marginTop: "40px" }}>
          <h3>Distribuição de Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={comparativo.gastosPorCategoria}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {comparativo.gastosPorCategoria.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `R$ ${parseFloat(value).toFixed(2)}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default Comparativo;
