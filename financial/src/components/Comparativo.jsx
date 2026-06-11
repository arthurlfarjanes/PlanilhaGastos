import React, { useEffect, useState, useContext, useMemo, memo } from "react";
import { AuthContext } from "../App";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { Search, FilterX } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    parseFloat(value) || 0,
  );

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-md">
        <p className="font-semibold text-slate-800 text-xs sm:text-sm m-0">
          {`${payload[0].name || payload[0].dataKey} : ${formatCurrency(payload[0].value)}`}
        </p>
      </div>
    );
  }
  return null;
};

const MultiTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-md">
        <p className="font-bold text-slate-700 text-xs sm:text-sm border-b border-slate-100 pb-2 mb-2">
          {label}
        </p>
        {payload.map((entry, index) => (
          <p
            key={index}
            style={{ color: entry.color }}
            className="font-semibold text-xs sm:text-sm"
          >
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ==========================================
// SUB-COMPONENTE: TABELA ISOLADA E MEMOIZADA
// ==========================================
// O 'memo' garante que este componente só re-renderize se a prop 'transacoes' mudar.
// Como os estados dos filtros estão aqui dentro, digitar na busca não afeta os gráficos do painel.
const TabelaFiltrada = memo(({ transacoes }) => {
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  // Limpa os filtros locais caso o período principal (e consequentemente as transações) mude
  useEffect(() => {
    setFiltroDescricao("");
    setFiltroTipo("todos");
    setFiltroCategoria("todas");
  }, [transacoes]);

  const categoriasDisponiveis = useMemo(() => {
    return Array.from(new Set(transacoes.map((t) => t.categoria_nome)))
      .filter(Boolean)
      .sort();
  }, [transacoes]);

  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      const matchDesc = t.descricao
        .toLowerCase()
        .includes(filtroDescricao.toLowerCase());
      const matchTipo = filtroTipo === "todos" || t.tipo === filtroTipo;
      const matchCat =
        filtroCategoria === "todas" || t.categoria_nome === filtroCategoria;
      return matchDesc && matchTipo && matchCat;
    });
  }, [transacoes, filtroDescricao, filtroTipo, filtroCategoria]);

  const limparFiltros = () => {
    setFiltroDescricao("");
    setFiltroTipo("todos");
    setFiltroCategoria("todas");
  };

  const cardClass =
    "bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col p-0 sm:p-0 overflow-hidden mt-6 sm:mt-8";

  return (
    <div className={cardClass}>
      <div className="p-5 sm:p-6 md:p-8 pb-4 sm:pb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-lg sm:text-xl text-slate-800 m-0">
          Extrato do Período
        </h3>
        {(filtroDescricao ||
          filtroTipo !== "todos" ||
          filtroCategoria !== "todas") && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors"
          >
            <FilterX size={14} /> Limpar Filtros
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3 p-4 sm:p-5 md:px-8 border-b border-slate-100 bg-slate-50/50">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={filtroDescricao}
            onChange={(e) => setFiltroDescricao(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white transition-all shadow-sm"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="w-full md:w-auto px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white shadow-sm text-slate-700 cursor-pointer"
        >
          <option value="todos">Todos os Tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          disabled={filtroTipo === "receita"}
          className="w-full md:w-auto px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white shadow-sm text-slate-700 cursor-pointer disabled:opacity-50 disabled:bg-slate-100"
        >
          <option value="todas">Todas as Categorias</option>
          {categoriasDisponiveis.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-150">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-4 pl-5 sm:pl-8">Descrição</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Data</th>
              <th className="p-4">Categoria</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 text-sm">
            {transacoesFiltradas.length > 0 ? (
              transacoesFiltradas.map((t, i) => (
                <tr
                  key={t.id}
                  className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0`}
                >
                  <td className="p-4 pl-5 sm:pl-8 font-semibold text-slate-800">
                    {t.descricao}
                  </td>
                  <td
                    className={`p-4 font-bold ${t.tipo === "receita" ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {formatCurrency(t.valor)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-wide rounded-full ${t.tipo === "receita" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                    >
                      {t.tipo}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-xs sm:text-sm">
                    {new Date(t.data).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </td>
                  <td className="p-4 font-medium text-slate-500 text-xs sm:text-sm">
                    {t.categoria_nome ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: t.categoria_cor || "#10b981",
                          }}
                        ></span>
                        {t.categoria_nome}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-10 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={24} className="text-slate-300" />
                    <p>Nenhuma transação encontrada com os filtros atuais.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ==========================================
// COMPONENTE PRINCIPAL: COMPARATIVO
// ==========================================
function Comparativo() {
  const [comparativo, setComparativo] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("mes_atual");
  const { token, API_URL } = useContext(AuthContext);

  useEffect(() => {
    const fetchDados = async () => {
      setLoading(true);
      let dI, dF;
      const h = new Date();
      if (periodo === "mes_atual") {
        dI = new Date(h.getFullYear(), h.getMonth(), 1);
        dF = new Date(h.getFullYear(), h.getMonth() + 1, 0);
      } else if (periodo === "mes_passado") {
        dI = new Date(h.getFullYear(), h.getMonth() - 1, 1);
        dF = new Date(h.getFullYear(), h.getMonth(), 0);
      } else if (periodo === "ano_atual") {
        dI = new Date(h.getFullYear(), 0, 1);
        dF = new Date(h.getFullYear(), 11, 31);
      }

      const p = new URLSearchParams();
      if (dI && dF) {
        p.append("dataInicio", dI.toISOString().split("T")[0]);
        p.append("dataFim", dF.toISOString().split("T")[0]);
      }

      try {
        const [cRes, tRes] = await Promise.all([
          fetch(`${API_URL}/transacoes/comparativo?${p}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/transacoes?${p}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setComparativo(await cRes.json());
        setTransacoes(await tRes.json());
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchDados();
  }, [token, API_URL, periodo]);

  const dataBalanco = useMemo(() => {
    if (!comparativo) return [];
    return [
      {
        name: "Período",
        Receitas: parseFloat(comparativo.totalReceitas),
        Despesas: parseFloat(comparativo.totalDespesas),
      },
    ];
  }, [comparativo]);

  const topDespesas = useMemo(() => {
    return transacoes
      .filter((t) => t.tipo === "despesa")
      .sort((a, b) => parseFloat(b.valor) - parseFloat(a.valor))
      .slice(0, 5)
      .map((t) => ({
        name:
          t.descricao.length > 12
            ? t.descricao.substring(0, 12) + "..."
            : t.descricao,
        valor: parseFloat(t.valor),
        cor: t.categoria_cor || "#f97316",
      }));
  }, [transacoes]);

  const fluxoDiario = useMemo(() => {
    const mapaDias = {};
    [...transacoes]
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .forEach((t) => {
        const dia = new Date(t.data).toLocaleDateString("pt-BR", {
          timeZone: "UTC",
          day: "2-digit",
          month: "2-digit",
        });
        if (!mapaDias[dia])
          mapaDias[dia] = { name: dia, Receitas: 0, Despesas: 0 };
        if (t.tipo === "receita") mapaDias[dia].Receitas += parseFloat(t.valor);
        else mapaDias[dia].Despesas += parseFloat(t.valor);
      });
    return Object.values(mapaDias);
  }, [transacoes]);

  const cardClass =
    "bg-white rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg border border-slate-100 flex flex-col";
  const titleClass = "font-bold text-lg sm:text-xl text-slate-800 mb-5 sm:mb-6";

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full">
      {/* LINHA 1: Resumo e Gastos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        <div className={cardClass}>
          <div className="flex justify-between items-center mb-5 sm:mb-6">
            <h2 className="font-bold text-lg sm:text-xl text-slate-800">
              Resumo Geral
            </h2>
            <select
              className="p-2 sm:p-2.5 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              <option value="mes_atual">Mês Atual</option>
              <option value="mes_passado">Mês Passado</option>
              <option value="ano_atual">Este Ano</option>
              <option value="tudo">Tudo</option>
            </select>
          </div>

          {!loading && comparativo && (
            <div className="flex flex-col gap-3 sm:gap-4 grow justify-center">
              <div className="flex justify-between border-b border-slate-100 pb-3 sm:pb-4">
                <span className="text-slate-500 text-sm sm:text-base font-medium">
                  Receitas
                </span>
                <strong className="text-emerald-500 text-lg sm:text-xl">
                  {formatCurrency(comparativo.totalReceitas)}
                </strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-3 sm:pb-4">
                <span className="text-slate-500 text-sm sm:text-base font-medium">
                  Despesas
                </span>
                <strong className="text-red-500 text-lg sm:text-xl">
                  {formatCurrency(comparativo.totalDespesas)}
                </strong>
              </div>
              <div className="flex flex-col items-center bg-slate-50 p-5 sm:p-6 rounded-xl mt-2 sm:mt-4 text-center border border-slate-100">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Balanço Final
                </span>
                <strong
                  className={`text-3xl sm:text-4xl font-black mt-1 sm:mt-2 tracking-tight ${comparativo.balanco >= 0 ? "text-emerald-500" : "text-red-500"}`}
                >
                  {formatCurrency(comparativo.balanco)}
                </strong>
                <span
                  className={`text-[0.7rem] sm:text-xs font-bold mt-3 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full ${comparativo.balanco >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                >
                  {comparativo.balanco >= 0 ? "Positivo" : "Negativo"}
                </span>
              </div>
            </div>
          )}
        </div>

        {!loading && comparativo?.gastosPorCategoria?.length > 0 ? (
          <div className={`${cardClass} xl:col-span-2 items-center`}>
            <h3 className="w-full text-left font-bold text-lg sm:text-xl text-slate-800 border-b border-slate-100 pb-3 sm:pb-4 mb-2 sm:mb-4">
              Despesas por Categoria
            </h3>
            <div className="w-full h-62.5 sm:h-75">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={comparativo.gastosPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="75%"
                    dataKey="value"
                    stroke="none"
                  >
                    {comparativo.gastosPorCategoria.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.cor || "#10b981"}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div
            className={`${cardClass} xl:col-span-2 items-center justify-center`}
          >
            <p className="text-slate-400 text-sm">
              Nenhum gasto para exibir o gráfico.
            </p>
          </div>
        )}
      </div>

      {/* LINHA 2: Barras */}
      {!loading && transacoes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className={cardClass}>
            <h3 className={titleClass}>Receitas x Despesas</h3>
            <div className="w-full h-62.5 sm:h-75">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataBalanco}
                  margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis hide />
                  <RechartsTooltip
                    content={<MultiTooltip />}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar
                    dataKey="Receitas"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  />
                  <Bar
                    dataKey="Despesas"
                    fill="#ef4444"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className={titleClass}>Top 5 Maiores Despesas</h3>
            {topDespesas.length > 0 ? (
              <div className="w-full h-62.5 sm:h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topDespesas}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                      width={80}
                    />
                    <RechartsTooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "#f8fafc" }}
                    />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={30}>
                      {topDespesas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 text-sm">
                  Nenhuma despesa no período.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LINHA 3: Área */}
      {!loading && fluxoDiario.length > 0 && (
        <div className={cardClass}>
          <h3 className={titleClass}>Fluxo de Caixa Diário</h3>
          <div className="w-full h-62.5 sm:h-87.5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={fluxoDiario}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  dy={10}
                  minTickGap={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(value) => `R$ ${value}`}
                  width={70}
                />
                <RechartsTooltip content={<MultiTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="Receitas"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorReceita)"
                />
                <Area
                  type="monotone"
                  dataKey="Despesas"
                  stroke="#ef4444"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorDespesa)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* LINHA 4: TABELA OTIMIZADA E ISOLADA */}
      <TabelaFiltrada transacoes={transacoes} />
    </div>
  );
}

export default Comparativo;
