import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import {
  Flag,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  ArrowUpCircle,
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Landmark,
  ChevronDown,
  PauseCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "./ui/ConfirmDialog";
import { CurrencyInput } from "./CurrencyInput";
import { formatCurrency, formatDate, todayInTimezone } from "../utils/formatters";
import { AppTooltip } from "@/components/ui/Tooltip";

const CATEGORIAS_OBJ = [
  { value: "reserva_emergencia", label: "Reserva de Emergência" },
  { value: "viagem", label: "Viagem" },
  { value: "imovel", label: "Imóvel / Casa Própria" },
  { value: "veiculo", label: "Veículo" },
  { value: "aposentadoria", label: "Aposentadoria" },
  { value: "educacao", label: "Educação" },
  { value: "quitacao", label: "Quitação de Dívida" },
  { value: "outro", label: "Outro" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIAS_OBJ.map((c) => [c.value, c.label]));

const PRIORIDADE_CFG = {
  alta: {
    label: "Alta",
    cls: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
  },
  media: {
    label: "Média",
    cls: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
  },
  baixa: {
    label: "Baixa",
    cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
};

const STATUS_OBJ_CFG = {
  ativo: {
    label: "Ativo",
    cls: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20",
  },
  concluido: {
    label: "Concluído",
    cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
  },
  pausado: {
    label: "Pausado",
    cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  },
};

const PRAZO_CFG = {
  concluido: {
    label: "Meta atingida",
    cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
  },
  no_prazo: {
    label: "No prazo",
    cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
  },
  atencao: {
    label: "Aporte abaixo do necessário",
    cls: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
  },
  atrasado: {
    label: "Prazo vencido",
    cls: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
  },
  em_andamento: {
    label: "Com prazo",
    cls: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20",
  },
  sem_prazo: {
    label: "Sem prazo definido",
    cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
};

const INPUT_CLS =
  "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark";
const LABEL_CLS = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1";
const CARD_CLS =
  "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 font-semibold text-sm disabled:opacity-60 cursor-pointer";
const BTN_SECONDARY =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer";

const FORM_INICIAL = {
  nome: "",
  categoria: "reserva_emergencia",
  valor_alvo: "",
  valor_atual: "",
  aporte_mensal_planejado: "",
  prazo: "",
  prioridade: "media",
  patrimonio_id: "",
  status: "ativo",
  observacoes: "",
};

export default function Objetivos() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";
  const hoje = todayInTimezone(timezone);

  const [resumo, setResumo] = useState(null);
  const [itens, setItens] = useState([]);
  const [patrimonios, setPatrimonios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Modal de contribuição
  const [contribTarget, setContribTarget] = useState(null);
  const [contribForm, setContribForm] = useState({
    tipo: "aporte",
    valor: "",
    data_contribuicao: hoje,
    lancar_transacao: false,
    categoria_id: "",
    observacao: "",
  });
  const [savingContrib, setSavingContrib] = useState(false);

  // Histórico expansível
  const [histObjId, setHistObjId] = useState(null);
  const [contribs, setContribs] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [estornoTarget, setEstornoTarget] = useState(null);
  const [estornando, setEstornando] = useState(false);

  const authHeaders = useCallback(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token],
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const ref = todayInTimezone(timezone);
      const res = await fetch(`${API_URL}/objetivos?refDate=${encodeURIComponent(ref)}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Erro ao carregar objetivos.");
      const data = await res.json();
      setResumo(data.resumo || null);
      setItens(Array.isArray(data.itens) ? data.itens : []);
    } catch (err) {
      toast.error(err.message || "Falha ao carregar objetivos.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, authHeaders, timezone]);

  const carregarAuxiliares = useCallback(async () => {
    try {
      const [patRes, catRes] = await Promise.all([
        fetch(`${API_URL}/patrimonio`, { headers: authHeaders() }),
        fetch(`${API_URL}/categorias?tipo=gasto`, { headers: authHeaders() }),
      ]);
      if (patRes.ok) {
        const pData = await patRes.json();
        setPatrimonios(Array.isArray(pData.itens) ? pData.itens : []);
      }
      if (catRes.ok) {
        const cData = await catRes.json();
        setCategorias(Array.isArray(cData) ? cData : []);
      }
    } catch {
      // silencioso
    }
  }, [API_URL, authHeaders]);

  useEffect(() => {
    carregar();
    carregarAuxiliares();
  }, [carregar, carregarAuxiliares]);

  const itensFiltrados = useMemo(() => {
    if (filtroStatus === "todos") return itens;
    return itens.filter((i) => i.status === filtroStatus);
  }, [itens, filtroStatus]);

  const carregarHistorico = async (objId) => {
    if (histObjId === objId) {
      setHistObjId(null);
      return;
    }
    setHistObjId(objId);
    setLoadingHist(true);
    try {
      const res = await fetch(`${API_URL}/objetivos/${objId}/contribuicoes`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Erro ao carregar histórico.");
      const data = await res.json();
      setContribs(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Falha ao carregar histórico.");
    } finally {
      setLoadingHist(false);
    }
  };

  const abrirCriar = () => {
    setEditId(null);
    setForm(FORM_INICIAL);
    setShowForm(true);
  };

  const abrirEditar = (obj) => {
    setEditId(obj.id);
    setForm({
      nome: obj.nome || "",
      categoria: obj.categoria || "outro",
      valor_alvo: String(obj.valor_alvo ?? ""),
      valor_atual: String(obj.valor_atual ?? ""),
      aporte_mensal_planejado:
        obj.aporte_mensal_planejado != null ? String(obj.aporte_mensal_planejado) : "",
      prazo: obj.prazo || "",
      prioridade: obj.prioridade || "media",
      patrimonio_id: obj.patrimonio_id != null ? String(obj.patrimonio_id) : "",
      status: obj.status || "ativo",
      observacoes: obj.observacoes || "",
    });
    setShowForm(true);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome do objetivo.");
    if (!form.valor_alvo || Number(form.valor_alvo) <= 0) {
      return toast.error("Informe um valor de meta positivo.");
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        categoria: form.categoria,
        valor_alvo: Number(form.valor_alvo),
        valor_atual: form.valor_atual !== "" ? Number(form.valor_atual) : 0,
        aporte_mensal_planejado:
          form.aporte_mensal_planejado !== "" ? Number(form.aporte_mensal_planejado) : null,
        prazo: form.prazo || null,
        prioridade: form.prioridade,
        patrimonio_id: form.patrimonio_id ? parseInt(form.patrimonio_id, 10) : null,
        ...(editId ? { status: form.status } : {}),
        observacoes: form.observacoes.trim(),
      };
      const res = await fetch(editId ? `${API_URL}/objetivos/${editId}` : `${API_URL}/objetivos`, {
        method: editId ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar objetivo.");
      toast.success(editId ? "Objetivo atualizado!" : "Objetivo cadastrado!");
      setShowForm(false);
      setEditId(null);
      setForm(FORM_INICIAL);
      carregar();
    } catch (err) {
      toast.error(err.message || "Falha ao salvar objetivo.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/objetivos/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir objetivo.");
      }
      toast.success("Objetivo excluído.");
      if (histObjId === deleteTarget.id) setHistObjId(null);
      setDeleteTarget(null);
      carregar();
    } catch (err) {
      toast.error(err.message || "Falha ao excluir objetivo.");
    } finally {
      setDeleting(false);
    }
  };

  const handleAlterarStatus = async (obj, novoStatus) => {
    if (!novoStatus || novoStatus === obj.status) return;
    setUpdatingStatusId(obj.id);
    try {
      const res = await fetch(`${API_URL}/objetivos/${obj.id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: novoStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao alterar status.");
      toast.success(`Status alterado para ${STATUS_OBJ_CFG[novoStatus]?.label || novoStatus}.`);
      await carregar();
    } catch (err) {
      toast.error(err.message || "Falha ao alterar status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const abrirContribuicao = (obj) => {
    setContribTarget(obj);
    setContribForm({
      tipo: "aporte",
      valor: obj.aporte_mensal_planejado ? String(obj.aporte_mensal_planejado) : "",
      data_contribuicao: todayInTimezone(timezone),
      lancar_transacao: false,
      categoria_id: categorias[0]?.id != null ? String(categorias[0].id) : "",
      observacao: "",
    });
  };

  const handleContribuir = async (e) => {
    e.preventDefault();
    if (!contribTarget) return;
    const valor = Number(contribForm.valor);
    if (!Number.isFinite(valor) || valor <= 0) return toast.error("Informe um valor positivo.");
    if (contribForm.lancar_transacao && contribForm.tipo === "aporte" && !contribForm.categoria_id) {
      return toast.error("Selecione uma categoria de despesa para lançar no extrato.");
    }

    setSavingContrib(true);
    try {
      const payload = {
        tipo: contribForm.tipo,
        valor,
        data_contribuicao: contribForm.data_contribuicao,
        lancar_transacao: contribForm.lancar_transacao,
        categoria_id:
          contribForm.lancar_transacao && contribForm.tipo === "aporte" && contribForm.categoria_id
            ? parseInt(contribForm.categoria_id, 10)
            : null,
        observacao: contribForm.observacao.trim(),
      };
      const res = await fetch(`${API_URL}/objetivos/${contribTarget.id}/contribuir`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao registrar contribuição.");

      toast.success(
        data.objetivo?.status === "concluido"
          ? "Parabéns! Meta concluída!"
          : "Contribuição registrada!",
      );
      if (payload.lancar_transacao) {
        window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
      }
      const alvoId = contribTarget.id;
      setContribTarget(null);
      await carregar();
      if (histObjId === alvoId) {
        const hRes = await fetch(`${API_URL}/objetivos/${alvoId}/contribuicoes`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        if (hRes.ok) setContribs(await hRes.json());
      }
    } catch (err) {
      toast.error(err.message || "Falha ao registrar contribuição.");
    } finally {
      setSavingContrib(false);
    }
  };

  const handleEstornar = async () => {
    if (!estornoTarget) return;
    setEstornando(true);
    try {
      const res = await fetch(
        `${API_URL}/objetivos/${estornoTarget.objetivo_id}/contribuicoes/${estornoTarget.id}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao estornar contribuição.");
      }
      toast.success("Contribuição estornada.");
      if (estornoTarget.transacao_id) {
        window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
      }
      const alvoId = estornoTarget.objetivo_id;
      setEstornoTarget(null);
      await carregar();
      const hRes = await fetch(`${API_URL}/objetivos/${alvoId}/contribuicoes`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (hRes.ok) setContribs(await hRes.json());
    } catch (err) {
      toast.error(err.message || "Falha ao estornar contribuição.");
    } finally {
      setEstornando(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark">
              <Flag className="w-5 h-5" />
            </span>
            Objetivos Financeiros
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Defina metas com prazo, acompanhe estimativas de conclusão e registre aportes vinculados ao extrato.
          </p>
        </div>
        <button onClick={() => (showForm ? setShowForm(false) : abrirCriar())} className={BTN_PRIMARY}>
          {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          {showForm ? "Fechar formulário" : "Novo Objetivo"}
        </button>
      </div>

      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Acumulado em Metas</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-lime-spark mt-2">
              {formatCurrency(resumo.total_acumulado)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              de {formatCurrency(resumo.total_alvo)} em metas
            </p>
          </div>
          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Progresso Geral</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {resumo.percentual_geral}%
            </p>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-emerald-500 dark:bg-lime-spark transition-all duration-300"
                style={{ width: `${Math.min(100, resumo.percentual_geral)}%` }}
              />
            </div>
          </div>
          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Restante para Metas</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {formatCurrency(resumo.total_restante)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {resumo.contagem.ativos} ativo(s) · {resumo.contagem.concluidos} concluído(s)
            </p>
          </div>
          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Aporte Mensal Planejado</p>
            <p className="text-2xl font-bold text-sky-600 dark:text-sky-300 mt-2">
              {formatCurrency(resumo.aporte_mensal_planejado_total)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Soma das metas ativas</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSalvar} className={`${CARD_CLS} p-6 space-y-4`}>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {editId ? "Editar Objetivo" : "Cadastrar Novo Objetivo"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLS}>Nome *</label>
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="Ex: Reserva 6 meses"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Categoria</label>
              <select
                className={INPUT_CLS}
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                {CATEGORIAS_OBJ.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Prioridade</label>
              <select
                className={INPUT_CLS}
                value={form.prioridade}
                onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Valor da Meta (R$) *</label>
              <CurrencyInput
                value={form.valor_alvo}
                className={INPUT_CLS}
                placeholder="0,00"
                onValueChange={(val) => setForm({ ...form, valor_alvo: val })}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Valor Já Acumulado (R$)</label>
              <CurrencyInput
                value={form.valor_atual}
                className={INPUT_CLS}
                placeholder="0,00"
                onValueChange={(val) => setForm({ ...form, valor_atual: val })}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Aporte Mensal Planejado (R$)</label>
              <CurrencyInput
                value={form.aporte_mensal_planejado}
                className={INPUT_CLS}
                placeholder="Opcional (para estimar prazo)"
                onValueChange={(val) => setForm({ ...form, aporte_mensal_planejado: val })}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Prazo Desejado</label>
              <input
                type="date"
                className={INPUT_CLS}
                value={form.prazo}
                onChange={(e) => setForm({ ...form, prazo: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Ativo de Patrimônio Vinculado</label>
              <select
                className={INPUT_CLS}
                value={form.patrimonio_id}
                onChange={(e) => setForm({ ...form, patrimonio_id: e.target.value })}
              >
                <option value="">Nenhum</option>
                {patrimonios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({formatCurrency(p.valor_atual)})
                  </option>
                ))}
              </select>
            </div>
            {editId && (
              <div>
                <label className={LABEL_CLS}>Status</label>
                <select
                  className={INPUT_CLS}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ativo">Ativo</option>
                  <option value="concluido">Concluído</option>
                  <option value="pausado">Pausado</option>
                </select>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={LABEL_CLS}>Observações</label>
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="Estratégia, detalhes..."
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className={BTN_SECONDARY}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={BTN_PRIMARY}>
              {saving ? "Salvando..." : editId ? "Salvar alterações" : "Cadastrar Objetivo"}
            </button>
          </div>
        </form>
      )}

      {/* Filtro rápido por status */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "todos", label: "Todos" },
          { id: "ativo", label: "Ativos" },
          { id: "concluido", label: "Concluídos" },
          { id: "pausado", label: "Pausados" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFiltroStatus(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${filtroStatus === tab.id
                ? "bg-emerald-600 dark:bg-lime-spark text-white dark:text-slate-900 border-transparent"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={`${CARD_CLS} p-10 text-center text-sm text-slate-500 dark:text-slate-400`}>
          Carregando objetivos...
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div className={`${CARD_CLS} p-10 text-center space-y-2`}>
          <Flag className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nenhum objetivo encontrado neste filtro.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clique em &ldquo;Novo Objetivo&rdquo; para planejar suas metas financeiras.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {itensFiltrados.map((obj) => {
            const prio = PRIORIDADE_CFG[obj.prioridade] || PRIORIDADE_CFG.media;
            const prazoCfg = PRAZO_CFG[obj.situacao_prazo] || PRAZO_CFG.sem_prazo;
            const pct = Math.min(100, Number(obj.percentual_concluido || 0));
            const aberto = histObjId === obj.id;
            return (
              <div
                key={obj.id}
                className={`${CARD_CLS} p-5 space-y-3 ${obj.status === "pausado" ? "opacity-65" : ""}`}
              >
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 min-w-0 flex-1">
                      {obj.nome}
                    </h3>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                      <button onClick={() => abrirContribuicao(obj)} className={`${BTN_SECONDARY} whitespace-nowrap`}>
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Aportar / Resgatar
                      </button>
                      <button onClick={() => carregarHistorico(obj.id)} className={`${BTN_SECONDARY} whitespace-nowrap`}>
                        <History className="w-3.5 h-3.5" /> {aberto ? "Ocultar histórico" : "Histórico"}
                      </button>
                      <AppTooltip content="Editar objetivo">
                        <button
                          onClick={() => abrirEditar(obj)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </AppTooltip>
                      <AppTooltip content="Excluir objetivo">
                        <button
                          onClick={() => setDeleteTarget(obj)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AppTooltip>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const stCfg = STATUS_OBJ_CFG[obj.status] || STATUS_OBJ_CFG.ativo;
                      return (
                        <AppTooltip content="Alterar status rapidamente">
                          <div
                            className={`relative inline-flex items-center rounded-full border ${stCfg.cls}`}
                          >
                            <span className="pl-2.5 flex items-center pointer-events-none">
                              {obj.status === "concluido" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {obj.status === "pausado" && <PauseCircle className="w-3 h-3 mr-1" />}
                            </span>
                            <select
                              aria-label={`Status de ${obj.nome}`}
                              value={obj.status}
                              disabled={updatingStatusId === obj.id}
                              onChange={(e) => handleAlterarStatus(obj, e.target.value)}
                              className="appearance-none bg-transparent pr-6 py-0.5 text-xs font-medium focus:outline-none cursor-pointer disabled:opacity-60"
                            >
                              <option value="ativo" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                Ativo
                              </option>
                              <option value="pausado" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                Pausado
                              </option>
                              <option value="concluido" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                Concluído
                              </option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none opacity-75" />
                          </div>
                        </AppTooltip>
                      );
                    })()}
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {CAT_LABEL[obj.categoria] || obj.categoria}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${prio.cls}`}>
                      Prioridade {prio.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${prazoCfg.cls}`}>
                      {obj.situacao_prazo === "concluido" || obj.situacao_prazo === "no_prazo" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : obj.situacao_prazo === "atencao" || obj.situacao_prazo === "atrasado" ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {prazoCfg.label}
                    </span>
                    {obj.patrimonio_nome && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20">
                        <Landmark className="w-3 h-3" /> {obj.patrimonio_nome}
                      </span>
                    )}
                  </div>

                  {obj.observacoes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{obj.observacoes}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                    <span>
                      Acumulado:{" "}
                      <strong className="text-slate-800 dark:text-slate-100">
                        {formatCurrency(obj.valor_atual)}
                      </strong>{" "}
                      de {formatCurrency(obj.valor_alvo)} ({pct}%)
                    </span>
                    <span>
                      Falta:{" "}
                      <strong className="text-slate-800 dark:text-slate-100">
                        {formatCurrency(obj.valor_restante)}
                      </strong>
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${obj.status === "concluido"
                          ? "bg-emerald-500 dark:bg-lime-spark"
                          : obj.situacao_prazo === "atrasado"
                            ? "bg-red-500"
                            : obj.situacao_prazo === "atencao"
                              ? "bg-amber-500"
                              : "bg-emerald-500 dark:bg-lime-spark"
                        }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex flex-wrap items-center gap-4">
                    {obj.aporte_mensal_planejado != null && (
                      <span>
                        Aporte planejado:{" "}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {formatCurrency(obj.aporte_mensal_planejado)}/mês
                        </strong>
                      </span>
                    )}
                    {obj.status !== "concluido" && obj.meses_estimados != null && (
                      <span>
                        Previsão:{" "}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {obj.meses_estimados} mês(es) ({formatDate(obj.data_estimada)})
                        </strong>
                        {obj.considera_rendimento_patrimonio && (
                          <span className="ml-1 text-[11px] text-emerald-600 dark:text-lime-spark">
                            (com rend. est. {obj.taxa_mensal_patrimonio}% a.m.)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {obj.prazo && (
                    <span>
                      Prazo: <strong className="text-slate-700 dark:text-slate-200">{formatDate(obj.prazo)}</strong>
                      {obj.status !== "concluido" && obj.aporte_necessario_prazo != null && (
                        <>
                          {" "}
                          · Necessário:{" "}
                          <strong className="text-slate-700 dark:text-slate-200">
                            {formatCurrency(obj.aporte_necessario_prazo)}/mês
                          </strong>
                        </>
                      )}
                    </span>
                  )}
                </div>

                {aberto && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Histórico de Contribuições
                    </h4>
                    {loadingHist ? (
                      <p className="text-xs text-slate-500">Carregando...</p>
                    ) : contribs.length === 0 ? (
                      <p className="text-xs text-slate-500">Nenhuma contribuição registrada ainda.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {contribs.map((c) => (
                          <div key={c.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-100 capitalize">
                                {c.tipo}
                              </span>{" "}
                              <span className="text-slate-500 dark:text-slate-400">
                                em {formatDate(c.data_contribuicao)}
                              </span>
                              {c.observacao && (
                                <span className="text-slate-500 dark:text-slate-400"> · {c.observacao}</span>
                              )}
                              {c.transacao_id && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]">
                                  No extrato
                                </span>
                              )}
                              {c.patrimonio_movimentacao_id && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px]">
                                  Via patrimônio
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {c.tipo === "resgate" ? "-" : "+"} {formatCurrency(c.valor)}
                              </span>
                              <button
                                onClick={() => setEstornoTarget(c)}
                                className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" /> Estornar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Contribuição */}
      {contribTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleContribuir} className={`${CARD_CLS} p-6 max-w-md w-full shadow-xl space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Contribuição — {contribTarget.nome}
              </h3>
              <button
                type="button"
                onClick={() => setContribTarget(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "aporte", label: "Aporte (+)" },
                { id: "resgate", label: "Resgate (−)" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setContribForm({ ...contribForm, tipo: opt.id })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${contribForm.tipo === opt.id
                      ? "bg-emerald-600 dark:bg-lime-spark text-white dark:text-slate-900 border-transparent"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Valor (R$) *</label>
                <CurrencyInput
                  value={contribForm.valor}
                  className={INPUT_CLS}
                  placeholder="0,00"
                  onValueChange={(val) => setContribForm({ ...contribForm, valor: val })}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Data</label>
                <input
                  type="date"
                  className={INPUT_CLS}
                  value={contribForm.data_contribuicao}
                  onChange={(e) => setContribForm({ ...contribForm, data_contribuicao: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contribForm.lancar_transacao}
                  onChange={(e) =>
                    setContribForm({ ...contribForm, lancar_transacao: e.target.checked })
                  }
                />
                {contribForm.tipo === "aporte"
                  ? "Registrar aporte como saída no extrato (Transações)"
                  : "Registrar resgate como entrada no extrato"}
              </label>
              {contribForm.lancar_transacao && contribForm.tipo === "aporte" && (
                <div>
                  <label className={LABEL_CLS}>Categoria da despesa *</label>
                  <select
                    className={INPUT_CLS}
                    value={contribForm.categoria_id}
                    onChange={(e) => setContribForm({ ...contribForm, categoria_id: e.target.value })}
                    required
                  >
                    <option value="">Selecione...</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className={LABEL_CLS}>Observação</label>
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="Ex: 13º salário, aporte do mês..."
                value={contribForm.observacao}
                onChange={(e) => setContribForm({ ...contribForm, observacao: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setContribTarget(null)} className={BTN_SECONDARY}>
                Cancelar
              </button>
              <button type="submit" disabled={savingContrib} className={BTN_PRIMARY}>
                {savingContrib ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleExcluir}
        loading={deleting}
        title="Excluir objetivo"
        message={`Excluir o objetivo "${deleteTarget?.nome}"? O histórico de contribuições será removido.`}
        confirmText="Excluir"
      />
      <ConfirmDialog
        isOpen={Boolean(estornoTarget)}
        onClose={() => setEstornoTarget(null)}
        onConfirm={handleEstornar}
        loading={estornando}
        title="Estornar contribuição"
        message="O valor acumulado do objetivo será revertido e, caso tenha sido lançada no extrato, a transação vinculada também será excluída. Confirmar?"
        confirmText="Estornar"
      />
    </div>
  );
}
