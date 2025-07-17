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

// Cores para o gráfico de pizza
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`${
          payload[0].name
        } : R$ ${payload[0].value.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};

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
    <div className="comparativo-container">
      <div className="comparativo-card">
        <h2>Seu Resumo Financeiro</h2>

        <div className="comparativo-item">
          <span>Total de Receitas</span>
          <strong className="valor-receita">
            R$ {comparativo.totalReceitas}
          </strong>
        </div>

        <div className="comparativo-item">
          <span>Total de Despesas</span>
          <strong className="valor-despesa">
            R$ {comparativo.totalDespesas}
          </strong>
        </div>

        <hr className="comparativo-divisor" />

        <div className="comparativo-item balanco">
          <h3>Balanço Atual</h3>
          <strong className={balancoColorClass}>
            R$ {comparativo.balanco}
          </strong>
        </div>

        {parseFloat(comparativo.balanco) >= 0 ? (
          <p className="mensagem-status positiva">
            Parabéns! Suas finanças estão no verde.
          </p>
        ) : (
          <p className="mensagem-status negativa">
            Atenção: Suas despesas superam suas receitas.
          </p>
        )}
      </div>

      {hasGastos && (
        <div className="grafico-card">
          <h3>Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={comparativo.gastosPorCategoria}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80} /* Raio um pouco menor para dar mais espaço */
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                // ** AQUI ESTÁ O AJUSTE DO RÓTULO **
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {comparativo.gastosPorCategoria.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default Comparativo;
