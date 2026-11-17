import React, { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import TecoHint from "./teco/TecoHint";
import {
  Landmark,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  PauseCircle,
  TrendingDown,
  Calculator,
  History,
  RotateCcw,
  DollarSign,
  Flame,
  Snowflake,
  Calendar,
  Tag,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "./ui/ConfirmDialog";
import { AppTooltip } from "@/components/ui/Tooltip";
import { formatCurrency, formatDate, todayInTimezone } from "../utils/formatters";
import { CurrencyInput } from "./CurrencyInput";
import {
  applySmartDebtChange,
  recomputeSmartDebt,
  buildInitialManualMap,
} from "../utils/dividaCalc";

const TIPOS_DIVIDA = {
  emprestimo: "Empréstimo",
  financiamento: "Financiamento",
  cartao_parcelado: "Cartão Parcelado",
  outro: "Outro",
};

const STATUS_CFG = {
  ativa: {
    label: "Ativa",
    badge:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
    bar: "bg-emerald-500 dark:bg-lime-spark",
  },
  quitada: {
    label: "Quitada",
    badge:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
    bar: "bg-emerald-500 dark:bg-lime-spark",
  },
  pausada: {
    label: "Pausada",
    badge:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    bar: "bg-slate-400",
  },
};

const AMORT_TIPO_LABEL = {
  parcela: "Parcela",
  amortizacao_extra: "Amortização Extra",
  quitacao: "Quitação",
};

const FORM_INICIAL = {
  nome: "",
  credor: "",
  tipo: "emprestimo",
  valor_original: "",
  saldo_devedor: "",
  taxa_juros_mensal: "",
  total_parcelas: "",
  parcelas_pagas: "0",
  valor_parcela: "",
  dia_vencimento: "",
  categoria_id: "",
  status: "ativa",
  observacoes: "",
};

export default function Dividas() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";

  const [resumo, setResumo] = useState(null);
  const [itens, setItens] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todas");

  // Formulário criar/editar
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [manualFields, setManualFields] = useState({});
  const [autoFields, setAutoFields] = useState({});
  const [saving, setSaving] = useState(false);

  // Excluir dívida
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Painel de amortização
  const [amortTarget, setAmortTarget] = useState(null);
  const [amortForm, setAmortForm] = useState({
    tipo: "parcela",
    valor_pago: "",
    valor_juros: "",
    data_pagamento: todayInTimezone(timezone),
    lancar_transacao: true,
    observacao: "",
  });
  const [savingAmort, setSavingAmort] = useState(false);

  // Histórico expansível por dívida
  const [historicoAbertoId, setHistoricoAbertoId] = useState(null);
  const [historicoLista, setHistoricoLista] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [estornoTarget, setEstornoTarget] = useState(null);
  const [estornando, setEstornando] = useState(false);

  // Simulador
  const [simTarget, setSimTarget] = useState(null);
  const [simForm, setSimForm] = useState({ aporte_extra: "", valor_parcela: "" });
  const [simResultado, setSimResultado] = useState(null);
  const [simulando, setSimulando] = useState(false);

  const carregarDividas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/dividas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao carregar dívidas");
      const data = await res.json();
      setResumo(data.resumo || null);
      setItens(Array.isArray(data.itens) ? data.itens : []);
    } catch (err) {
      toast.error(err.message || "Falha ao carregar dívidas.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  const carregarCategorias = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/categorias?tipo=gasto`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : []);
      }
    } catch {
      // silencioso
    }
  }, [API_URL, token]);

  useEffect(() => {
    carregarDividas();
    carregarCategorias();
  }, [carregarDividas, carregarCategorias]);

  const carregarHistorico = useCallback(
    async (dividaId) => {
      setLoadingHistorico(true);
      try {
        const res = await fetch(`${API_URL}/dividas/${dividaId}/amortizacoes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Erro ao carregar histórico");
        const data = await res.json();
        setHistoricoLista(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error(err.message || "Falha ao carregar histórico.");
      } finally {
        setLoadingHistorico(false);
      }
    },
    [API_URL, token]
  );

  const toggleHistorico = (dividaId) => {
    if (historicoAbertoId === dividaId) {
      setHistoricoAbertoId(null);
      setHistoricoLista([]);
    } else {
      setHistoricoAbertoId(dividaId);
      carregarHistorico(dividaId);
    }
  };

  const abrirCriar = () => {
    setEditId(null);
    setForm(FORM_INICIAL);
    setManualFields({});
    setAutoFields({});
    setShowForm(true);
  };

  const abrirEditar = (item) => {
    setEditId(item.id);
    const nextForm = {
      nome: item.nome || "",
      credor: item.credor || "",
      tipo: item.tipo || "emprestimo",
      valor_original: String(item.valor_original ?? ""),
      saldo_devedor: String(item.saldo_devedor ?? ""),
      taxa_juros_mensal: item.taxa_juros_mensal != null ? String(item.taxa_juros_mensal) : "",
      total_parcelas: item.total_parcelas != null ? String(item.total_parcelas) : "",
      parcelas_pagas: item.parcelas_pagas != null ? String(item.parcelas_pagas) : "0",
      valor_parcela: item.valor_parcela != null ? String(item.valor_parcela) : "",
      dia_vencimento: item.dia_vencimento != null ? String(item.dia_vencimento) : "",
      categoria_id: item.categoria_id != null ? String(item.categoria_id) : "",
      status: item.status || "ativa",
      observacoes: item.observacoes || "",
    };
    setForm(nextForm);
    setManualFields(buildInitialManualMap(nextForm));
    setAutoFields({});
    setShowForm(true);
  };

  const handleSmartFieldChange = (field, value) => {
    const res = applySmartDebtChange(form, manualFields, field, value);
    setForm(res.form);
    setManualFields(res.manual);
    setAutoFields(res.autoFields);
  };

  const handleSmartBlur = () => {
    const res = recomputeSmartDebt(form, manualFields);
    setForm(res.form);
    setManualFields(res.manual);
    setAutoFields(res.autoFields);
  };

  const handleRecalcularDerivados = () => {
    const baseManual = {};
    if (form.valor_original !== "") baseManual.valor_original = true;
    if (form.saldo_devedor !== "") baseManual.saldo_devedor = true;
    if (form.total_parcelas !== "") baseManual.total_parcelas = true;
    if (form.parcelas_pagas !== "") baseManual.parcelas_pagas = true;
    const res = recomputeSmartDebt(
      { ...form, taxa_juros_mensal: "", valor_parcela: "" },
      baseManual
    );
    setForm(res.form);
    setManualFields(res.manual);
    setAutoFields(res.autoFields);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome da dívida.");
      return;
    }
    const valorOriginal = Number(form.valor_original);
    if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
      toast.error("Informe um valor original válido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        credor: form.credor.trim() || null,
        tipo: form.tipo,
        valor_original: valorOriginal,
        saldo_devedor:
          form.saldo_devedor !== "" ? Number(form.saldo_devedor) : valorOriginal,
        parcelas_pagas:
          form.parcelas_pagas !== "" ? parseInt(form.parcelas_pagas, 10) : 0,
        taxa_juros_mensal:
          form.taxa_juros_mensal !== "" ? Number(form.taxa_juros_mensal) : 0,
        total_parcelas:
          form.total_parcelas !== "" ? parseInt(form.total_parcelas, 10) : null,
        valor_parcela:
          form.valor_parcela !== "" ? Number(form.valor_parcela) : null,
        dia_vencimento:
          form.dia_vencimento !== "" ? parseInt(form.dia_vencimento, 10) : null,
        categoria_id:
          form.categoria_id !== "" ? parseInt(form.categoria_id, 10) : null,
        observacoes: form.observacoes.trim() || null,
      };

      if (editId) {
        payload.status = form.status;
      }

      const url = editId ? `${API_URL}/dividas/${editId}` : `${API_URL}/dividas`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar dívida.");

      toast.success(editId ? "Dívida atualizada!" : "Dívida cadastrada!");
      setShowForm(false);
      setEditId(null);
      setForm(FORM_INICIAL);
      setManualFields({});
      setAutoFields({});
      carregarDividas();
    } catch (err) {
      toast.error(err.message || "Falha ao salvar dívida.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/dividas/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir dívida.");
      }
      toast.success("Dívida excluída.");
      if (historicoAbertoId === deleteTarget.id) {
        setHistoricoAbertoId(null);
        setHistoricoLista([]);
      }
      setDeleteTarget(null);
      carregarDividas();
    } catch (err) {
      toast.error(err.message || "Falha ao excluir dívida.");
    } finally {
      setDeleting(false);
    }
  };

  const abrirAmortizar = (item) => {
    setAmortTarget(item);
    const valorPadrao =
      item.valor_parcela && Number(item.valor_parcela) > 0
        ? String(Math.min(Number(item.valor_parcela), Number(item.saldo_devedor)))
        : String(item.saldo_devedor ?? "");
    setAmortForm({
      tipo: "parcela",
      valor_pago: valorPadrao,
      valor_juros: "",
      data_pagamento: todayInTimezone(timezone),
      lancar_transacao: true,
      observacao: "",
    });
  };

  const handleTipoAmortChange = (novoTipo) => {
    if (!amortTarget) return;
    let valorSugerido = amortForm.valor_pago;
    if (novoTipo === "quitacao") {
      valorSugerido = String(amortTarget.saldo_devedor ?? "");
    } else if (novoTipo === "parcela" && amortTarget.valor_parcela) {
      valorSugerido = String(
        Math.min(Number(amortTarget.valor_parcela), Number(amortTarget.saldo_devedor))
      );
    }
    setAmortForm((prev) => ({
      ...prev,
      tipo: novoTipo,
      valor_pago: valorSugerido,
    }));
  };

  const handleConfirmarAmortizacao = async (e) => {
    e.preventDefault();
    if (!amortTarget) return;
    const valorPago = Number(amortForm.valor_pago);
    if (!Number.isFinite(valorPago) || valorPago <= 0) {
      toast.error("Informe um valor pago válido.");
      return;
    }

    setSavingAmort(true);
    try {
      const res = await fetch(`${API_URL}/dividas/${amortTarget.id}/amortizar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipo: amortForm.tipo,
          valor_pago: valorPago,
          valor_juros: amortForm.valor_juros !== "" ? Number(amortForm.valor_juros) : 0,
          data_pagamento: amortForm.data_pagamento || todayInTimezone(timezone),
          lancar_transacao: amortForm.lancar_transacao,
          observacao: amortForm.observacao.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao registrar pagamento.");

      toast.success("Pagamento registrado!");
      if (amortForm.lancar_transacao) {
        window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
      }
      const dividaId = amortTarget.id;
      setAmortTarget(null);
      await carregarDividas();
      if (historicoAbertoId === dividaId) {
        await carregarHistorico(dividaId);
      }
    } catch (err) {
      toast.error(err.message || "Falha ao registrar pagamento.");
    } finally {
      setSavingAmort(false);
    }
  };

  const handleEstornar = async () => {
    if (!estornoTarget) return;
    setEstornando(true);
    try {
      const { dividaId, amortId } = estornoTarget;
      const res = await fetch(
        `${API_URL}/dividas/${dividaId}/amortizacoes/${amortId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao estornar pagamento.");
      }
      toast.success("Pagamento estornado.");
      window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
      setEstornoTarget(null);
      await carregarDividas();
      if (historicoAbertoId === dividaId) {
        await carregarHistorico(dividaId);
      }
    } catch (err) {
      toast.error(err.message || "Falha ao estornar pagamento.");
    } finally {
      setEstornando(false);
    }
  };

  const handleAlterarStatus = async (item, novoStatus) => {
    if (!novoStatus || novoStatus === item.status) return;
    setUpdatingStatusId(item.id);
    try {
      const res = await fetch(`${API_URL}/dividas/${item.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: novoStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar status.");
      toast.success(`Status alterado para ${STATUS_CFG[novoStatus]?.label || novoStatus}.`);
      await carregarDividas();
    } catch (err) {
      toast.error(err.message || "Falha ao alterar status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const abrirSimulador = (item) => {
    setSimTarget(item);
    setSimResultado(null);
    setSimForm({
      aporte_extra: "200",
      valor_parcela: item.valor_parcela ? String(item.valor_parcela) : "",
    });
  };

  const handleSimular = async (e) => {
    e.preventDefault();
    if (!simTarget) return;
    setSimulando(true);
    try {
      const res = await fetch(`${API_URL}/dividas/${simTarget.id}/simular`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          aporte_extra: simForm.aporte_extra !== "" ? Number(simForm.aporte_extra) : 0,
          valor_parcela:
            simForm.valor_parcela !== "" ? Number(simForm.valor_parcela) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao simular amortização.");
      setSimResultado(data);
    } catch (err) {
      toast.error(err.message || "Falha ao simular amortização.");
    } finally {
      setSimulando(false);
    }
  };

  const itensFiltrados =
    filtroStatus === "todas"
      ? itens
      : itens.filter((i) => i.status === filtroStatus);

  const avalancheTopId = resumo?.estrategias?.avalanche_ids?.[0] || null;
  const bolaNeveTopId = resumo?.estrategias?.bola_de_neve_ids?.[0] || null;

  const percentualGlobalQuitado =
    resumo && resumo.total_original > 0
      ? Math.min(100, Math.round((resumo.total_amortizado / resumo.total_original) * 1000) / 10)
      : 0;

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark">
              <Landmark className="w-5 h-5" />
            </span>
            Dívidas &amp; Amortização
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe parcelas, registre amortizações extras e simule economia de juros.
          </p>
        </div>

        <button
          onClick={() => (showForm ? setShowForm(false) : abrirCriar())}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 font-semibold text-sm shadow-sm transition-colors cursor-pointer"
        >
          {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          {showForm ? "Fechar formulário" : "Nova Dívida"}
        </button>
      </div>

      {/* Cards de resumo */}
      {resumo && (
        <div data-tour="dividas-resumo" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                Saldo Devedor Total
                <TecoHint metricId="saldo_devedor" />
              </span>
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {formatCurrency(resumo.total_saldo_devedor)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Original: {formatCurrency(resumo.total_original)}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Total Amortizado</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-lime-spark" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-lime-spark mt-2">
              {formatCurrency(resumo.total_amortizado)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {percentualGlobalQuitado}% quitado no total
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                Comprometimento Mensal
                <TecoHint metricId="divida_comprometimento" />
              </span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {formatCurrency(resumo.comprometimento_mensal)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Taxa média: {Number(resumo.taxa_media_ponderada || 0).toFixed(2)}% a.m.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Status das Dívidas</span>
              <Landmark className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {resumo.contagem?.ativas || 0}{" "}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                ativa(s)
              </span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {resumo.contagem?.quitadas || 0} quitada(s) · {resumo.contagem?.pausadas || 0}{" "}
              pausada(s)
            </p>
          </div>
        </div>
      )}

      {/* Formulário de criação/edição */}
      {showForm && (
        <form
          onSubmit={handleSalvar}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {editId ? "Editar Dívida" : "Cadastrar Nova Dívida"}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Financiamento Carro"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Credor / Instituição
              </label>
              <input
                type="text"
                value={form.credor}
                onChange={(e) => setForm({ ...form, credor: e.target.value })}
                placeholder="Ex: Banco Itaú"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Tipo
              </label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              >
                {Object.entries(TIPOS_DIVIDA).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                <span>Valor Original (R$) *</span>
                {autoFields.valor_original && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark text-[0.65rem] font-bold">
                    Auto
                  </span>
                )}
              </label>
              <CurrencyInput
                value={form.valor_original}
                onValueChange={(val) => handleSmartFieldChange("valor_original", val)}
                onBlur={handleSmartBlur}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                <span>Saldo Devedor Atual (R$)</span>
                {autoFields.saldo_devedor && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark text-[0.65rem] font-bold">
                    Auto
                  </span>
                )}
              </label>
              <CurrencyInput
                value={form.saldo_devedor}
                onValueChange={(val) => handleSmartFieldChange("saldo_devedor", val)}
                onBlur={handleSmartBlur}
                placeholder="Igual ao original se vazio"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                <span>Taxa de Juros (% a.m.)</span>
                {autoFields.taxa_juros_mensal && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark text-[0.65rem] font-bold">
                    Auto
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.taxa_juros_mensal}
                onChange={(e) => handleSmartFieldChange("taxa_juros_mensal", e.target.value)}
                onBlur={handleSmartBlur}
                placeholder="Ex: 1.5"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                <span>Valor da Parcela (R$)</span>
                {autoFields.valor_parcela && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark text-[0.65rem] font-bold">
                    Auto
                  </span>
                )}
              </label>
              <CurrencyInput
                value={form.valor_parcela}
                onValueChange={(val) => handleSmartFieldChange("valor_parcela", val)}
                onBlur={handleSmartBlur}
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                <span>Total de Parcelas</span>
                {autoFields.total_parcelas && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark text-[0.65rem] font-bold">
                    Auto
                  </span>
                )}
              </label>
              <input
                type="number"
                min="1"
                value={form.total_parcelas}
                onChange={(e) => handleSmartFieldChange("total_parcelas", e.target.value)}
                onBlur={handleSmartBlur}
                placeholder="Ex: 36"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Parcelas já Pagas
              </label>
              <input
                type="number"
                min="0"
                value={form.parcelas_pagas}
                onChange={(e) => handleSmartFieldChange("parcelas_pagas", e.target.value)}
                onBlur={handleSmartBlur}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Dia de Vencimento
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.dia_vencimento}
                onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
                placeholder="1 a 31"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Categoria (para lançar parcelas)
              </label>
              <select
                value={form.categoria_id}
                onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              >
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            {editId && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
                >
                  <option value="ativa">Ativa</option>
                  <option value="pausada">Pausada</option>
                  <option value="quitada">Quitada</option>
                </select>
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Observações
              </label>
              <input
                type="text"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Contrato, condições, etc."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-lime-spark"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-lime-spark shrink-0" />
              <span>
                Campos vazios são calculados automaticamente. Edite qualquer campo livremente.
              </span>
              {form.valor_original !== "" && form.total_parcelas !== "" && (
                <button
                  type="button"
                  onClick={handleRecalcularDerivados}
                  className="text-emerald-700 dark:text-lime-spark font-semibold hover:underline cursor-pointer"
                >
                  Recalcular taxa/parcela
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-sm font-semibold disabled:opacity-60 cursor-pointer"
              >
                {saving ? "Salvando..." : editId ? "Salvar alterações" : "Cadastrar Dívida"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filtros e legenda de estratégias */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {[
            { id: "todas", label: "Todas" },
            { id: "ativa", label: "Ativas" },
            { id: "quitada", label: "Quitadas" },
            { id: "pausada", label: "Pausadas" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroStatus(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filtroStatus === f.id
                  ? "bg-emerald-600 dark:bg-lime-spark text-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {(avalancheTopId || bolaNeveTopId) && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              Avalanche: maior juros primeiro
            </span>
            <span className="inline-flex items-center gap-1">
              <Snowflake className="w-3.5 h-3.5 text-sky-500" />
              Bola de Neve: menor saldo primeiro
            </span>
          </div>
        )}
      </div>

      {/* Lista de dívidas */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Carregando dívidas...
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div data-tour="dividas-lista" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <Landmark className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nenhuma dívida encontrada neste filtro.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clique em &ldquo;Nova Dívida&rdquo; para acompanhar parcelas e simular amortizações.
          </p>
        </div>
      ) : (
        <div data-tour="dividas-lista" className="space-y-4">
          {itensFiltrados.map((item) => {
            const cfg = STATUS_CFG[item.status] || STATUS_CFG.ativa;
            const isAvalancheTop = item.id === avalancheTopId;
            const isBolaNeveTop = item.id === bolaNeveTopId;
            const pct = Math.min(100, Math.max(0, Number(item.percentual_quitado || 0)));

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
              >
                {/* Topo do card */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {item.nome}
                      </h3>
                      <AppTooltip content="Alterar status rapidamente">
                        <div
                          className={`relative inline-flex items-center rounded-full border ${cfg.badge}`}
                        >
                        <span className="pl-2.5 flex items-center pointer-events-none">
                          {item.status === "quitada" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {item.status === "pausada" && <PauseCircle className="w-3 h-3 mr-1" />}
                        </span>
                        <select
                          aria-label={`Status de ${item.nome}`}
                          value={item.status}
                          disabled={updatingStatusId === item.id}
                          onChange={(e) => handleAlterarStatus(item, e.target.value)}
                          className="appearance-none bg-transparent pr-6 py-0.5 text-xs font-medium focus:outline-none cursor-pointer disabled:opacity-60"
                        >
                          <option value="ativa" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                            Ativa
                          </option>
                          <option value="pausada" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                            Pausada
                          </option>
                          <option value="quitada" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                            Quitada
                          </option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none opacity-75" />
                        </div>
                      </AppTooltip>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {TIPOS_DIVIDA[item.tipo] || item.tipo}
                      </span>
                      {isAvalancheTop && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/20">
                          <Flame className="w-3 h-3" />
                          #1 Avalanche
                        </span>
                      )}
                      {isBolaNeveTop && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20">
                          <Snowflake className="w-3 h-3" />
                          #1 Bola de Neve
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.credor && <span>Credor: {item.credor}</span>}
                      {item.total_parcelas != null && (
                        <span>
                          Parcelas: {item.parcelas_pagas}/{item.total_parcelas}
                          {item.parcelas_restantes != null &&
                            ` (${item.parcelas_restantes} restantes)`}
                        </span>
                      )}
                      {item.valor_parcela != null && (
                        <span>Parcela: {formatCurrency(item.valor_parcela)}</span>
                      )}
                      <span>Juros: {Number(item.taxa_juros_mensal || 0).toFixed(2)}% a.m.</span>
                      {item.dia_vencimento && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Dia {item.dia_vencimento}
                        </span>
                      )}
                      {item.categoria_nome && (
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {item.categoria_nome}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-2">
                    {item.status !== "quitada" && (
                      <button
                        onClick={() => abrirAmortizar(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Pagar / Amortizar
                      </button>
                    )}
                    {item.status !== "quitada" && (
                      <button
                        onClick={() => abrirSimulador(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        Simular
                      </button>
                    )}
                    <button
                      onClick={() => toggleHistorico(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      Histórico
                    </button>
                    <AppTooltip content="Editar dívida">
                      <button
                        onClick={() => abrirEditar(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </AppTooltip>
                    <AppTooltip content="Excluir dívida">
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AppTooltip>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Amortizado:{" "}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {formatCurrency(item.valor_amortizado_total)}
                      </strong>{" "}
                      ({pct}%)
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Saldo devedor:{" "}
                      <strong className="text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.saldo_devedor)}
                      </strong>{" "}
                      de {formatCurrency(item.valor_original)}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${cfg.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {item.observacoes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {item.observacoes}
                  </p>
                )}

                {/* Histórico expansível */}
                {historicoAbertoId === item.id && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Histórico de Pagamentos &amp; Amortizações
                    </h4>
                    {loadingHistorico ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Carregando histórico...
                      </p>
                    ) : historicoLista.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Nenhum pagamento registrado ainda.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {historicoLista.map((h) => (
                          <div
                            key={h.id}
                            className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-medium text-slate-700 dark:text-slate-200">
                                {formatDate(h.data_pagamento)}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {AMORT_TIPO_LABEL[h.tipo] || h.tipo}
                              </span>
                              <span className="text-slate-700 dark:text-slate-200 font-semibold">
                                Pago: {formatCurrency(h.valor_pago)}
                              </span>
                              {Number(h.valor_juros) > 0 && (
                                <span className="text-slate-500 dark:text-slate-400">
                                  (Juros: {formatCurrency(h.valor_juros)} · Amortizado:{" "}
                                  {formatCurrency(h.valor_amortizado)})
                                </span>
                              )}
                              {h.observacao && (
                                <span className="text-slate-500 dark:text-slate-400">
                                  — {h.observacao}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() =>
                                setEstornoTarget({ dividaId: item.id, amortId: h.id })
                              }
                              className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Estornar
                            </button>
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

      {/* Modal Pagar / Amortizar */}
      {amortTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmarAmortizacao}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pagar / Amortizar — {amortTarget.nome}
              </h3>
              <button
                type="button"
                onClick={() => setAmortTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Saldo devedor atual:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatCurrency(amortTarget.saldo_devedor)}
              </strong>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Tipo de pagamento
                </label>
                <select
                  value={amortForm.tipo}
                  onChange={(e) => handleTipoAmortChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="parcela">Pagamento de Parcela</option>
                  <option value="amortizacao_extra">Amortização Extra</option>
                  <option value="quitacao">Quitação Total</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Valor Pago (R$) *
                  </label>
                  <CurrencyInput
                    value={amortForm.valor_pago}
                    onValueChange={(val) => setAmortForm({ ...amortForm, valor_pago: val })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Juros inclusos (R$)
                  </label>
                  <CurrencyInput
                    value={amortForm.valor_juros}
                    onValueChange={(val) =>
                      setAmortForm({ ...amortForm, valor_juros: val })
                    }
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={amortForm.data_pagamento}
                  onChange={(e) =>
                    setAmortForm({ ...amortForm, data_pagamento: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Observação
                </label>
                <input
                  type="text"
                  value={amortForm.observacao}
                  onChange={(e) =>
                    setAmortForm({ ...amortForm, observacao: e.target.value })
                  }
                  placeholder="Opcional"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={amortForm.lancar_transacao}
                  onChange={(e) =>
                    setAmortForm({ ...amortForm, lancar_transacao: e.target.checked })
                  }
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Lançar este pagamento também em Transações / Orçamento
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAmortTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingAmort}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-sm font-semibold disabled:opacity-60 cursor-pointer"
              >
                {savingAmort ? "Registrando..." : "Confirmar Pagamento"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Simulador */}
      {simTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600 dark:text-lime-spark" />
                Simular Amortização — {simTarget.nome}
              </h3>
              <button
                type="button"
                onClick={() => setSimTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimular} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Parcela Mensal Base (R$)
                </label>
                <CurrencyInput
                  value={simForm.valor_parcela}
                  onValueChange={(val) =>
                    setSimForm({ ...simForm, valor_parcela: val })
                  }
                  placeholder="0,00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Aporte Extra Mensal (R$)
                </label>
                <CurrencyInput
                  value={simForm.aporte_extra}
                  onValueChange={(val) =>
                    setSimForm({ ...simForm, aporte_extra: val })
                  }
                  placeholder="0,00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={simulando}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-sm font-semibold disabled:opacity-60 cursor-pointer"
                >
                  {simulando ? "Simulando..." : "Calcular Economia"}
                </button>
              </div>
            </form>

            {simResultado && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Cenário Atual
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      Prazo:{" "}
                      {simResultado.cenario_atual?.quitavel
                        ? `${simResultado.cenario_atual.meses} meses`
                        : "Não quita (juros ≥ parcela)"}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      Juros totais: {formatCurrency(simResultado.cenario_atual?.juros_totais || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 space-y-1">
                    <p className="font-semibold text-emerald-700 dark:text-lime-spark">
                      Com Aporte Extra
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300">
                      Prazo:{" "}
                      {simResultado.cenario_com_aporte?.quitavel
                        ? `${simResultado.cenario_com_aporte.meses} meses`
                        : "Não quita"}
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300">
                      Juros totais:{" "}
                      {formatCurrency(simResultado.cenario_com_aporte?.juros_totais || 0)}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-lime-spark/15 dark:bg-lime-spark/10 border border-emerald-200 dark:border-lime-spark/25 text-xs flex items-center justify-between">
                  <span className="font-medium text-emerald-800 dark:text-lime-spark">
                    Economia estimada:
                  </span>
                  <span className="font-bold text-emerald-900 dark:text-lime-spark">
                    {simResultado.economia?.meses_economizados || 0} mês(es) e{" "}
                    {formatCurrency(simResultado.economia?.juros_economizados || 0)} em juros
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmação de exclusão de dívida */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleExcluir}
        loading={deleting}
        title="Excluir dívida"
        message={`Deseja excluir "${deleteTarget?.nome}" e todo o histórico de amortizações?`}
        confirmText="Excluir"
      />

      {/* Confirmação de estorno */}
      <ConfirmDialog
        isOpen={Boolean(estornoTarget)}
        onClose={() => setEstornoTarget(null)}
        onConfirm={handleEstornar}
        loading={estornando}
        title="Estornar pagamento"
        message="O saldo devedor será restaurado e eventual transação vinculada será removida. Confirmar?"
        confirmText="Estornar"
      />
    </div>
  );
}

