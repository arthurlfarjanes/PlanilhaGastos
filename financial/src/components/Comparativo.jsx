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

// Função para formatar os valores em Reais (R$)
const formatCurrency = (value) => {
  const numberValue = parseFloat(value);
  if (isNaN(numberValue)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue);
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`${payload[0].name} : ${formatCurrency(
          payload[0].value
        )}`}</p>
      </div>
    );
  }
  return null;
};

// Função para formatar a data como YYYY-MM-DD
const toISODateString = (date) => {
  return date.toISOString().split("T")[0];
};

function Comparativo() {
  const [comparativo, setComparativo] = useState(null);
  // **NOVO ESTADO para armazenar as transações do período**
  const [transacoesDoPeriodo, setTransacoesDoPeriodo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("mes_atual");
  const { token, API_URL } = useContext(AuthContext);

  useEffect(() => {
    const fetchDados = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setComparativo(null);
      setTransacoesDoPeriodo([]); // Limpa as transações antigas

      let dataInicio, dataFim;
      const hoje = new Date();

      switch (periodo) {
        case "mes_atual":
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
          break;
        case "mes_passado":
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
          break;
        case "ano_atual":
          dataInicio = new Date(hoje.getFullYear(), 0, 1);
          dataFim = new Date(hoje.getFullYear(), 11, 31);
          break;
        case "tudo":
        default:
          break;
      }

      const params = new URLSearchParams();
      if (dataInicio && dataFim) {
        params.append("dataInicio", toISODateString(dataInicio));
        params.append("dataFim", toISODateString(dataFim));
      }

      // **ATUALIZADO: Define as URLs para as duas chamadas**
      const comparativoUrl = `${API_URL}/transacoes/comparativo?${params.toString()}`;
      const transacoesUrl = `${API_URL}/transacoes?${params.toString()}`;

      try {
        // **ATUALIZADO: Faz as duas buscas de dados simultaneamente**
        const [comparativoRes, transacoesRes] = await Promise.all([
          fetch(comparativoUrl, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(transacoesUrl, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!comparativoRes.ok || !transacoesRes.ok) {
          // Lida com erros de qualquer uma das respostas
          const erroMsg =
            (await comparativoRes.json().error) ||
            (await transacoesRes.json().error) ||
            "Erro ao buscar dados";
          throw new Error(erroMsg);
        }

        const comparativoData = await comparativoRes.json();
        const transacoesData = await transacoesRes.json();

        setComparativo(comparativoData);
        setTransacoesDoPeriodo(transacoesData);
      } catch (err) {
        console.error("Erro ao buscar dados do comparativo:", err);
        setError(
          "Não foi possível carregar os dados. Por favor, tente novamente."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDados();
  }, [token, API_URL, periodo]);

  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const balancoColorClass =
    comparativo && parseFloat(comparativo.balanco) >= 0
      ? "balanco-positivo"
      : "balanco-negativo";
  const hasGastos =
    comparativo &&
    comparativo.gastosPorCategoria &&
    comparativo.gastosPorCategoria.length > 0;
  // **NOVA VARIÁVEL: verifica se existem transações para exibir na tabela**
  const hasTransacoes = transacoesDoPeriodo && transacoesDoPeriodo.length > 0;

  return (
    <div className="comparativo-container">
      <div className="comparativo-card">
        <div className="comparativo-header">
          <h2>Seu Resumo Financeiro</h2>
          <div className="filtro-periodo">
            <label htmlFor="periodo-select">Período:</label>
            <select
              id="periodo-select"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              <option value="mes_atual">Mês Atual</option>
              <option value="mes_passado">Mês Passado</option>
              <option value="ano_atual">Este Ano</option>
              <option value="tudo">Desde o início</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : !comparativo ? (
          <p>Nenhum dado para o comparativo ainda.</p>
        ) : (
          <>
            <div className="comparativo-item">
              <span>Total de Receitas</span>
              <strong className="valor-receita">
                {formatCurrency(comparativo.totalReceitas)}
              </strong>
            </div>
            <div className="comparativo-item">
              <span>Total de Despesas</span>
              <strong className="valor-despesa">
                {formatCurrency(comparativo.totalDespesas)}
              </strong>
            </div>
            <hr className="comparativo-divisor" />
            <div className="comparativo-item balanco">
              <h3>Balanço do Período</h3>
              <strong className={balancoColorClass}>
                {formatCurrency(comparativo.balanco)}
              </strong>
            </div>
            {parseFloat(comparativo.balanco) >= 0 ? (
              <p className="mensagem-status positiva">
                Ótimo resultado para o período!
              </p>
            ) : (
              <p className="mensagem-status negativa">
                Atenção: Suas despesas superaram as receitas no período.
              </p>
            )}
          </>
        )}
      </div>

      {!loading && hasGastos && (
        <div className="grafico-card">
          <h3>Despesas por Categoria</h3>
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

      {/* **NOVA SEÇÃO: TABELA DE TRANSAÇÕES** */}
      {!loading && (
        <div className="transacoes-periodo-card">
          <h3>Transações do Período</h3>
          {hasTransacoes ? (
            <table className="tabela-transacoes-comparativo">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Categoria</th>
                </tr>
              </thead>
              <tbody>
                {transacoesDoPeriodo.map((t) => (
                  <tr key={t.id}>
                    <td>{t.descricao}</td>
                    <td
                      className={
                        t.tipo === "receita" ? "valor-receita" : "valor-despesa"
                      }
                    >
                      {formatCurrency(t.valor)}
                    </td>
                    <td>{t.tipo}</td>
                    <td>
                      {new Date(t.data).toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                      })}
                    </td>
                    <td>{t.categoria_nome || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Nenhuma transação encontrada para o período selecionado.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Comparativo;
