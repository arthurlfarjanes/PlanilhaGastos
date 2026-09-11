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
import { Search, FilterX, TrendingUp, TrendingDown, Scale } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    parseFloat(value) || 0,
  );

// ─── Tooltips personalizados ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#1E222B] p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-[#2E3342] shadow-md">
        <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm m-0">
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
      <div className="bg-white dark:bg-[#1E222B] p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-[#2E3342] shadow-md">
        <p className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm border-b border-slate-100 dark:border-[#2E3342] pb-2 mb-2">
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

// ─── Tabela Filtrada (memoizada) ───────────────────────────────────────────────
const TabelaFiltrada = memo(({ transacoes }) => {
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

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

  const hasFilter =
    filtroDescricao || filtroTipo !== "todos" || filtroCategoria !== "todas";

  const selectClass =
    "w-full md:w-auto px-3 py-2.5 border border-slate-200 dark:border-[#2E3342] rounded-xl text-sm font-medium focus:outline-none focus:border-[#B6FFE2] focus:ring-2 focus:ring-[#B6FFE2]/20 bg-white dark:bg-[#14171F] text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer transition-colors";

  return (
    <div className="bg-white dark:bg-[#1E222B] rounded-2xl border border-slate-200/80 dark:border-[#2E3342] shadow-xs overflow-hidden mt-0">
      {/* Cabeçalho da tabela */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-[#2E3342] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">
          Extrato do Período
        </h3>
        {hasFilter && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-[#8E9AA8] hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <FilterX size={14} /> Limpar Filtros
          </button>
        )}
      </div>

      {/* Filtros da tabela */}
      <div className="flex flex-col md:flex-row gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-[#2E3342] bg-slate-50/50 dark:bg-[#14171F]/40">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#687082]"
            size={15}
          />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={filtroDescricao}
            onChange={(e) => setFiltroDescricao(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-[#2E3342] rounded-xl text-sm focus:outline-none focus:border-[#B6FFE2] focus:ring-2 focus:ring-[#B6FFE2]/20 bg-white dark:bg-[#14171F] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-[#687082] shadow-xs transition-all"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className={selectClass}
        >
          <option value="todos">Todos os Tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          disabled={filtroTipo === "receita"}
          className={selectClass + " disabled:opacity-50"}
        >
          <option value="todas">Todas as Categorias</option>
          {categoriasDisponiveis.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="bg-slate-50 dark:bg-[#14171F]/60 border-b border-slate-200 dark:border-[#2E3342] text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#687082]">
            <tr>
              <th className="p-4 pl-5 sm:pl-6">Descrição</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Data</th>
              <th className="p-4">Categoria</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-200 text-sm divide-y divide-slate-100 dark:divide-[#2E3342]">
            {transacoesFiltradas.length > 0 ? (
              transacoesFiltradas.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-slate-50 dark:hover:bg-[#14171F]/40 transition-colors"
                >
                  <td className="p-4 pl-5 sm:pl-6 font-semibold text-slate-800 dark:text-slate-100">
                    {t.descricao}
                  </td>
                  <td
                    className={`p-4 font-bold ${
                      t.tipo === "receita"
                        ? "text-emerald-600 dark:text-[#B6FFE2]"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(t.valor)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-wide rounded-full ${
                        t.tipo === "receita"
                          ? "bg-emerald-100 dark:bg-[#B6FFE2]/15 text-emerald-700 dark:text-[#B6FFE2]"
                          : "bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {t.tipo}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-[#8E9AA8] text-xs sm:text-sm">
                    {new Date(t.data).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </td>
                  <td className="p-4 font-medium text-slate-500 dark:text-[#8E9AA8] text-xs sm:text-sm">
                    {t.categoria_nome ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: t.categoria_cor || "#10b981",
                          }}
                        />
                        {t.categoria_nome}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-[#687082]">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-[#8E9AA8]">
                    <Search size={24} className="opacity-40" />
                    <p className="font-medium">
                      Nenhuma transação encontrada com os filtros atuais.
                    </p>
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

// ─── Componente principal ──────────────────────────────────────────────────────
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
        // silencioso
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

  // Constantes de estilo para cards e títulos
  const cardClass =
    "bg-white dark:bg-[#1E222B] rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-[#2E3342] shadow-xs flex flex-col";

  const titleClass =
    "font-bold text-lg text-slate-800 dark:text-white mb-5 sm:mb-6";

  // Cores para os gráficos adaptadas ao dark mode (usamos cores fixas que são legíveis nos dois modos)
  const chartColors = {
    receita: "#10b981",
    despesa: "#ef4444",
    gridLight: "#f1f5f9",
    gridDark: "#2E3342",
    tick: "#94a3b8",
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full">
      {/* ── LINHA 1: Resumo + Gráfico de Pizza ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Card: Resumo Geral */}
        <div className={cardClass}>
          <div className="flex justify-between items-center mb-5 sm:mb-6">
            <h2 className="font-bold text-lg text-slate-800 dark:text-white">
              Resumo Geral
            </h2>
            <select
              className="p-2 sm:p-2.5 border border-slate-200 dark:border-[#2E3342] rounded-lg text-xs sm:text-sm font-medium bg-white dark:bg-[#14171F] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B6FFE2]/30 cursor-pointer transition-colors"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              <option value="mes_atual">Mês Atual</option>
              <option value="mes_passado">Mês Passado</option>
              <option value="ano_atual">Este Ano</option>
              <option value="tudo">Tudo</option>
            </select>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3 grow justify-center animate-pulse">
              <div className="h-6 bg-slate-100 dark:bg-[#23262F] rounded-lg" />
              <div className="h-6 bg-slate-100 dark:bg-[#23262F] rounded-lg" />
              <div className="h-24 bg-slate-100 dark:bg-[#23262F] rounded-xl mt-4" />
            </div>
          ) : comparativo ? (
            <div className="flex flex-col gap-3 sm:gap-4 grow justify-center">
              {/* Receitas */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-[#B6FFE2]/10 border border-emerald-100 dark:border-[#B6FFE2]/20">
                <div className="flex items-center gap-2.5 text-emerald-700 dark:text-[#B6FFE2]">
                  <TrendingUp size={18} />
                  <span className="text-sm font-semibold">Receitas</span>
                </div>
                <strong className="text-emerald-600 dark:text-[#B6FFE2] text-lg">
                  {formatCurrency(comparativo.totalReceitas)}
                </strong>
              </div>

              {/* Despesas */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                  <TrendingDown size={18} />
                  <span className="text-sm font-semibold">Despesas</span>
                </div>
                <strong className="text-red-500 dark:text-red-400 text-lg">
                  {formatCurrency(comparativo.totalDespesas)}
                </strong>
              </div>

              {/* Balanço */}
              <div
                className={`flex flex-col items-center p-5 rounded-xl mt-1 text-center border ${
                  comparativo.balanco >= 0
                    ? "bg-emerald-50 dark:bg-[#B6FFE2]/10 border-emerald-100 dark:border-[#B6FFE2]/20"
                    : "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20"
                }`}
              >
                <Scale
                  size={18}
                  className={
                    comparativo.balanco >= 0
                      ? "text-emerald-500 dark:text-[#B6FFE2] mb-2"
                      : "text-red-500 dark:text-red-400 mb-2"
                  }
                />
                <span className="text-xs font-bold text-slate-500 dark:text-[#8E9AA8] uppercase tracking-wide">
                  Balanço Final
                </span>
                <strong
                  className={`text-3xl sm:text-4xl font-black mt-1.5 tracking-tight ${
                    comparativo.balanco >= 0
                      ? "text-emerald-600 dark:text-[#B6FFE2]"
                      : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {formatCurrency(comparativo.balanco)}
                </strong>
                <span
                  className={`text-xs font-bold mt-2.5 px-3 py-1 rounded-full ${
                    comparativo.balanco >= 0
                      ? "bg-emerald-100 dark:bg-[#B6FFE2]/20 text-emerald-700 dark:text-[#B6FFE2]"
                      : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                  }`}
                >
                  {comparativo.balanco >= 0 ? "Positivo ✓" : "Negativo"}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Gráfico de Pizza: Despesas por Categoria */}
        {!loading && comparativo?.gastosPorCategoria?.length > 0 ? (
          <div className={`${cardClass} xl:col-span-2 items-center`}>
            <h3 className="w-full text-left font-bold text-lg text-slate-800 dark:text-white border-b border-slate-100 dark:border-[#2E3342] pb-3 sm:pb-4 mb-4">
              Despesas por Categoria
            </h3>
            <div className="w-full h-64 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={comparativo.gastosPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="72%"
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
                    wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : !loading ? (
          <div className={`${cardClass} xl:col-span-2 items-center justify-center`}>
            <p className="text-slate-400 dark:text-[#8E9AA8] text-sm">
              Nenhum gasto para exibir o gráfico.
            </p>
          </div>
        ) : null}
      </div>

      {/* ── LINHA 2: Barras ── */}
      {!loading && transacoes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Receitas x Despesas */}
          <div className={cardClass}>
            <h3 className={titleClass}>Receitas × Despesas</h3>
            <div className="w-full h-64 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataBalanco}
                  margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={chartColors.gridLight}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: chartColors.tick }}
                  />
                  <YAxis hide />
                  <RechartsTooltip
                    content={<MultiTooltip />}
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar
                    dataKey="Receitas"
                    fill={chartColors.receita}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={64}
                  />
                  <Bar
                    dataKey="Despesas"
                    fill={chartColors.despesa}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={64}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 Maiores Despesas */}
          <div className={cardClass}>
            <h3 className={titleClass}>Top 5 Maiores Despesas</h3>
            {topDespesas.length > 0 ? (
              <div className="w-full h-64 sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topDespesas}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke={chartColors.gridLight}
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                        fontWeight: 600,
                      }}
                      width={82}
                    />
                    <RechartsTooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    />
                    <Bar dataKey="valor" radius={[0, 8, 8, 0]} maxBarSize={32}>
                      {topDespesas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 dark:text-[#8E9AA8] text-sm">
                  Nenhuma despesa no período.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LINHA 3: Fluxo de Caixa Diário (Área) ── */}
      {!loading && fluxoDiario.length > 0 && (
        <div className={cardClass}>
          <h3 className={titleClass}>Fluxo de Caixa Diário</h3>
          <div className="w-full h-64 sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={fluxoDiario}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartColors.gridLight}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: chartColors.tick }}
                  dy={10}
                  minTickGap={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: chartColors.tick }}
                  tickFormatter={(value) => `R$ ${value}`}
                  width={72}
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
                  stroke={chartColors.receita}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorReceita)"
                />
                <Area
                  type="monotone"
                  dataKey="Despesas"
                  stroke={chartColors.despesa}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorDespesa)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── LINHA 4: Extrato/Tabela filtrada ── */}
      <TabelaFiltrada transacoes={transacoes} />
    </div>
  );
}

export default Comparativo;
