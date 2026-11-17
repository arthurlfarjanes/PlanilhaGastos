import React, { useState, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import {
  Landmark,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  ArrowUpCircle,
  History,
  RotateCcw,
  Droplets,
  TrendingUp,
  ArrowRight,
  Flag,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "./ui/ConfirmDialog";
import { CurrencyInput } from "./CurrencyInput";
import { formatCurrency, formatDate, todayInTimezone } from "../utils/formatters";
import { AppTooltip } from "@/components/ui/Tooltip";

const TIPOS_PATRIMONIO = [
  { value: "reserva_emergencia", label: "Reserva de Emergência", color: "bg-emerald-500 dark:bg-lime-spark" },
  { value: "conta_corrente", label: "Conta Corrente", color: "bg-sky-500" },
  { value: "poupanca", label: "Poupança", color: "bg-cyan-500" },
  { value: "renda_fixa", label: "Renda Fixa (CDB/Tesouro)", color: "bg-indigo-500" },
  { value: "renda_variavel", label: "Renda Variável (Ações/FIIs)", color: "bg-violet-500" },
  { value: "previdencia", label: "Previdência", color: "bg-amber-500" },
  { value: "imovel", label: "Imóvel", color: "bg-rose-500" },
  { value: "veiculo", label: "Veículo", color: "bg-orange-500" },
  { value: "outro", label: "Outro", color: "bg-slate-500" },
];

const TIPO_LABEL = Object.fromEntries(TIPOS_PATRIMONIO.map((t) => [t.value, t.label]));
const TIPO_COLOR = Object.fromEntries(TIPOS_PATRIMONIO.map((t) => [t.value, t.color]));

const LIQUIDEZ_CFG = {
  imediata: {
    label: "Liquidez Imediata",
    cls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
  },
  media: {
    label: "Liquidez Média",
    cls: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20",
  },
  baixa: {
    label: "Baixa Liquidez",
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
  tipo: "reserva_emergencia",
  instituicao: "",
  valor_atual: "",
  valor_investido: "",
  rendimento_tipo: "nenhum",
  rendimento_valor: "",
  cdi_referencia: "14.65",
  liquidez: "imediata",
  ativo: true,
  observacoes: "",
};

const RENDIMENTO_TIPOS = [
  { value: "nenhum", label: "Sem projeção de rendimento" },
  { value: "cdi_percentual", label: "% do CDI (CDB / Caixinha / LCI)" },
  { value: "anual", label: "% ao ano (Prefixado)" },
  { value: "mensal", label: "% ao mês" },
];

function previewRendimentoForm(form) {
  const valNum = Number(form.rendimento_valor);
  if (form.rendimento_tipo === "nenhum" || !Number.isFinite(valNum) || valNum <= 0) {
    return null;
  }
  let anualDec = 0;
  let mensalDec = 0;
  if (form.rendimento_tipo === "cdi_percentual") {
    const cdi = Number(form.cdi_referencia);
    const cdiValido = Number.isFinite(cdi) && cdi > 0 ? cdi : 14.65;
    anualDec = (cdiValido / 100) * (valNum / 100);
    mensalDec = Math.pow(1 + anualDec, 1 / 12) - 1;
  } else if (form.rendimento_tipo === "anual") {
    anualDec = valNum / 100;
    mensalDec = Math.pow(1 + anualDec, 1 / 12) - 1;
  } else if (form.rendimento_tipo === "mensal") {
    mensalDec = valNum / 100;
    anualDec = Math.pow(1 + mensalDec, 12) - 1;
  }
  const saldoNum = Number(form.valor_atual) || 0;
  return {
    taxaAnualPct: Math.round(anualDec * 10000) / 100,
    taxaMensalPct: Math.round(mensalDec * 10000) / 100,
    mensalEst: saldoNum * mensalDec,
    anualEst: saldoNum * anualDec,
  };
}

export default function Patrimonio() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";
  const hoje = todayInTimezone(timezone);

  const [resumo, setResumo] = useState(null);
  const [itens, setItens] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Modal de movimentação (aporte, resgate, ajuste)
  const [movTarget, setMovTarget] = useState(null);
  const [movForm, setMovForm] = useState({
    tipo: "aporte",
    valor: "",
    data_movimentacao: hoje,
    lancar_transacao: false,
    categoria_id: "",
    observacao: "",
  });
  const [savingMov, setSavingMov] = useState(false);

  // Histórico expansível por ativo
  const [histItemId, setHistItemId] = useState(null);
  const [movs, setMovs] = useState([]);
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
      const res = await fetch(`${API_URL}/patrimonio`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Erro ao carregar patrimônio.");
      const data = await res.json();
      setResumo(data.resumo || null);
      setItens(Array.isArray(data.itens) ? data.itens : []);
    } catch (err) {
      toast.error(err.message || "Falha ao carregar patrimônio.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, authHeaders]);

  const carregarCategorias = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/categorias?tipo=gasto`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : []);
      }
    } catch {
      // silencioso
    }
  }, [API_URL, authHeaders]);

  useEffect(() => {
    carregar();
    carregarCategorias();
  }, [carregar, carregarCategorias]);

  const carregarHistorico = async (itemId) => {
    if (histItemId === itemId) {
      setHistItemId(null);
      return;
    }
    setHistItemId(itemId);
    setLoadingHist(true);
    try {
      const res = await fetch(`${API_URL}/patrimonio/${itemId}/movimentacoes`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Erro ao carregar histórico.");
      const data = await res.json();
      setMovs(Array.isArray(data) ? data : []);
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

  const abrirEditar = (item) => {
    setEditId(item.id);
    setForm({
      nome: item.nome || "",
      tipo: item.tipo || "outro",
      instituicao: item.instituicao || "",
      valor_atual: String(item.valor_atual ?? ""),
      valor_investido: item.valor_investido != null ? String(item.valor_investido) : "",
      rendimento_tipo: item.rendimento_tipo || "nenhum",
      rendimento_valor: item.rendimento_valor != null ? String(item.rendimento_valor) : "",
      cdi_referencia: item.cdi_referencia != null ? String(item.cdi_referencia) : "14.65",
      liquidez: item.liquidez || "media",
      ativo: item.ativo !== false,
      observacoes: item.observacoes || "",
    });
    setShowForm(true);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome do ativo.");
    if (form.valor_atual === "") return toast.error("Informe o saldo atual.");
    if (form.rendimento_tipo !== "nenhum" && (form.rendimento_valor === "" || Number(form.rendimento_valor) < 0)) {
      return toast.error("Informe uma taxa de rendimento válida.");
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        instituicao: form.instituicao.trim(),
        valor_atual: Number(form.valor_atual),
        valor_investido: form.valor_investido !== "" ? Number(form.valor_investido) : null,
        rendimento_tipo: form.rendimento_tipo,
        rendimento_valor:
          form.rendimento_tipo !== "nenhum" && form.rendimento_valor !== ""
            ? Number(form.rendimento_valor)
            : null,
        cdi_referencia:
          form.rendimento_tipo === "cdi_percentual" && form.cdi_referencia !== ""
            ? Number(form.cdi_referencia)
            : null,
        liquidez: form.liquidez,
        ativo: form.ativo,
        observacoes: form.observacoes.trim(),
      };
      const res = await fetch(editId ? `${API_URL}/patrimonio/${editId}` : `${API_URL}/patrimonio`, {
        method: editId ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar patrimônio.");
      toast.success(editId ? "Ativo atualizado!" : "Ativo cadastrado!");
      setShowForm(false);
      setEditId(null);
      setForm(FORM_INICIAL);
      carregar();
    } catch (err) {
      toast.error(err.message || "Falha ao salvar patrimônio.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/patrimonio/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir ativo.");
      }
      toast.success("Ativo excluído.");
      if (histItemId === deleteTarget.id) setHistItemId(null);
      setDeleteTarget(null);
      carregar();
    } catch (err) {
      toast.error(err.message || "Falha ao excluir ativo.");
    } finally {
      setDeleting(false);
    }
  };

  const abrirMovimentacao = (item) => {
    setMovTarget(item);
    setMovForm({
      tipo: "aporte",
      valor: "",
      data_movimentacao: todayInTimezone(timezone),
      lancar_transacao: false,
      categoria_id: categorias[0]?.id != null ? String(categorias[0].id) : "",
      observacao: "",
    });
  };

  const handleMovimentar = async (e) => {
    e.preventDefault();
    if (!movTarget) return;
    if (movForm.valor === "" || (movForm.tipo !== "ajuste" && Number(movForm.valor) <= 0)) {
      return toast.error("Informe um valor válido.");
    }
    if (movForm.lancar_transacao && movForm.tipo === "aporte" && !movForm.categoria_id) {
      return toast.error("Selecione uma categoria de despesa para lançar no extrato.");
    }

    setSavingMov(true);
    try {
      const payload = {
        tipo: movForm.tipo,
        ...(movForm.tipo === "ajuste"
          ? { novo_saldo: Number(movForm.valor) }
          : { valor: Number(movForm.valor) }),
        data_movimentacao: movForm.data_movimentacao,
        lancar_transacao: movForm.tipo === "ajuste" ? false : movForm.lancar_transacao,
        categoria_id:
          movForm.lancar_transacao && movForm.tipo === "aporte" && movForm.categoria_id
            ? parseInt(movForm.categoria_id, 10)
            : null,
        observacao: movForm.observacao.trim(),
      };

      const res = await fetch(`${API_URL}/patrimonio/${movTarget.id}/movimentar`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao movimentar patrimônio.");

      const qtdObjAtualizados = Array.isArray(data.objetivos_atualizados)
        ? data.objetivos_atualizados.length
        : 0;
      toast.success(
        qtdObjAtualizados > 0
          ? `Movimentação registrada e ${qtdObjAtualizados} objetivo(s) vinculado(s) atualizado(s)!`
          : "Movimentação registrada!",
      );
      if (payload.lancar_transacao) {
        window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
      }
      const alvoId = movTarget.id;
      setMovTarget(null);
      await carregar();
      if (histItemId === alvoId) {
        const hRes = await fetch(`${API_URL}/patrimonio/${alvoId}/movimentacoes`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        if (hRes.ok) setMovs(await hRes.json());
      }
    } catch (err) {
      toast.error(err.message || "Falha ao registrar movimentação.");
    } finally {
      setSavingMov(false);
    }
  };

  const handleEstornarMov = async () => {
    if (!estornoTarget) return;
    setEstornando(true);
    try {
      const res = await fetch(
        `${API_URL}/patrimonio/${estornoTarget.patrimonio_id}/movimentacoes/${estornoTarget.id}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao estornar movimentação.");
      }
      toast.success("Movimentação estornada.");
      if (estornoTarget.transacao_id) {
        window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
      }
      const alvoId = estornoTarget.patrimonio_id;
      setEstornoTarget(null);
      await carregar();
      const hRes = await fetch(`${API_URL}/patrimonio/${alvoId}/movimentacoes`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (hRes.ok) setMovs(await hRes.json());
    } catch (err) {
      toast.error(err.message || "Falha ao estornar movimentação.");
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
              <Landmark className="w-5 h-5" />
            </span>
            Patrimônio &amp; Patrimônio Líquido
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe seus ativos, liquidez imediata e o patrimônio líquido já descontando suas dívidas ativas.
          </p>
        </div>
        <button onClick={() => (showForm ? setShowForm(false) : abrirCriar())} className={BTN_PRIMARY}>
          {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          {showForm ? "Fechar formulário" : "Novo Ativo"}
        </button>
      </div>

      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Patrimônio Líquido</p>
            <p
              className={`text-2xl font-bold mt-2 ${
                resumo.patrimonio_liquido >= 0
                  ? "text-emerald-600 dark:text-lime-spark"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {formatCurrency(resumo.patrimonio_liquido)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ativos − Dívidas ativas</p>
          </div>

          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Ativos</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              {formatCurrency(resumo.total_ativos)}
            </p>
            {resumo.rendimento_mensal_estimado_total > 0 ? (
              <p className="text-xs text-emerald-600 dark:text-lime-spark mt-1 font-medium">
                Rend. est.: +{formatCurrency(resumo.rendimento_mensal_estimado_total)}/mês
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {resumo.contagem.ativos} ativo(s) em carteira
              </p>
            )}
          </div>

          <div className={`${CARD_CLS} p-5`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Passivos (Dívidas)</p>
              <Link
                to="/dividas"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-lime-spark hover:underline"
              >
                Dívidas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {formatCurrency(resumo.total_passivos)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Integrado automaticamente</p>
          </div>

          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-sky-500" /> Liquidez Imediata
            </p>
            <p className="text-2xl font-bold text-sky-600 dark:text-sky-300 mt-2">
              {formatCurrency(resumo.liquidez_imediata)}
            </p>
            {resumo.total_investido > 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ganho acumulado:{" "}
                <strong
                  className={
                    resumo.ganho_total >= 0
                      ? "text-emerald-600 dark:text-lime-spark"
                      : "text-red-500 dark:text-red-400"
                  }
                >
                  {resumo.ganho_total >= 0 ? "+" : ""}
                  {formatCurrency(resumo.ganho_total)}
                </strong>
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Disponível no curto prazo</p>
            )}
          </div>
        </div>
      )}

      {resumo?.distribuicao_por_tipo?.length > 0 && (
        <div className={`${CARD_CLS} p-5 space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Distribuição dos Ativos
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total: {formatCurrency(resumo.total_ativos)}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            {resumo.distribuicao_por_tipo.map((d) => (
              <AppTooltip
                key={d.tipo}
                content={`${TIPO_LABEL[d.tipo] || d.tipo}: ${formatCurrency(d.total)} (${d.percentual}%)`}
              >
                <div
                  className={`h-full transition-all duration-300 ${TIPO_COLOR[d.tipo] || "bg-slate-500"}`}
                  style={{ width: `${Math.max(2, d.percentual)}%` }}
                />
              </AppTooltip>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
            {resumo.distribuicao_por_tipo.map((d) => (
              <span key={d.tipo} className="inline-flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${TIPO_COLOR[d.tipo] || "bg-slate-500"}`} />
                <span>{TIPO_LABEL[d.tipo] || d.tipo}:</span>
                <strong>{formatCurrency(d.total)}</strong>
                <span className="text-slate-400">({d.percentual}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSalvar} className={`${CARD_CLS} p-6 space-y-4`}>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {editId ? "Editar Ativo" : "Cadastrar Novo Ativo"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLS}>Nome *</label>
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="Ex: Reserva de Emergência"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Categoria / Tipo *</label>
              <select
                className={INPUT_CLS}
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {TIPOS_PATRIMONIO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Instituição / Local</label>
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="Ex: Nubank, Tesouro Direto"
                value={form.instituicao}
                onChange={(e) => setForm({ ...form, instituicao: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Saldo Atual (R$) *</label>
              <CurrencyInput
                value={form.valor_atual}
                className={INPUT_CLS}
                placeholder="0,00"
                onValueChange={(val) => setForm({ ...form, valor_atual: val })}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Valor Investido (Opcional)</label>
              <CurrencyInput
                value={form.valor_investido}
                className={INPUT_CLS}
                placeholder="Quanto saiu do bolso"
                onValueChange={(val) => setForm({ ...form, valor_investido: val })}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Liquidez</label>
              <select
                className={INPUT_CLS}
                value={form.liquidez}
                onChange={(e) => setForm({ ...form, liquidez: e.target.value })}
              >
                <option value="imediata">Imediata (D+0 / D+1)</option>
                <option value="media">Média (curto/médio prazo)</option>
                <option value="baixa">Baixa (imóvel / longo prazo)</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Tipo de Rendimento</label>
              <select
                className={INPUT_CLS}
                value={form.rendimento_tipo}
                onChange={(e) => setForm({ ...form, rendimento_tipo: e.target.value })}
              >
                {RENDIMENTO_TIPOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {form.rendimento_tipo !== "nenhum" && (
              <div>
                <label className={LABEL_CLS}>
                  {form.rendimento_tipo === "cdi_percentual"
                    ? "Porcentagem do CDI (%)"
                    : form.rendimento_tipo === "anual"
                      ? "Taxa Anual (% a.a.)"
                      : "Taxa Mensal (% a.m.)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={INPUT_CLS}
                  placeholder={
                    form.rendimento_tipo === "cdi_percentual"
                      ? "Ex: 100 ou 115"
                      : form.rendimento_tipo === "anual"
                        ? "Ex: 12.5"
                        : "Ex: 0.95"
                  }
                  value={form.rendimento_valor}
                  onChange={(e) => setForm({ ...form, rendimento_valor: e.target.value })}
                />
              </div>
            )}
            {form.rendimento_tipo === "cdi_percentual" && (
              <div>
                <label className={LABEL_CLS}>CDI Base (% a.a.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={INPUT_CLS}
                  placeholder="14.65"
                  value={form.cdi_referencia}
                  onChange={(e) => setForm({ ...form, cdi_referencia: e.target.value })}
                />
              </div>
            )}
            {(() => {
              const prev = previewRendimentoForm(form);
              if (!prev) return null;
              return (
                <div className="sm:col-span-2 lg:col-span-3 rounded-xl px-3.5 py-2.5 bg-emerald-50 dark:bg-lime-spark/10 border border-emerald-200 dark:border-lime-spark/20 text-xs text-emerald-800 dark:text-lime-spark flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    Taxa equivalente: <strong>{prev.taxaAnualPct}% a.a.</strong> ({prev.taxaMensalPct}% a.m.)
                  </span>
                  {Number(form.valor_atual) > 0 && (
                    <span>
                      Projeção sobre saldo atual: <strong>+{formatCurrency(prev.mensalEst)}/mês</strong> ·{" "}
                      <strong>+{formatCurrency(prev.anualEst)}/ano</strong>
                    </span>
                  )}
                </div>
              );
            })()}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={LABEL_CLS}>Observações</label>
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="Vencimento, indexador, notas..."
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
            {editId && (
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                />
                Ativo contabilizado no patrimônio líquido
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className={BTN_SECONDARY}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={BTN_PRIMARY}>
              {saving ? "Salvando..." : editId ? "Salvar alterações" : "Cadastrar Ativo"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className={`${CARD_CLS} p-10 text-center text-sm text-slate-500 dark:text-slate-400`}>
          Carregando patrimônio...
        </div>
      ) : itens.length === 0 ? (
        <div className={`${CARD_CLS} p-10 text-center space-y-2`}>
          <Landmark className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nenhum ativo cadastrado ainda.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clique em &ldquo;Novo Ativo&rdquo; para acompanhar reservas, investimentos e bens.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {itens.map((item) => {
            const liq = LIQUIDEZ_CFG[item.liquidez] || LIQUIDEZ_CFG.media;
            const aberto = histItemId === item.id;
            return (
              <div key={item.id} className={`${CARD_CLS} p-5 space-y-3 ${item.ativo ? "" : "opacity-60"}`}>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 min-w-0 flex-1">
                      {item.nome}
                    </h3>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                      <button onClick={() => abrirMovimentacao(item)} className={`${BTN_SECONDARY} whitespace-nowrap`}>
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Movimentar
                      </button>
                      <button onClick={() => carregarHistorico(item.id)} className={`${BTN_SECONDARY} whitespace-nowrap`}>
                        <History className="w-3.5 h-3.5" /> {aberto ? "Ocultar histórico" : "Histórico"}
                      </button>
                      <AppTooltip content="Editar ativo">
                        <button
                          onClick={() => abrirEditar(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </AppTooltip>
                      <AppTooltip content="Excluir ativo">
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AppTooltip>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {TIPO_LABEL[item.tipo] || item.tipo}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${liq.cls}`}>{liq.label}</span>
                    {item.rendimento_tipo && item.rendimento_tipo !== "nenhum" && item.rendimento_valor > 0 && (
                      <AppTooltip content={`Equivalente a ${item.taxa_anual_efetiva}% a.a. (${item.taxa_mensal_efetiva}% a.m.)`}>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 dark:bg-lime-spark/10 text-emerald-700 dark:text-lime-spark border border-emerald-200 dark:border-lime-spark/25"
                        >
                          {item.rendimento_tipo === "cdi_percentual"
                            ? `${item.rendimento_valor}% CDI`
                            : item.rendimento_tipo === "anual"
                              ? `${item.rendimento_valor}% a.a.`
                              : `${item.rendimento_valor}% a.m.`}
                        </span>
                      </AppTooltip>
                    )}
                    {item.instituicao && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">· {item.instituicao}</span>
                    )}
                    {item.objetivos_vinculados?.length > 0 && (
                      <AppTooltip content={item.objetivos_vinculados.map((o) => o.nome).join(", ")}>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20"
                        >
                          <Flag className="w-3 h-3" />
                          {item.objetivos_vinculados.length === 1
                            ? `Objetivo: ${item.objetivos_vinculados[0].nome}`
                            : `${item.objetivos_vinculados.length} objetivos vinculados`}
                        </span>
                      </AppTooltip>
                    )}
                    {!item.ativo && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Inativo
                      </span>
                    )}
                  </div>

                  {item.observacoes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.observacoes}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Saldo Atual</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.valor_atual)}
                    </p>
                  </div>
                  {(item.rendimento_mensal_estimado != null || item.valor_investido !== null) && (
                    <div className="flex flex-wrap items-center gap-6 text-xs">
                      {item.rendimento_mensal_estimado != null && (
                        <div>
                          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Rendimento Estimado ({item.taxa_mensal_efetiva}% a.m.)
                          </p>
                          <p className="font-bold text-emerald-600 dark:text-lime-spark">
                            +{formatCurrency(item.rendimento_mensal_estimado)}/mês
                            <span className="font-normal text-slate-500 dark:text-slate-400">
                              {" "}· +{formatCurrency(item.rendimento_anual_estimado)}/ano
                            </span>
                          </p>
                        </div>
                      )}
                      {item.valor_investido !== null && (
                        <>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Valor Investido</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrency(item.valor_investido)}
                            </p>
                          </div>
                          {item.ganho_valor !== null && (
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">Ganho Acumulado</p>
                              <p
                                className={`font-bold ${
                                  item.ganho_valor >= 0
                                    ? "text-emerald-600 dark:text-lime-spark"
                                    : "text-red-500 dark:text-red-400"
                                }`}
                              >
                                {item.ganho_valor >= 0 ? "+" : ""}
                                {formatCurrency(item.ganho_valor)} ({item.rentabilidade_percentual >= 0 ? "+" : ""}
                                {item.rentabilidade_percentual}%)
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {aberto && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Histórico de Movimentações
                    </h4>
                    {loadingHist ? (
                      <p className="text-xs text-slate-500">Carregando...</p>
                    ) : movs.length === 0 ? (
                      <p className="text-xs text-slate-500">Nenhuma movimentação registrada ainda.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {movs.map((m) => (
                          <div key={m.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-100 capitalize">
                                {m.tipo}
                              </span>{" "}
                              <span className="text-slate-500 dark:text-slate-400">
                                em {formatDate(m.data_movimentacao)}
                              </span>
                              {m.observacao && (
                                <span className="text-slate-500 dark:text-slate-400"> · {m.observacao}</span>
                              )}
                              {m.transacao_id && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]">
                                  No extrato
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {m.tipo === "ajuste"
                                  ? `${formatCurrency(m.saldo_anterior)} → ${formatCurrency(m.saldo_novo)}`
                                  : `${m.tipo === "resgate" ? "-" : "+"} ${formatCurrency(m.valor)}`}
                              </span>
                              <button
                                onClick={() => setEstornoTarget(m)}
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

      {/* Modal de Movimentação */}
      {movTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleMovimentar} className={`${CARD_CLS} p-6 max-w-md w-full shadow-xl space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Movimentar — {movTarget.nome}
              </h3>
              <button
                type="button"
                onClick={() => setMovTarget(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "aporte", label: "Aporte" },
                { id: "resgate", label: "Resgate" },
                { id: "ajuste", label: "Ajustar Saldo" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMovForm({ ...movForm, tipo: opt.id })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    movForm.tipo === opt.id
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
                <label className={LABEL_CLS}>
                  {movForm.tipo === "ajuste" ? "Novo Saldo (R$) *" : "Valor (R$) *"}
                </label>
                <CurrencyInput
                  value={movForm.valor}
                  className={INPUT_CLS}
                  placeholder="0,00"
                  onValueChange={(val) => setMovForm({ ...movForm, valor: val })}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Data</label>
                <input
                  type="date"
                  className={INPUT_CLS}
                  value={movForm.data_movimentacao}
                  onChange={(e) => setMovForm({ ...movForm, data_movimentacao: e.target.value })}
                />
              </div>
            </div>

            {movForm.tipo !== "ajuste" && (
              <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={movForm.lancar_transacao}
                    onChange={(e) => setMovForm({ ...movForm, lancar_transacao: e.target.checked })}
                  />
                  {movForm.tipo === "aporte"
                    ? "Registrar saída no extrato (Transações)"
                    : "Registrar entrada como receita no extrato"}
                </label>
                {movForm.lancar_transacao && movForm.tipo === "aporte" && (
                  <div>
                    <label className={LABEL_CLS}>Categoria da despesa *</label>
                    <select
                      className={INPUT_CLS}
                      value={movForm.categoria_id}
                      onChange={(e) => setMovForm({ ...movForm, categoria_id: e.target.value })}
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
            )}

            <div>
              <label className={LABEL_CLS}>Observação</label>
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="Ex: Aporte mensal, rendimento..."
                value={movForm.observacao}
                onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })}
              />
            </div>

            {movTarget.objetivos_vinculados?.some((o) => o.status !== "pausado") && (
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300">
                Esta movimentação também atualizará automaticamente{" "}
                <strong>
                  {movTarget.objetivos_vinculados
                    .filter((o) => o.status !== "pausado")
                    .map((o) => o.nome)
                    .join(", ")}
                </strong>
                .
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMovTarget(null)} className={BTN_SECONDARY}>
                Cancelar
              </button>
              <button type="submit" disabled={savingMov} className={BTN_PRIMARY}>
                {savingMov ? "Salvando..." : "Confirmar"}
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
        title="Excluir ativo de patrimônio"
        message={`Excluir "${deleteTarget?.nome}"? O histórico deste ativo também será removido.`}
        confirmText="Excluir"
      />
      <ConfirmDialog
        isOpen={Boolean(estornoTarget)}
        onClose={() => setEstornoTarget(null)}
        onConfirm={handleEstornarMov}
        loading={estornando}
        title="Estornar movimentação"
        message="O saldo do ativo (e de eventuais objetivos vinculados) será revertido e, caso tenha sido lançada no extrato, a transação vinculada também será excluída. Confirmar?"
        confirmText="Estornar"
      />
    </div>
  );
}
