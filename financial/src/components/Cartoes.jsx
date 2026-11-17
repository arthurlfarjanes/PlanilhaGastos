import React, { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import {
  CreditCard,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Receipt,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "./ui/ConfirmDialog";
import { formatCurrency, formatDate, todayInTimezone } from "../utils/formatters";
import { CurrencyInput } from "./CurrencyInput";
import { AppTooltip } from "@/components/ui/Tooltip";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const FATURA_CFG = {
  aberta: {
    label: "Aberta",
    badge: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20",
  },
  fechada: {
    label: "Fechada",
    badge: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20",
  },
  vencida: {
    label: "Vencida",
    badge: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
  },
  paga: {
    label: "Paga",
    badge: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20",
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
  bandeira: "",
  limite_total: "",
  dia_fechamento: "",
  dia_vencimento: "",
  categoria_id: "",
  ativo: true,
};

export default function Cartoes() {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";

  const hoje = todayInTimezone(timezone);
  const [ano, setAno] = useState(Number(hoje.slice(0, 4)));
  const [mes, setMes] = useState(Number(hoje.slice(5, 7)));

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

  // Nova compra
  const [compraTarget, setCompraTarget] = useState(null);
  const [compraForm, setCompraForm] = useState({
    descricao: "", valor_total: "", total_parcelas: "1", data_compra: hoje, categoria_id: "",
  });
  const [savingCompra, setSavingCompra] = useState(false);

  // Fatura detalhada
  const [faturaTarget, setFaturaTarget] = useState(null);
  const [fatura, setFatura] = useState(null);
  const [loadingFatura, setLoadingFatura] = useState(false);
  const [pagarData, setPagarData] = useState(hoje);
  const [pagando, setPagando] = useState(false);
  const [estornoOpen, setEstornoOpen] = useState(false);
  const [lancDelete, setLancDelete] = useState(null);

  const authHeaders = useCallback(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token],
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cartoes?ano=${ano}&mes=${mes}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Erro ao carregar cartões");
      const data = await res.json();
      setResumo(data.resumo || null);
      setItens(Array.isArray(data.itens) ? data.itens : []);
    } catch (err) {
      toast.error(err.message || "Falha ao carregar cartões.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, ano, mes, authHeaders]);

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
  }, [carregar]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  const carregarFatura = useCallback(
    async (cartaoId) => {
      setLoadingFatura(true);
      try {
        const res = await fetch(`${API_URL}/cartoes/${cartaoId}/fatura?ano=${ano}&mes=${mes}`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Erro ao carregar fatura");
        setFatura(await res.json());
      } catch (err) {
        toast.error(err.message || "Falha ao carregar fatura.");
      } finally {
        setLoadingFatura(false);
      }
    },
    [API_URL, ano, mes, authHeaders],
  );

  // Recarrega limites e fatura aberta quando uma transação é alterada/excluída em outra aba ou janela.
  useEffect(() => {
    const sync = () => {
      carregar();
      if (faturaTarget?.id) carregarFatura(faturaTarget.id);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    const onStorage = (e) => {
      if (e.key === "mefinance:cartoes-updated") sync();
    };
    window.addEventListener("mefinance:cartoes-updated", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("mefinance:cartoes-updated", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [carregar, carregarFatura, faturaTarget?.id]);

  const mudarMes = (delta) => {
    const idx = ano * 12 + (mes - 1) + delta;
    setAno(Math.floor(idx / 12));
    setMes((idx % 12) + 1);
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
      bandeira: item.bandeira || "",
      limite_total: String(item.limite_total ?? ""),
      dia_fechamento: String(item.dia_fechamento ?? ""),
      dia_vencimento: String(item.dia_vencimento ?? ""),
      categoria_id: item.categoria_id != null ? String(item.categoria_id) : "",
      ativo: item.ativo !== false,
    });
    setShowForm(true);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome do cartão.");
    if (form.limite_total === "") return toast.error("Informe o limite do cartão.");
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        bandeira: form.bandeira.trim() || null,
        limite_total: Number(form.limite_total),
        dia_fechamento: parseInt(form.dia_fechamento, 10),
        dia_vencimento: parseInt(form.dia_vencimento, 10),
        categoria_id: form.categoria_id !== "" ? parseInt(form.categoria_id, 10) : null,
        ativo: form.ativo,
      };
      const res = await fetch(editId ? `${API_URL}/cartoes/${editId}` : `${API_URL}/cartoes`, {
        method: editId ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao salvar cartão.");
      toast.success(editId ? "Cartão atualizado!" : "Cartão cadastrado!");
      setShowForm(false);
      setEditId(null);
      setForm(FORM_INICIAL);
      carregar();
    } catch (err) {
      toast.error(err.message || "Falha ao salvar cartão.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/cartoes/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir cartão.");
      }
      toast.success("Cartão excluído.");
      setDeleteTarget(null);
      carregar();
    } catch (err) {
      toast.error(err.message || "Falha ao excluir cartão.");
    } finally {
      setDeleting(false);
    }
  };

  const abrirCompra = (item) => {
    setCompraTarget(item);
    const catPadrao =
      item.categoria_id != null
        ? String(item.categoria_id)
        : categorias[0]?.id != null
          ? String(categorias[0].id)
          : "";
    setCompraForm({
      descricao: "",
      valor_total: "",
      total_parcelas: "1",
      data_compra: todayInTimezone(timezone),
      categoria_id: catPadrao,
    });
  };

  const handleCompra = async (e) => {
    e.preventDefault();
    if (!compraTarget) return;
    const valor = Number(compraForm.valor_total);
    const parcelas = parseInt(compraForm.total_parcelas, 10) || 1;
    if (!compraForm.descricao.trim()) return toast.error("Informe a descrição da compra.");
    if (!Number.isFinite(valor) || valor <= 0) return toast.error("Informe um valor válido.");
    if (!compraForm.categoria_id) return toast.error("Selecione uma categoria para a despesa.");
    if (parcelas < 1 || parcelas > 72) return toast.error("Parcelas deve estar entre 1 e 72.");
    setSavingCompra(true);
    try {
      const endpoint = parcelas > 1 ? `${API_URL}/transacoes/parcelada` : `${API_URL}/transacoes`;
      const payload = {
        descricao: compraForm.descricao.trim(),
        valor,
        tipo: "despesa",
        data: compraForm.data_compra,
        categoria_id: parseInt(compraForm.categoria_id, 10),
        cartao_id: compraTarget.id,
        ...(parcelas > 1 ? { parcelas } : {}),
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao registrar compra.");
      toast.success("Despesa lançada no cartão!");
      window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
      setCompraTarget(null);
      carregar();
    } catch (err) {
      toast.error(err.message || "Falha ao registrar compra.");
    } finally {
      setSavingCompra(false);
    }
  };

  const abrirFatura = (item) => {
    setFaturaTarget(item);
    setFatura(null);
    setPagarData(todayInTimezone(timezone));
    carregarFatura(item.id);
  };

  const fecharFatura = () => {
    setFaturaTarget(null);
    setFatura(null);
  };

  const handlePagar = async () => {
    if (!faturaTarget) return;
    setPagando(true);
    try {
      const res = await fetch(`${API_URL}/cartoes/${faturaTarget.id}/fatura/pagar`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ano, mes, data_pagamento: pagarData }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao pagar fatura.");
      toast.success("Fatura marcada como paga!");
      await Promise.all([carregarFatura(faturaTarget.id), carregar()]);
    } catch (err) {
      toast.error(err.message || "Falha ao pagar fatura.");
    } finally {
      setPagando(false);
    }
  };

  const handleEstornar = async () => {
    if (!faturaTarget) return;
    setPagando(true);
    try {
      const res = await fetch(
        `${API_URL}/cartoes/${faturaTarget.id}/fatura/${ano}/${mes}/pagamento`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao estornar pagamento.");
      }
      toast.success("Pagamento estornado.");
      setEstornoOpen(false);
      await Promise.all([carregarFatura(faturaTarget.id), carregar()]);
    } catch (err) {
      toast.error(err.message || "Falha ao estornar pagamento.");
    } finally {
      setPagando(false);
    }
  };

  const handleExcluirLancamento = async () => {
    if (!faturaTarget || !lancDelete) return;
    setPagando(true);
    try {
      const res = await fetch(`${API_URL}/transacoes/${lancDelete.transacao_id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir transação.");
      }
      toast.success("Transação excluída.");
      window.dispatchEvent(new Event("mefinance:orcamentos-updated"));
      setLancDelete(null);
      await Promise.all([carregarFatura(faturaTarget.id), carregar()]);
    } catch (err) {
      toast.error(err.message || "Falha ao excluir transação.");
      setLancDelete(null);
    } finally {
      setPagando(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark">
              <CreditCard className="w-5 h-5" />
            </span>
            Cartões &amp; Faturas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Despesas atreladas ao cartão entram automaticamente na fatura conforme o dia de fechamento; o pagamento apenas liquida a fatura.
          </p>
        </div>
        <button onClick={() => (showForm ? setShowForm(false) : abrirCriar())} className={BTN_PRIMARY}>
          {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          {showForm ? "Fechar formulário" : "Novo Cartão"}
        </button>
      </div>

      {/* Seletor de competência */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => mudarMes(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Mês anterior">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-[10rem] text-center">
          Faturas de {MESES[mes - 1]} / {ano}
        </span>
        <button onClick={() => mudarMes(1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Próximo mês">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Limite Total</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{formatCurrency(resumo.limite_total)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{resumo.quantidade} cartão(ões) ativo(s)</p>
          </div>
          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Limite Utilizado (Total em Aberto)</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{formatCurrency(resumo.limite_usado)}</p>
            {(() => {
              const resumoMes = resumo.limite_usado_mes ?? (resumo.faturas_do_mes_em_aberto ?? 0);
              const resumoOutras = resumo.limite_usado_outras ?? Math.max(0, Number(resumo.limite_usado || 0) - resumoMes);
              return (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {formatCurrency(resumoMes)} em {MESES[mes - 1]} · {formatCurrency(resumoOutras)} em outras faturas
                </p>
              );
            })()}
          </div>
          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Limite Disponível</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-lime-spark mt-2">{formatCurrency(resumo.limite_disponivel)}</p>
          </div>
          <div className={`${CARD_CLS} p-5`}>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Faturas em Aberto no Mês</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{formatCurrency(resumo.faturas_do_mes_em_aberto)}</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSalvar} className={`${CARD_CLS} p-6 space-y-4`}>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {editId ? "Editar Cartão" : "Cadastrar Novo Cartão"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLS}>Nome *</label>
              <input type="text" className={INPUT_CLS} value={form.nome} placeholder="Ex: Nubank"
                onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div>
              <label className={LABEL_CLS}>Bandeira</label>
              <input type="text" className={INPUT_CLS} value={form.bandeira} placeholder="Ex: Mastercard"
                onChange={(e) => setForm({ ...form, bandeira: e.target.value })} />
            </div>
            <div>
              <label className={LABEL_CLS}>Limite Total (R$) *</label>
              <CurrencyInput value={form.limite_total} className={INPUT_CLS} placeholder="0,00"
                onValueChange={(val) => setForm({ ...form, limite_total: val })} />
            </div>
            <div>
              <label className={LABEL_CLS}>Dia de Fechamento *</label>
              <input type="number" min="1" max="31" className={INPUT_CLS} value={form.dia_fechamento}
                onChange={(e) => setForm({ ...form, dia_fechamento: e.target.value })} required />
            </div>
            <div>
              <label className={LABEL_CLS}>Dia de Vencimento *</label>
              <input type="number" min="1" max="31" className={INPUT_CLS} value={form.dia_vencimento}
                onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} required />
            </div>
            <div>
              <label className={LABEL_CLS}>Categoria da despesa da fatura</label>
              <select className={INPUT_CLS} value={form.categoria_id}
                onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            {editId && (
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                Cartão ativo
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className={BTN_SECONDARY}>Cancelar</button>
            <button type="submit" disabled={saving} className={BTN_PRIMARY}>
              {saving ? "Salvando..." : editId ? "Salvar alterações" : "Cadastrar Cartão"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className={`${CARD_CLS} p-10 text-center text-sm text-slate-500 dark:text-slate-400`}>Carregando cartões...</div>
      ) : itens.length === 0 ? (
        <div className={`${CARD_CLS} p-10 text-center space-y-2`}>
          <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Nenhum cartão cadastrado.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Clique em &ldquo;Novo Cartão&rdquo; para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {itens.map((item) => {
            const fcfg = FATURA_CFG[item.fatura.status] || FATURA_CFG.aberta;
            const pct = Math.min(100, Number(item.percentual_usado || 0));
            const usadoMesVal =
              item.limite_usado_mes ?? (item.fatura?.status !== "paga" ? Number(item.fatura?.total || 0) : 0);
            const usadoOutrasVal =
              item.limite_usado_outras ?? Math.max(0, Number(item.limite_usado || 0) - usadoMesVal);
            const limiteTotalNum = Number(item.limite_total || 0);
            const pctMes =
              item.percentual_usado_mes != null
                ? Math.min(100, Number(item.percentual_usado_mes))
                : limiteTotalNum > 0
                  ? Math.min(100, (usadoMesVal * 100) / limiteTotalNum)
                  : 0;
            const pctOutras =
              item.percentual_usado_outras != null
                ? Math.min(Math.max(0, 100 - pctMes), Number(item.percentual_usado_outras))
                : Math.min(Math.max(0, 100 - pctMes), Math.max(0, pct - pctMes));
            const barCls = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500 dark:bg-lime-spark";
            const outrasFaturas = (item.faturas_em_aberto || []).filter((f) => f.ano !== ano || f.mes !== mes);
            return (
              <div key={item.id} className={`${CARD_CLS} p-5 space-y-4 ${item.ativo ? "" : "opacity-60"}`}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{item.nome}</h3>
                      {item.bandeira && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{item.bandeira}</span>
                      )}
                      {!item.ativo && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-500">Inativo</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Fecha dia {item.dia_fechamento} · Vence dia {item.dia_vencimento}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.ativo && (
                      <button onClick={() => abrirCompra(item)} className={BTN_SECONDARY}>
                        <ShoppingBag className="w-3.5 h-3.5" /> Nova Compra
                      </button>
                    )}
                    <button onClick={() => abrirFatura(item)} className={BTN_SECONDARY}>
                      <Receipt className="w-3.5 h-3.5" /> Ver Fatura
                    </button>
                    <AppTooltip content="Editar cartão">
                      <button onClick={() => abrirEditar(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </AppTooltip>
                    <AppTooltip content="Excluir cartão">
                      <button onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AppTooltip>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Usado (total): <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.limite_usado)}</strong></span>
                      <span>Disponível: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.limite_disponivel)}</strong></span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                      {pctMes > 0 && (
                        <AppTooltip content={`Fatura de ${MESES[mes - 1]}: ${formatCurrency(usadoMesVal)}`}>
                          <div
                            className={`h-full min-w-[4px] transition-all duration-300 ${barCls}`}
                            style={{ width: `${pctMes}%` }}
                          />
                        </AppTooltip>
                      )}
                      {pctOutras > 0 && (
                        <AppTooltip content={`Outras faturas em aberto: ${formatCurrency(usadoOutrasVal)}`}>
                          <div
                            className="h-full min-w-[4px] transition-all duration-300 bg-sky-500/80 dark:bg-sky-400/75"
                            style={{ width: `${pctOutras}%` }}
                          />
                        </AppTooltip>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{pct}% de {formatCurrency(item.limite_total)}</span>
                      <span className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${barCls}`} />
                          {MESES[mes - 1]}: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(usadoMesVal)}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-sky-500/80 dark:bg-sky-400/75" />
                          Outras faturas: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(usadoOutrasVal)}</strong>
                        </span>
                      </span>
                    </div>
                    {outrasFaturas.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Em aberto em:</span>
                        {outrasFaturas.map((of) => (
                          <AppTooltip key={`${of.ano}-${of.mes}`} content={`Ir para a fatura de ${MESES[of.mes - 1]}/${of.ano}`}>
                            <button
                              type="button"
                              onClick={() => {
                                setAno(of.ano);
                                setMes(of.mes);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/20 cursor-pointer"
                            >
                              {MESES[of.mes - 1].slice(0, 3)}/{of.ano} · {formatCurrency(of.total)}
                            </button>
                          </AppTooltip>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Fatura {MESES[mes - 1]} · vence {formatDate(item.fatura.vencimento)}
                      </p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(item.fatura.total)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${fcfg.badge}`}>
                      {item.fatura.status === "paga" && <CheckCircle2 className="w-3 h-3" />}
                      {item.fatura.status === "vencida" && <AlertTriangle className="w-3 h-3" />}
                      {fcfg.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Compra */}
      {compraTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCompra} className={`${CARD_CLS} p-6 max-w-md w-full shadow-xl space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Nova compra — {compraTarget.nome}</h3>
              <button type="button" onClick={() => setCompraTarget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className={LABEL_CLS}>Descrição *</label>
              <input type="text" className={INPUT_CLS} value={compraForm.descricao}
                onChange={(e) => setCompraForm({ ...compraForm, descricao: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Valor total (R$) *</label>
                <CurrencyInput value={compraForm.valor_total} className={INPUT_CLS} placeholder="0,00"
                  onValueChange={(val) => setCompraForm({ ...compraForm, valor_total: val })} />
              </div>
              <div>
                <label className={LABEL_CLS}>Parcelas</label>
                <input type="number" min="1" max="72" className={INPUT_CLS} value={compraForm.total_parcelas}
                  onChange={(e) => setCompraForm({ ...compraForm, total_parcelas: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Data da compra</label>
                <input type="date" className={INPUT_CLS} value={compraForm.data_compra}
                  onChange={(e) => setCompraForm({ ...compraForm, data_compra: e.target.value })} />
              </div>
              <div>
                <label className={LABEL_CLS}>Categoria *</label>
                <select className={INPUT_CLS} value={compraForm.categoria_id} required
                  onChange={(e) => setCompraForm({ ...compraForm, categoria_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCompraTarget(null)} className={BTN_SECONDARY}>Cancelar</button>
              <button type="submit" disabled={savingCompra} className={BTN_PRIMARY}>
                {savingCompra ? "Registrando..." : "Registrar compra"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Fatura */}
      {faturaTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${CARD_CLS} p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Fatura {MESES[mes - 1]}/{ano} — {faturaTarget.nome}
              </h3>
              <button type="button" onClick={fecharFatura} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingFatura || !fatura ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Carregando fatura...</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Fecha {formatDate(fatura.fechamento)} · Vence {formatDate(fatura.vencimento)}</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-medium border ${(FATURA_CFG[fatura.status] || FATURA_CFG.aberta).badge}`}>
                    {(FATURA_CFG[fatura.status] || FATURA_CFG.aberta).label}
                  </span>
                </div>

                {fatura.itens.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum lançamento nesta fatura.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fatura.itens.map((it) => (
                      <div key={it.transacao_id} className="py-2 flex items-center justify-between gap-2 text-sm">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{it.descricao}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(it.data)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(it.valor)}</span>
                          {fatura.status !== "paga" && (
                            <AppTooltip content="Excluir transação">
                              <button onClick={() => setLancDelete(it)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AppTooltip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(fatura.total)}</span>
                </div>

                {fatura.status === "paga" ? (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
                    <span>Paga em {formatDate(fatura.data_pagamento)} ({formatCurrency(fatura.valor_pago)})</span>
                    <button onClick={() => setEstornoOpen(true)} className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline cursor-pointer">
                      <RotateCcw className="w-3 h-3" /> Estornar
                    </button>
                  </div>
                ) : (
                  fatura.total > 0 && (
                    <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <div>
                        <label className={LABEL_CLS}>Data do pagamento</label>
                        <input type="date" className={INPUT_CLS} value={pagarData} onChange={(e) => setPagarData(e.target.value)} />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        As despesas desta fatura já constam nas suas Transações. Pagar aqui apenas liquida a fatura e libera o limite.
                      </p>
                      <div className="flex justify-end">
                        <button onClick={handlePagar} disabled={pagando} className={BTN_PRIMARY}>
                          {pagando ? "Processando..." : "Marcar fatura como paga"}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleExcluir}
        loading={deleting}
        title="Excluir cartão"
        message={`Excluir "${deleteTarget?.nome}"? As transações já lançadas serão mantidas no extrato com a indicação de cartão excluído.`}
        confirmText="Excluir"
      />
      <ConfirmDialog
        isOpen={estornoOpen}
        onClose={() => setEstornoOpen(false)}
        onConfirm={handleEstornar}
        loading={pagando}
        title="Estornar pagamento da fatura"
        message="A fatura voltará a ficar em aberto e o limite será recalculado. As transações permanecem no extrato. Confirmar?"
        confirmText="Estornar"
      />
      <ConfirmDialog
        isOpen={Boolean(lancDelete)}
        onClose={() => setLancDelete(null)}
        onConfirm={handleExcluirLancamento}
        loading={pagando}
        title="Excluir transação"
        message={`Excluir "${lancDelete?.descricao}" também a removerá do seu extrato e orçamentos. Confirmar?`}
        confirmText="Excluir"
      />
    </div>
  );
}

