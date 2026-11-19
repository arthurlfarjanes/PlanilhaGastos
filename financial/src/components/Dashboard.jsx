import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { AuthContext } from "../App";
import FormTransacao from "./FormTransacao";
import ListaTransacoes from "./ListaTransacoes";
import FiltroTransacoes from "./FiltroTransacoes";
import GerenciarCategorias from "./GerenciarCategorias";
import ModalEditar from "./ModalEditar";
import ModalEditarCategoria from "./ModalEditarCategoria";
import ConfirmDialog from "./ui/ConfirmDialog";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  List,
  CalendarClock,
} from "lucide-react";

import { formatCurrency, getPeriodRange, todayInTimezone } from "../utils/formatters";
import { isParcelaSubsequenteFutura, isParcelaVincenda } from "../utils/parcelas";
import { usePreferences } from "../context/PreferencesContext";
import ProximosVencimentos from "./ProximosVencimentos";
import AlertasOrcamento from "./AlertasOrcamento";
import ParcelasVincendas from "./ParcelasVincendas";
import toast from "react-hot-toast";

function Dashboard() {
  const [transacoes, setTransacoes] = useState([]);
  const [parcelasVincendas, setParcelasVincendas] = useState([]);
  const [loadingVincendas, setLoadingVincendas] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("extrato");
  const [categorias, setCategorias] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [transacaoParaEditar, setTransacaoParaEditar] = useState(null);
  const [categoriaParaEditar, setCategoriaParaEditar] = useState(null);
  const [transacaoParaDeletar, setTransacaoParaDeletar] = useState(null);
  const [deletando, setDeletando] = useState(false);

  const { prefs, loaded } = usePreferences();
  const dash = prefs.dashboard;
  const [filtros, setFiltros] = useState(() => ({
    descricao: "",
    tipo: "",
    categoriaId: "",
    ocultarParcelasFuturas: "",
    ...getPeriodRange(dash.defaultPeriod, prefs.financial.periodStartDay, prefs.financial.timezone),
  }));
  const visiveis = dash.cardOrder.filter((id) => !dash.hiddenCards.includes(id));
  const cardStyle = (id) =>
    dash.hiddenCards.includes(id) ? { display: "none" } : { order: dash.cardOrder.indexOf(id) };

  // Quando as preferências chegam do servidor (após o primeiro render), aplica o período padrão uma vez.
  const periodoAplicado = useRef(false);
  useEffect(() => {
    if (!loaded || periodoAplicado.current) return;
    periodoAplicado.current = true;
    setFiltros((f) =>
      f.dataInicio || f.dataFim
        ? f
        : { ...f, ...getPeriodRange(dash.defaultPeriod, prefs.financial.periodStartDay, prefs.financial.timezone) },
    );
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  const { token, API_URL } = useContext(AuthContext);

  const fetchCategorias = async () => {
    try {
      const response = await fetch(`${API_URL}/categorias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Falha ao buscar categorias");
      setCategorias(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchTransacoes = async () => {
    setLoading(true);
    setError("");
    const today = todayInTimezone(prefs.financial.timezone);
    const filtroEntries = Object.entries(filtros).filter(([, v]) => v != null && v !== "");
    if (filtros.ocultarParcelasFuturas === "true") {
      filtroEntries.push(["dataRef", today]);
    }
    const queryParams = new URLSearchParams(Object.fromEntries(filtroEntries)).toString();
    try {
      const response = await fetch(`${API_URL}/transacoes?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Falha ao buscar transações");
      const lista = Array.isArray(data) ? data : [];
      const filtrada =
        filtros.ocultarParcelasFuturas === "true"
          ? lista.filter((t) => !isParcelaSubsequenteFutura(t, today))
          : lista;
      setTransacoes(filtrada);
      window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVincendas = async () => {
    setLoadingVincendas(true);
    try {
      const today = todayInTimezone(prefs.financial.timezone);
      const response = await fetch(
        `${API_URL}/transacoes?apenasParcelasVincendas=true&dataRef=${encodeURIComponent(today)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.ok) {
        const data = await response.json();
        const lista = Array.isArray(data) ? data : [];
        const somenteVincendas = lista
          .filter((t) => isParcelaVincenda(t, today))
          .sort((a, b) => String(a.data).localeCompare(String(b.data)) || a.id - b.id);
        setParcelasVincendas(somenteVincendas);
      }
    } catch {
      // silencioso
    } finally {
      setLoadingVincendas(false);
    }
  };

  const fetchCartoes = async () => {
    try {
      const response = await fetch(`${API_URL}/cartoes`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setCartoes(Array.isArray(data.itens) ? data.itens : []);
      }
    } catch {
      // silencioso
    }
  };

  const notificarCartoesAtualizados = () => {
    fetchCartoes();
    window.dispatchEvent(new Event("mefinance:cartoes-updated"));
    try {
      localStorage.setItem("mefinance:cartoes-updated", String(Date.now()));
    } catch {
      // ignora restrições de storage
    }
  };

  useEffect(() => {
    if (token) {
      fetchCategorias();
      fetchCartoes();
      fetchVincendas();
    }
  }, [token, prefs.financial.timezone]);

  useEffect(() => {
    if (token) fetchTransacoes();
  }, [token, filtros]);

  const handleSave = () => {
    fetchTransacoes();
    fetchVincendas();
    notificarCartoesAtualizados();
  };
  const handleCategoriaSaved = () => {
    fetchCategorias();
    fetchTransacoes();
    fetchVincendas();
  };

  const confirmarDeletar = async () => {
    if (!transacaoParaDeletar) return;
    setDeletando(true);
    try {
      const res = await fetch(`${API_URL}/transacoes/${transacaoParaDeletar}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erro ao deletar transação.");
      }
      toast.success("Transação excluída.");
      setTransacaoParaDeletar(null);
      fetchTransacoes();
      fetchVincendas();
      notificarCartoesAtualizados();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletando(false);
    }
  };

  // Cálculo de resumo instantâneo das transações exibidas
  const resumo = useMemo(() => {
    let rec = 0;
    let desp = 0;
    let aportesPat = 0;
    let resgatesPat = 0;
    transacoes.forEach((t) => {
      const val = parseFloat(t.valor) || 0;
      if (t.tipo === "receita") rec += val;
      else if (t.tipo === "despesa") desp += val;
      else if (t.tipo === "aporte_patrimonio") aportesPat += val;
      else if (t.tipo === "resgate_patrimonio") resgatesPat += val;
    });
    return {
      receitas: rec,
      despesas: desp,
      aportesPatrimonio: aportesPat,
      resgatesPatrimonio: resgatesPat,
      balanco: rec - desp - aportesPat + resgatesPat,
    };
  }, [transacoes]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full">
      {/* 1. Barra de Estatísticas Rápidas no Topo (UX Booster) */}
      <div className={`grid grid-cols-1 gap-4 ${visiveis.length <= 1 ? "sm:grid-cols-1" : visiveis.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {/* Receitas */}
        <div style={cardStyle("receitas")} className="bg-white dark:bg-graphite-800 p-5 rounded-2xl border border-slate-200/80 dark:border-graphite-600 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-graphite-300">
              Receitas Filtradas
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-lime-spark mt-1">
              {formatCurrency(resumo.receitas)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-lime-spark/10 text-emerald-600 dark:text-lime-spark flex items-center justify-center border border-emerald-200/50 dark:border-lime-spark/20">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Despesas */}
        <div style={cardStyle("despesas")} className="bg-white dark:bg-graphite-800 p-5 rounded-2xl border border-slate-200/80 dark:border-graphite-600 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-graphite-300">
              Despesas Filtradas
            </span>
            <p className="text-xl sm:text-2xl font-black text-red-500 dark:text-red-400 mt-1">
              {formatCurrency(resumo.despesas)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center border border-red-200/50 dark:border-red-500/20">
            <TrendingDown size={22} />
          </div>
        </div>

        {/* Saldo Líquido */}
        <div style={cardStyle("saldo")} className="bg-white dark:bg-graphite-800 p-5 rounded-2xl border border-slate-200/80 dark:border-graphite-600 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-graphite-300">
              Saldo do Extrato
            </span>
            <p
              className={`text-xl sm:text-2xl font-black mt-1 ${
                resumo.balanco >= 0
                  ? "text-emerald-600 dark:text-lime-spark"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {formatCurrency(resumo.balanco)}
            </p>
            {(resumo.aportesPatrimonio > 0 || resumo.resgatesPatrimonio > 0) && (
              <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-0.5">
                Patrimônio:{" "}
                {resumo.aportesPatrimonio > 0 ? `-${formatCurrency(resumo.aportesPatrimonio)} reserva` : ""}
                {resumo.aportesPatrimonio > 0 && resumo.resgatesPatrimonio > 0 ? " · " : ""}
                {resumo.resgatesPatrimonio > 0 ? `+${formatCurrency(resumo.resgatesPatrimonio)} resgate` : ""}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-graphite-900 text-slate-700 dark:text-lime-spark flex items-center justify-center border border-slate-200 dark:border-graphite-600">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* 2. Grid de Conteúdo: Formulários à esquerda, Extrato à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 sm:gap-8 w-full items-start">
        {/* Painel Esquerdo */}
        <div className="flex flex-col gap-6 sm:gap-8">
          <div data-tour="transacoes-form">
            <FormTransacao
              onTransacaoAdicionada={handleSave}
              categorias={categorias}
              cartoes={cartoes}
            />
          </div>
          <GerenciarCategorias
            categorias={categorias}
            onCategoriaChange={handleCategoriaSaved}
            onEdit={setCategoriaParaEditar}
          />
        </div>

        {/* Painel Direito: Próximos Vencimentos, Orçamentos, Abas, Filtros e Lista */}
        <div className="flex flex-col gap-6 sm:gap-8">
          <ProximosVencimentos onPago={handleSave} />
          <AlertasOrcamento refreshKey={transacoes.length} />

          {/* Abas: Extrato vs Parcelas Vincendas */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-graphite-900 border border-slate-200/80 dark:border-graphite-600 self-start">
            <button
              type="button"
              onClick={() => setAbaAtiva("extrato")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                abaAtiva === "extrato"
                  ? "bg-white dark:bg-graphite-800 text-slate-900 dark:text-lime-spark shadow-xs border border-slate-200/80 dark:border-graphite-600"
                  : "text-slate-500 dark:text-graphite-300 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <List size={16} />
              Extrato de Transações
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva("vincendas")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                abaAtiva === "vincendas"
                  ? "bg-white dark:bg-graphite-800 text-slate-900 dark:text-lime-spark shadow-xs border border-slate-200/80 dark:border-graphite-600"
                  : "text-slate-500 dark:text-graphite-300 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <CalendarClock size={16} />
              Parcelas Vincendas
              {parcelasVincendas.length > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[0.7rem] font-extrabold ${
                    abaAtiva === "vincendas"
                      ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      : "bg-slate-200 dark:bg-graphite-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {parcelasVincendas.length}
                </span>
              )}
            </button>
          </div>

          {abaAtiva === "extrato" ? (
            <>
              <div data-tour="transacoes-filtros">
                <FiltroTransacoes
                  filtros={filtros}
                  setFiltros={setFiltros}
                  categorias={categorias}
                />
              </div>

              {loading && (
                <div className="bg-white dark:bg-graphite-800 rounded-2xl p-8 text-center border border-slate-200/80 dark:border-graphite-600">
                  <p className="text-slate-500 dark:text-graphite-300 animate-pulse font-medium">
                    Carregando transações...
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-500/20">
                  <AlertCircle size={20} className="shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {!loading && !error && (
                <div data-tour="transacoes-lista">
                  <ListaTransacoes
                    transacoes={transacoes}
                    onEdit={setTransacaoParaEditar}
                    onDelete={(id) => setTransacaoParaDeletar(id)}
                  />
                </div>
              )}
            </>
          ) : (
            <ParcelasVincendas
              parcelas={parcelasVincendas}
              loading={loadingVincendas}
              onEdit={setTransacaoParaEditar}
              onDelete={(id) => setTransacaoParaDeletar(id)}
              timezone={prefs.financial.timezone}
            />
          )}
        </div>
      </div>

      {/* Modais de Edição */}
      {transacaoParaEditar && (
        <ModalEditar
          transacao={transacaoParaEditar}
          onClose={() => setTransacaoParaEditar(null)}
          onSave={handleSave}
          categorias={categorias}
          cartoes={cartoes}
        />
      )}

      {categoriaParaEditar && (
        <ModalEditarCategoria
          categoria={categoriaParaEditar}
          onClose={() => setCategoriaParaEditar(null)}
          onSave={handleCategoriaSaved}
        />
      )}

      {/* Modal de Confirmação de Exclusão (Substitui window.confirm) */}
      <ConfirmDialog
        isOpen={!!transacaoParaDeletar}
        onClose={() => setTransacaoParaDeletar(null)}
        onConfirm={confirmarDeletar}
        loading={deletando}
        title="Excluir Transação"
        message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
        confirmText="Sim, excluir"
      />
    </div>
  );
}

export default Dashboard;
