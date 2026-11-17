import React, { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import {
  Target,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Tag,
  DollarSign,
  Bell,
  Wallet,
  PauseCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "./ui/ConfirmDialog";
import { formatCurrency, todayInTimezone } from "../utils/formatters";
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

const STATUS_CFG = {
  ok: {
    label: "Dentro do limite",
    badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
    bar: "bg-emerald-500 dark:bg-lime-spark",
    Icon: CheckCircle2,
  },
  alerta: {
    label: "Atenção",
    badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
    bar: "bg-amber-500",
    Icon: AlertTriangle,
  },
  excedido: {
    label: "Excedido",
    badge: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
    bar: "bg-red-500",
    Icon: AlertCircle,
  },
  inativo: {
    label: "Pausado",
    badge: "bg-slate-100 dark:bg-graphite-900 text-slate-400 dark:text-graphite-400 border-slate-200 dark:border-graphite-600",
    bar: "bg-slate-400",
    Icon: PauseCircle,
  },
};

export default function Orcamentos() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";

  const [competencia, setCompetencia] = useState(() => {
    const [y, m] = todayInTimezone(timezone).split("-").map(Number);
    return { ano: y, mes: m };
  });

  const [itens, setItens] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [categorias, setCategorias] = useState([]);

  const [categoriaId, setCategoriaId] = useState("");
  const [valorLimite, setValorLimite] = useState("");
  const [alertaPercentual, setAlertaPercentual] = useState(80);
  const [ativo, setAtivo] = useState(true);
  const [editando, setEditando] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paraDeletar, setParaDeletar] = useState(null);
  const [deletando, setDeletando] = useState(false);

  const carregarCategorias = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/categorias`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCategorias(await res.json());
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    }
  }, [API_URL, token]);

  const carregarOrcamentos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/orcamentos?mes=${competencia.mes}&ano=${competencia.ano}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar orçamentos.");
      setItens(data.itens || []);
      setResumo(data.resumo || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, competencia]);

  useEffect(() => {
    if (token) carregarCategorias();
  }, [token, carregarCategorias]);

  useEffect(() => {
    if (token) carregarOrcamentos();
  }, [token, carregarOrcamentos]);

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
    setEditando(null);
    setCategoriaId("");
    setValorLimite("");
    setAlertaPercentual(80);
    setAtivo(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editando && !categoriaId) {
      setError("Selecione uma categoria.");
      return;
    }
    if (!valorLimite || parseFloat(valorLimite) <= 0) {
      setError("Informe um valor limite positivo.");
      return;
    }

    setLoading(true);
    setError("");

    const url = editando ? `${API_URL}/orcamentos/${editando.id}` : `${API_URL}/orcamentos`;
    const method = editando ? "PUT" : "POST";
    const body = editando
      ? {
          valor_limite: parseFloat(valorLimite),
          alerta_percentual: parseInt(alertaPercentual, 10) || 80,
          ativo,
        }
      : {
          categoria_id: parseInt(categoriaId, 10),
          valor_limite: parseFloat(valorLimite),
          alerta_percentual: parseInt(alertaPercentual, 10) || 80,
        };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar orçamento.");
      toast.success(editando ? "Orçamento atualizado!" : "Orçamento criado!");
      limparFormulario();
      carregarOrcamentos();
      window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (item) => {
    setEditando(item);
    setCategoriaId(String(item.categoria_id));
    setValorLimite(String(item.valor_limite));
    setAlertaPercentual(item.alerta_percentual);
    setAtivo(item.ativo !== false);
    setError("");
  };

  const confirmarExcluir = async () => {
    if (!paraDeletar) return;
    setDeletando(true);
    try {
      const res = await fetch(`${API_URL}/orcamentos/${paraDeletar}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao excluir orçamento.");
      toast.success("Orçamento removido.");
      setParaDeletar(null);
      carregarOrcamentos();
      window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletando(false);
    }
  };

  const categoriasDisponiveis = categorias.filter(
    (c) => !itens.some((i) => i.categoria_id === c.id) || editando?.categoria_id === c.id,
  );

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2E3342] bg-slate-50 dark:bg-[#14171F] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-[#8E9AA8] focus:outline-none focus:ring-2 focus:ring-[var(--color-lime-spark)]/40 focus:border-[var(--color-lime-spark)] transition-all text-sm";

  const labelClass =
    "text-xs font-semibold text-slate-500 dark:text-[#8E9AA8] flex items-center gap-1 mb-1.5";

  const totalOrcado = resumo?.total_orcado ?? 0;
  const totalGasto = resumo?.total_gasto ?? 0;
  const saldoDisponivel = resumo?.saldo_disponivel ?? 0;
  const alertasCount =
    (resumo?.contagem?.em_alerta ?? 0) + (resumo?.contagem?.excedidos ?? 0);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full">
      {/* Cabeçalho + Seletor de Competência */}
      <div className="bg-white dark:bg-graphite-800 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-graphite-600 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-lime-spark/15 dark:bg-lime-spark/10 text-[var(--accent-strong)] dark:text-lime-spark flex items-center justify-center border border-lime-spark/30">
                <Target size={22} />
              </span>
              Orçamentos por Categoria
            </h1>
            <p className="text-sm text-slate-500 dark:text-graphite-300 mt-1 ml-12.5">
              Defina limites mensais de gastos e acompanhe o consumo em tempo real
            </p>
          </div>

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

        {/* Cards de Resumo */}
        <div data-tour="orcamentos-resumo" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-graphite-900 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-graphite-600">
            <Target size={18} className="text-[var(--accent-strong)] dark:text-lime-spark shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-graphite-300 uppercase tracking-wide">
                Total Orçado
              </p>
              <p className="text-sm font-black text-slate-800 dark:text-white">
                {formatCurrency(totalOrcado)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-blue-50 dark:bg-blue-500/10 px-3.5 py-2.5 rounded-xl border border-blue-100 dark:border-blue-500/20">
            <DollarSign size={18} className="text-blue-500 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                Gasto no Mês ({resumo?.percentual_geral ?? 0}%)
              </p>
              <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                {formatCurrency(totalGasto)}
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${
              saldoDisponivel >= 0
                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400"
            }`}
          >
            <Wallet size={18} className="shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                {saldoDisponivel >= 0 ? "Disponível" : "Excedido"}
              </p>
              <p className="text-sm font-black">
                {formatCurrency(Math.abs(saldoDisponivel))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 rounded-xl border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-300">
            <Bell size={18} className="shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                Categorias em Alerta
              </p>
              <p className="text-sm font-black">
                {alertasCount} de {resumo?.contagem?.ativos ?? 0}
              </p>
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
            className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Formulário */}
      <div
        className={`bg-white dark:bg-graphite-800 p-5 sm:p-6 rounded-2xl border shadow-xs ${
          editando
            ? "border-blue-300 dark:border-blue-500/40"
            : "border-slate-200/80 dark:border-graphite-600"
        }`}
      >
        <h2 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-5 flex items-center gap-2">
          {editando ? (
            <>
              <Pencil size={18} className="text-blue-500" />
              Editar Orçamento ({editando.categoria_nome})
            </>
          ) : (
            <>
              <PlusCircle size={18} className="text-[var(--accent-strong)] dark:text-lime-spark" />
              Novo Orçamento Mensal
            </>
          )}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="flex flex-col md:col-span-2">
            <label className={labelClass}>
              <Tag size={13} /> Categoria
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              disabled={Boolean(editando)}
              className={inputClass + " cursor-pointer disabled:opacity-60"}
              required
            >
              <option value="">Selecione uma categoria</option>
              {categoriasDisponiveis.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className={labelClass}>
              <DollarSign size={13} /> Limite Mensal
            </label>
            <CurrencyInput
              className={inputClass}
              value={valorLimite}
              onValueChange={(val) => setValorLimite(val)}
              required
            />
          </div>

          <div className="flex flex-col">
            <label className={labelClass}>
              <Bell size={13} /> Alertar em (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={alertaPercentual}
              onChange={(e) => setAlertaPercentual(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-60 ${
                editando
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-lime-spark hover:bg-lime-spark-hover text-graphite-900"
              }`}
            >
              {loading ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
            </button>
            {editando && (
              <AppTooltip content="Cancelar Edição">
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="bg-slate-100 dark:bg-graphite-700 hover:bg-slate-200 dark:hover:bg-graphite-600 text-slate-600 dark:text-slate-300 p-2.5 rounded-xl border border-slate-200 dark:border-graphite-600 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </AppTooltip>
            )}
          </div>

          {editando && (
            <label className="md:col-span-5 inline-flex items-center gap-2 text-xs text-slate-600 dark:text-graphite-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="accent-[var(--accent-strong)]"
              />
              <span>Orçamento ativo</span>
            </label>
          )}
        </form>
      </div>

      {/* Lista de Orçamentos */}
      <div data-tour="orcamentos-lista">
      {itens.length === 0 ? (
        <div className="bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200/80 dark:border-graphite-600 p-12 text-center flex flex-col items-center gap-2 text-slate-400 dark:text-graphite-300">
          <Target size={32} className="opacity-40" />
          <p className="font-medium">Nenhum orçamento configurado ainda.</p>
          <p className="text-xs">Escolha uma categoria acima para definir seu primeiro limite mensal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {itens.map((item) => {
            const cfg = STATUS_CFG[item.status] || STATUS_CFG.ok;
            const StatusIcon = cfg.Icon;
            const barWidth = Math.min(100, Math.max(0, item.percentual_consumido));

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200/80 dark:border-graphite-600 p-5 flex flex-col gap-3.5 shadow-xs ${
                  !item.ativo ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.categoria_cor }}
                    />
                    <h3 className="font-bold text-slate-800 dark:text-white truncate">
                      {item.categoria_nome}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${cfg.badge}`}
                  >
                    <StatusIcon size={12} />
                    {cfg.label}
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="flex flex-col gap-1.5">
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-graphite-900 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${cfg.bar}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-graphite-300">
                    <span>
                      Gasto:{" "}
                      <strong className="text-slate-800 dark:text-slate-100">
                        {formatCurrency(item.gasto_realizado)}
                      </strong>{" "}
                      de {formatCurrency(item.valor_limite)}
                    </span>
                    <span className="font-bold">{item.percentual_consumido}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-graphite-600 text-xs">
                  <span
                    className={`font-semibold ${
                      item.saldo_restante < 0
                        ? "text-red-500"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {item.saldo_restante < 0
                      ? `Excedido em ${formatCurrency(Math.abs(item.saldo_restante))}`
                      : `Restam ${formatCurrency(item.saldo_restante)}`}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <AppTooltip content="Editar">
                      <button
                        type="button"
                        onClick={() => handleEditar(item)}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
                      >
                        <Pencil size={14} />
                      </button>
                    </AppTooltip>
                    <AppTooltip content="Excluir">
                      <button
                        type="button"
                        onClick={() => setParaDeletar(item.id)}
                        className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </AppTooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      <ConfirmDialog
        isOpen={!!paraDeletar}
        onClose={() => setParaDeletar(null)}
        onConfirm={confirmarExcluir}
        loading={deletando}
        title="Excluir Orçamento"
        message="Tem certeza que deseja remover este orçamento? Suas transações não serão afetadas."
        confirmText="Sim, excluir"
      />
    </div>
  );
}

