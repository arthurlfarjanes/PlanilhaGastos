import React, { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import {
  PlusCircle,
  Pencil,
  Trash2,
  CalendarDays,
  Tag,
  DollarSign,
  FileText,
  X,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Undo2,
  PauseCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "./ui/ConfirmDialog";
import { formatCurrency, formatDate, todayInTimezone } from "../utils/formatters";
import { CurrencyInput } from "./CurrencyInput";
import { AppTooltip } from "@/components/ui/Tooltip";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const STATUS_BADGE = {
  pago: {
    label: "Pago",
    cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
    Icon: CheckCircle2,
  },
  atrasado: {
    label: "Atrasado",
    cls: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
    Icon: AlertTriangle,
  },
  vence_hoje: {
    label: "Vence hoje",
    cls: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
    Icon: Clock,
  },
  pendente: {
    label: "Pendente",
    cls: "bg-slate-100 dark:bg-graphite-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-graphite-600",
    Icon: Clock,
  },
  inativo: {
    label: "Pausado",
    cls: "bg-slate-100 dark:bg-graphite-900 text-slate-400 dark:text-graphite-400 border-slate-200 dark:border-graphite-600",
    Icon: PauseCircle,
  },
};

export default function GerenciarGastosFixos() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";

  const [competencia, setCompetencia] = useState(() => {
    const [y, m] = todayInTimezone(timezone).split("-").map(Number);
    return { ano: y, mes: m };
  });

  const [gastos, setGastos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [filtroTab, setFiltroTab] = useState("todos");

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [tipo, setTipo] = useState("despesa");
  const [isAssinatura, setIsAssinatura] = useState(false);
  const [gerarAutomatico, setGerarAutomatico] = useState(true);
  const [ativo, setAtivo] = useState(true);

  const [gastoEditando, setGastoEditando] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acaoId, setAcaoId] = useState(null);
  const [error, setError] = useState("");
  const [gastoParaDeletar, setGastoParaDeletar] = useState(null);
  const [deletando, setDeletando] = useState(false);

  const carregarCategorias = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/categorias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setCategorias(data);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
    }
  }, [API_URL, token]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `mes=${competencia.mes}&ano=${competencia.ano}`;
      const [resItens, resResumo] = await Promise.all([
        fetch(`${API_URL}/gastos-fixos?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/gastos-fixos/resumo?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const dataItens = await resItens.json();
      if (resItens.ok) {
        setGastos(dataItens);
      } else {
        setError(dataItens.error || "Erro ao carregar contas e recorrências.");
      }
      if (resResumo.ok) {
        setResumo(await resResumo.json());
      }
    } catch {
      setError("Erro de conexão ao buscar contas e recorrências.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, competencia]);

  useEffect(() => {
    if (token) carregarCategorias();
  }, [token, carregarCategorias]);

  useEffect(() => {
    if (token) carregarDados();
  }, [token, carregarDados]);

  const mudarMes = (delta) => {
    setCompetencia((prev) => {
      let m = prev.mes + delta;
      let y = prev.ano;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      return { ano: y, mes: m };
    });
  };

  const limparFormulario = () => {
    setGastoEditando(null);
    setDescricao("");
    setValor("");
    setDiaVencimento("");
    setCategoriaId("");
    setTipo("despesa");
    setIsAssinatura(false);
    setGerarAutomatico(true);
    setAtivo(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descricao || !valor || !diaVencimento) {
      setError("Preencha descrição, valor e dia do vencimento.");
      return;
    }
    setLoading(true);
    setError("");

    const endpoint = gastoEditando
      ? `${API_URL}/gastos-fixos/${gastoEditando.id}`
      : `${API_URL}/gastos-fixos`;
    const method = gastoEditando ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          descricao,
          valor: parseFloat(valor),
          dia_vencimento: parseInt(diaVencimento, 10),
          categoria_id: categoriaId || null,
          tipo,
          is_assinatura: isAssinatura,
          gerar_automatico: gerarAutomatico,
          ativo,
        }),
      });

      if (response.ok) {
        toast.success(gastoEditando ? "Recorrência atualizada!" : "Recorrência adicionada!");
        limparFormulario();
        carregarDados();
      } else {
        const errData = await response.json();
        setError(errData.error || "Erro ao salvar conta fixa.");
      }
    } catch {
      setError("Erro de conexão ao salvar conta fixa.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditarClick = (gasto) => {
    setGastoEditando(gasto);
    setDescricao(gasto.descricao);
    setValor(gasto.valor);
    setDiaVencimento(gasto.dia_vencimento);
    setCategoriaId(gasto.categoria_id || "");
    setTipo(gasto.tipo || "despesa");
    setIsAssinatura(Boolean(gasto.is_assinatura));
    setGerarAutomatico(gasto.gerar_automatico !== false);
    setAtivo(gasto.ativo !== false);
    setError("");
  };

  const handleMarcarPago = async (gasto) => {
    setAcaoId(gasto.id);
    try {
      const response = await fetch(`${API_URL}/gastos-fixos/${gasto.id}/pagar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ano: competencia.ano,
          mes: competencia.mes,
          data_pagamento: todayInTimezone(timezone),
          lancar_transacao: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível registrar o pagamento.");
      }
      toast.success(
        gasto.tipo === "receita"
          ? "Recebimento confirmado e lançado no extrato!"
          : "Pagamento registrado e lançado no extrato!",
      );
      carregarDados();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAcaoId(null);
    }
  };

  const handleDesfazerPagamento = async (gasto) => {
    setAcaoId(gasto.id);
    try {
      const response = await fetch(
        `${API_URL}/gastos-fixos/${gasto.id}/pagar?mes=${competencia.mes}&ano=${competencia.ano}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível desfazer o pagamento.");
      }
      toast.success("Pagamento estornado para pendente.");
      carregarDados();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAcaoId(null);
    }
  };

  const confirmarExcluir = async () => {
    if (!gastoParaDeletar) return;
    setDeletando(true);
    try {
      const response = await fetch(`${API_URL}/gastos-fixos/${gastoParaDeletar}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setGastoParaDeletar(null);
        toast.success("Recorrência removida.");
        carregarDados();
      }
    } catch (err) {
      console.error("Erro ao deletar transação fixa:", err);
    } finally {
      setDeletando(false);
    }
  };

  const gastosFiltrados = gastos.filter((g) => {
    if (filtroTab === "pendentes") {
      return ["atrasado", "vence_hoje", "pendente"].includes(g.status_competencia);
    }
    if (filtroTab === "pagos") return g.status_competencia === "pago";
    if (filtroTab === "assinaturas") return Boolean(g.is_assinatura);
    return true;
  });

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2E3342] bg-slate-50 dark:bg-[#14171F] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-[#8E9AA8] focus:outline-none focus:ring-2 focus:ring-[var(--color-lime-spark)]/40 focus:border-[var(--color-lime-spark)] dark:focus:border-[var(--color-lime-spark)] transition-all text-sm";

  const labelClass =
    "text-xs font-semibold text-slate-500 dark:text-[#8E9AA8] flex items-center gap-1 mb-1.5";

  const totalReceitas = resumo?.total_receitas_previstas ?? 0;
  const totalDespesas = resumo?.total_despesas_previstas ?? 0;
  const totalPagas = resumo?.total_despesas_pagas ?? 0;
  const totalPendentes = resumo?.total_despesas_pendentes ?? 0;
  const totalAssinaturas = resumo?.total_assinaturas ?? 0;
  const balancoMensal = resumo?.balanco_previsto ?? 0;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full">
      {/* Cabeçalho + Seletor de Competência */}
      <div className="bg-white dark:bg-graphite-800 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-graphite-600 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-lime-spark/15 dark:bg-lime-spark/10 text-[var(--accent-strong)] dark:text-lime-spark flex items-center justify-center border border-lime-spark/30">
                <CalendarDays size={22} />
              </span>
              Contas, Vencimentos e Assinaturas
            </h1>
            <p className="text-sm text-slate-500 dark:text-graphite-300 mt-1 ml-12.5">
              Acompanhe contas fixas, vencimentos do mês e assinaturas recorrentes
            </p>
          </div>

          {/* Navegador de Competência (Mês/Ano) */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 dark:bg-graphite-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-graphite-600">
            <button
              type="button"
              onClick={() => mudarMes(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-graphite-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-slate-800 dark:text-white min-w-[130px] text-center">
              {MESES[competencia.mes - 1]} {competencia.ano}
            </span>
            <button
              type="button"
              onClick={() => mudarMes(1)}
              className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-graphite-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Resumo Consolidado (calculado no backend em centavos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
            <ArrowUpCircle size={18} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Receitas Previstas
              </p>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalReceitas)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 rounded-xl border border-red-100 dark:border-red-500/20">
            <ArrowDownCircle size={18} className="text-red-500 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide">
                A Pagar / Pago no Mês
              </p>
              <p className="text-sm font-black text-red-600 dark:text-red-400">
                {formatCurrency(totalPendentes)}{" "}
                <span className="text-[11px] font-semibold opacity-75">
                  / {formatCurrency(totalPagas)} pago
                </span>
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${
              balancoMensal >= 0
                ? "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400"
                : "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400"
            }`}
          >
            <Wallet size={18} className="shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                Balanço Previsto ({formatCurrency(totalDespesas)} desp.)
              </p>
              <p className="text-sm font-black">{formatCurrency(balancoMensal)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-violet-50 dark:bg-violet-500/10 px-3.5 py-2.5 rounded-xl border border-violet-100 dark:border-violet-500/20 text-violet-600 dark:text-violet-400">
            <Repeat size={18} className="shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                Assinaturas ({resumo?.contagem?.assinaturas ?? 0})
              </p>
              <p className="text-sm font-black">{formatCurrency(totalAssinaturas)}/mês</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-500/20">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Formulário */}
      <div
        data-tour="fixas-form"
        className={`bg-white dark:bg-graphite-800 p-5 sm:p-6 rounded-2xl border shadow-xs transition-all ${
          gastoEditando
            ? "border-blue-300 dark:border-blue-500/40"
            : "border-slate-200/80 dark:border-graphite-600"
        }`}
      >
        <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-5 flex items-center gap-2">
          {gastoEditando ? (
            <>
              <Pencil size={18} className="text-blue-500" />
              Editar Conta / Recorrência
            </>
          ) : (
            <>
              <PlusCircle
                size={18}
                className="text-[var(--accent-strong)] dark:text-lime-spark"
              />
              Nova Conta ou Assinatura
            </>
          )}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div className="flex flex-col">
              <label className={labelClass}>Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className={inputClass + " cursor-pointer font-semibold"}
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </div>

            <div className="flex flex-col md:col-span-2">
              <label className={labelClass}>
                <FileText size={13} /> Descrição
              </label>
              <input
                type="text"
                placeholder="Ex: Salário, Aluguel, Streaming..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>
                <DollarSign size={13} /> Valor
              </label>
              <CurrencyInput
                className={inputClass}
                value={valor}
                onValueChange={(val) => setValor(val)}
                required
              />
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>
                <CalendarDays size={13} /> Dia Vcto.
              </label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 10"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>
                <Tag size={13} /> Categoria
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className={inputClass + " cursor-pointer"}
              >
                <option value="">Sem Categoria</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                  gastoEditando
                    ? "bg-blue-500 hover:bg-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]"
                    : "bg-lime-spark hover:bg-lime-spark-hover text-graphite-900 shadow-[0_4px_12px_rgba(182,255,226,0.3)]"
                }`}
              >
                {loading ? "Salvando..." : gastoEditando ? "Salvar" : "Adicionar"}
              </button>

              {gastoEditando && (
                <AppTooltip content="Cancelar Edição">
                  <button
                    type="button"
                    onClick={limparFormulario}
                    className="bg-slate-100 dark:bg-graphite-700 hover:bg-slate-200 dark:hover:bg-graphite-600 text-slate-600 dark:text-slate-300 p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer border border-slate-200 dark:border-graphite-600"
                  >
                    <X size={20} />
                  </button>
                </AppTooltip>
              )}
            </div>
          </div>

          {/* Opções de Recorrência */}
          <div className="flex flex-wrap items-center gap-5 pt-1 text-xs text-slate-600 dark:text-graphite-300">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAssinatura}
                onChange={(e) => setIsAssinatura(e.target.checked)}
                className="rounded border-slate-300 dark:border-graphite-500 accent-[var(--accent-strong)]"
              />
              <Repeat size={14} className="text-violet-500" />
              <span>Marcar como Assinatura / Serviço recorrente</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={gerarAutomatico}
                onChange={(e) => setGerarAutomatico(e.target.checked)}
                className="rounded border-slate-300 dark:border-graphite-500 accent-[var(--accent-strong)]"
              />
              <span>Lançar automaticamente no extrato no dia do vencimento</span>
            </label>

            {gastoEditando && (
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="rounded border-slate-300 dark:border-graphite-500 accent-[var(--accent-strong)]"
                />
                <span>Recorrência ativa</span>
              </label>
            )}
          </div>
        </form>
      </div>

      {/* Tabela de Listagem */}
      <div data-tour="fixas-lista" className="bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200/80 dark:border-graphite-600 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-graphite-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Contas e Assinaturas ({MESES[competencia.mes - 1]}/{competencia.ano})
            </h2>
            {gastos.length > 0 && (
              <span className="text-xs font-bold text-slate-400 dark:text-graphite-300 bg-slate-100 dark:bg-graphite-700 px-2.5 py-1 rounded-full">
                {gastosFiltrados.length} de {gastos.length}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "todos", label: "Todas" },
              { id: "pendentes", label: "Pendentes / Atrasadas" },
              { id: "pagos", label: "Pagas" },
              { id: "assinaturas", label: "Assinaturas" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroTab(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  filtroTab === f.id
                    ? "bg-[var(--accent-strong)] text-white dark:text-graphite-950"
                    : "bg-slate-100 dark:bg-graphite-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-graphite-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-graphite-900/60 border-b border-slate-100 dark:border-graphite-600 text-slate-400 dark:text-graphite-400 text-xs uppercase tracking-wider font-bold">
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Vencimento</th>
                <th className="py-3.5 px-5">Descrição</th>
                <th className="py-3.5 px-5">Categoria</th>
                <th className="py-3.5 px-5">Valor</th>
                <th className="py-3.5 px-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-graphite-600 text-sm">
              {loading && gastos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400 dark:text-graphite-300">
                    <p className="animate-pulse">Carregando...</p>
                  </td>
                </tr>
              ) : gastosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-graphite-300">
                      <CalendarDays size={30} className="opacity-40" />
                      <p className="font-medium">Nenhuma conta ou assinatura encontrada.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                gastosFiltrados.map((gasto) => {
                  const isReceita = gasto.tipo === "receita";
                  const badge = STATUS_BADGE[gasto.status_competencia] || STATUS_BADGE.pendente;
                  const StatusIcon = badge.Icon;
                  const isPago = gasto.status_competencia === "pago";

                  return (
                    <tr
                      key={gasto.id}
                      className={`hover:bg-slate-50 dark:hover:bg-graphite-900/40 transition-colors ${
                        !gasto.ativo ? "opacity-60" : ""
                      }`}
                    >
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.cls}`}
                          >
                            <StatusIcon size={12} />
                            {badge.label}
                          </span>
                          {gasto.pagamento?.data_pagamento && (
                            <span className="text-[11px] text-slate-400 dark:text-graphite-300">
                              em {formatDate(gasto.pagamento.data_pagamento)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-graphite-700 text-slate-700 dark:text-slate-300 text-xs font-bold">
                          <CalendarDays size={12} />
                          {formatDate(gasto.data_vencimento)}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {gasto.descricao}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                isReceita
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-500 dark:text-red-400"
                              }`}
                            >
                              {isReceita ? (
                                <ArrowUpCircle size={11} />
                              ) : (
                                <ArrowDownCircle size={11} />
                              )}
                              {isReceita ? "Receita" : "Despesa"}
                            </span>
                            {gasto.is_assinatura && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px] font-bold">
                                <Repeat size={10} /> Assinatura
                              </span>
                            )}
                            {!gasto.gerar_automatico && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-graphite-700 text-slate-500 dark:text-graphite-300 text-[10px] font-semibold">
                                Manual
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        {gasto.categoria_nome ? (
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm inline-block"
                            style={{
                              backgroundColor: gasto.categoria_cor || "#10b981",
                            }}
                          >
                            {gasto.categoria_nome}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-graphite-300 text-xs italic">
                            Sem categoria
                          </span>
                        )}
                      </td>

                      <td
                        className={`py-4 px-5 font-black ${
                          isReceita
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        <div className="font-bold whitespace-nowrap">
                          {isReceita ? "+ " : "- "}
                          {formatCurrency(parseFloat(gasto.valor))}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-2">
                          {isPago ? (
                            <AppTooltip content="Desfazer pagamento e remover lançamento vinculado">
                              <button
                                type="button"
                                disabled={acaoId === gasto.id}
                                onClick={() => handleDesfazerPagamento(gasto)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-graphite-700 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white transition-all cursor-pointer text-xs font-semibold disabled:opacity-50"
                              >
                                <Undo2 size={13} />
                                Desfazer
                              </button>
                            </AppTooltip>
                          ) : (
                            gasto.ativo && (
                              <AppTooltip content="Marcar como pago nesta competência e lançar no extrato">
                                <button
                                  type="button"
                                  disabled={acaoId === gasto.id}
                                  onClick={() => handleMarcarPago(gasto)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer text-xs font-bold border border-emerald-200/70 dark:border-emerald-500/30 disabled:opacity-50"
                                >
                                  <CheckCircle2 size={13} />
                                  {isReceita ? "Recebido" : "Pagar"}
                                </button>
                              </AppTooltip>
                            )
                          )}

                          <AppTooltip content="Editar">
                            <button
                              onClick={() => handleEditarClick(gasto)}
                              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all cursor-pointer border border-blue-200/60 dark:border-blue-500/20"
                            >
                              <Pencil size={15} />
                            </button>
                          </AppTooltip>
                          <AppTooltip content="Excluir">
                            <button
                              onClick={() => setGastoParaDeletar(gasto.id)}
                              className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer border border-red-200/60 dark:border-red-500/20"
                            >
                              <Trash2 size={15} />
                            </button>
                          </AppTooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!gastoParaDeletar}
        onClose={() => setGastoParaDeletar(null)}
        onConfirm={confirmarExcluir}
        loading={deletando}
        title="Remover Conta / Recorrência"
        message="Tem certeza que deseja remover esta conta fixa? Esta ação não pode ser desfeita."
        confirmText="Sim, remover"
      />
    </div>
  );
}
