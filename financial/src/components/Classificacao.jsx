import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  Check,
  CheckCheck,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Wand2,
} from "lucide-react";
import toast from "react-hot-toast";
import { AuthContext } from "../App";
import ConfirmDialog from "./ui/ConfirmDialog";
import { formatCurrency, formatDate } from "../utils/formatters";
import { AppTooltip } from "@/components/ui/Tooltip";

const MATCH_LABELS = {
  contains: "Contém",
  starts_with: "Começa com",
  exact: "Exato",
};

const ORIGEM_LABELS = {
  regra_usuario: "Regra sua",
  historico_usuario: "Seu histórico",
  heuristica_semantica: "Semântica",
};

export default function Classificacao() {
  const { token, API_URL } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [regras, setRegras] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [aplicando, setAplicando] = useState(false);

  // Formulário de nova regra
  const [padrao, setPadrao] = useState("");
  const [tipoMatch, setTipoMatch] = useState("contains");
  const [categoriaId, setCategoriaId] = useState("");
  const [prioridade, setPrioridade] = useState(10);
  const [salvandoRegra, setSalvandoRegra] = useState(false);

  // Simulador rápido
  const [testeDesc, setTesteDesc] = useState("");
  const [testeRes, setTesteRes] = useState(null);
  const [testando, setTestando] = useState(false);

  // Exclusão de regra
  const [regraParaExcluir, setRegraParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const authHeaders = useCallback(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token],
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/inteligencia/classificacao`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Não foi possível carregar os dados de classificação.");
      const json = await res.json();
      setRegras(json.regras || []);
      setCategorias(json.categorias || []);
      setSugestoes(json.sugestoes || []);
      setEstatisticas(json.estatisticas || null);
      setSelecionadas(new Set());
      setCategoriaId((prev) =>
        prev || (json.categorias?.[0]?.id ? String(json.categorias[0].id) : ""),
      );
    } catch (err) {
      toast.error(err.message || "Falha ao carregar classificação.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const toggleSelecionada = (txId) => {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  };

  const toggleTodas = () => {
    if (selecionadas.size === sugestoes.length) {
      setSelecionadas(new Set());
    } else {
      setSelecionadas(new Set(sugestoes.map((s) => s.transacao_id)));
    }
  };

  const aplicarLista = async (listaItens) => {
    if (!listaItens || listaItens.length === 0) return;
    setAplicando(true);
    try {
      const payload = {
        aplicacoes: listaItens.map((s) => ({
          transacao_id: s.transacao_id,
          categoria_id: s.categoria_sugerida_id,
          regra_id: s.regra_id || null,
        })),
      };
      const res = await fetch(`${API_URL}/inteligencia/classificacao/aplicar`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Erro ao aplicar reclassificação.");

      if (json.atualizadas > 0) {
        toast.success(`${json.atualizadas} despesa(s) reclassificada(s) com sucesso.`);
      }
      if (json.ignoradas_fatura_paga > 0) {
        toast(
          `${json.ignoradas_fatura_paga} item(ns) ignorado(s) porque pertencem a fatura de cartão já paga.`,
        );
      }
      await carregar();
    } catch (err) {
      toast.error(err.message || "Não foi possível aplicar sugestões.");
    } finally {
      setAplicando(false);
    }
  };

  const handleCriarRegra = async (e) => {
    e.preventDefault();
    if (!padrao.trim() || !categoriaId) {
      toast.error("Informe o padrão de texto e a categoria.");
      return;
    }
    setSalvandoRegra(true);
    try {
      const res = await fetch(`${API_URL}/inteligencia/classificacao/regras`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          padrao: padrao.trim(),
          tipo_match: tipoMatch,
          categoria_id: Number(categoriaId),
          prioridade: Number(prioridade) || 10,
          ativo: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Erro ao criar regra.");
      toast.success("Regra salva!");
      setPadrao("");
      await carregar();
    } catch (err) {
      toast.error(err.message || "Falha ao criar regra.");
    } finally {
      setSalvandoRegra(false);
    }
  };

  const handleToggleAtiva = async (regra) => {
    try {
      const res = await fetch(`${API_URL}/inteligencia/classificacao/regras/${regra.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ ativo: !regra.ativo }),
      });
      if (!res.ok) throw new Error("Não foi possível atualizar a regra.");
      toast.success(regra.ativo ? "Regra pausada." : "Regra ativada.");
      await carregar();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmarExcluirRegra = async () => {
    if (!regraParaExcluir) return;
    setExcluindo(true);
    try {
      const res = await fetch(
        `${API_URL}/inteligencia/classificacao/regras/${regraParaExcluir.id}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok) throw new Error("Erro ao remover regra.");
      toast.success("Regra removida.");
      setRegraParaExcluir(null);
      await carregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExcluindo(false);
    }
  };

  const handleTestarDescricao = async (e) => {
    e.preventDefault();
    if (!testeDesc.trim()) return;
    setTestando(true);
    try {
      const res = await fetch(`${API_URL}/inteligencia/classificacao/sugerir`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ descricao: testeDesc.trim(), tipo: "despesa" }),
      });
      const json = await res.json().catch(() => ({}));
      setTesteRes(json.sugestao || { sem_match: true });
    } catch {
      toast.error("Não foi possível testar a descrição.");
    } finally {
      setTestando(false);
    }
  };

  const prepararRegraDaSugestao = (sug) => {
    const clean = String(sug.descricao || "")
      .replace(/\s*\(\d+\s*\/\s*\d+\)\s*$/, "")
      .trim();
    setPadrao(clean);
    setCategoriaId(String(sug.categoria_sugerida_id));
    setTipoMatch("contains");
    toast("Padrão preenchido no formulário de regras.");
  };

  const selecionadasLista = sugestoes.filter((s) => selecionadas.has(s.transacao_id));

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark">
              <Tags className="w-5 h-5" />
            </span>
            Classificação Inteligente &amp; Regras
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Crie regras próprias de categorização e revise sugestões para suas despesas — sempre com sua aprovação explícita.
          </p>
        </div>

        <button
          type="button"
          onClick={carregar}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {/* Cards de Cobertura */}
      {estatisticas && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cobertura Específica</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-lime-spark mt-1">
              {estatisticas.cobertura_percentual}%
            </p>
            <span className="text-[11px] text-slate-400">
              {estatisticas.total_despesas_analisadas} despesa(s) analisadas
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sugestões Pendentes</span>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {sugestoes.length}
            </p>
            <span className="text-[11px] text-slate-400">aguardando revisão</span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sem / Genérica</span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {estatisticas.sem_categoria + estatisticas.em_categoria_generica}
            </p>
            <span className="text-[11px] text-slate-400">
              {estatisticas.sem_categoria} sem cat. · {estatisticas.em_categoria_generica} genéricas
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Regras Ativas</span>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {regras.filter((r) => r.ativo).length}
            </p>
            <span className="text-[11px] text-slate-400">{regras.length} cadastrada(s)</span>
          </div>
        </div>
      )}

      {/* Grid Principal: Sugestões à esquerda + Regras & Simulador à direita */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr] gap-6 items-start">
        {/* Sugestões para aprovação explícita */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-600 dark:text-lime-spark" />
                Sugestões de Reclassificação ({sugestoes.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nenhuma transação é alterada automaticamente sem seu clique de aprovação.
              </p>
            </div>

            {sugestoes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTodas}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {selecionadas.size === sugestoes.length ? "Desmarcar todas" : "Selecionar todas"}
                </button>
                <button
                  type="button"
                  disabled={selecionadasLista.length === 0 || aplicando}
                  onClick={() => aplicarLista(selecionadasLista)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  <CheckCheck size={14} />
                  Aplicar selecionadas ({selecionadasLista.length})
                </button>
              </div>
            )}
          </div>

          {loading && sugestoes.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">Analisando despesas...</p>
          ) : sugestoes.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Tudo bem classificado por aqui!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quando houver despesas sem categoria, em categorias genéricas ou divergentes das suas regras, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1 custom-scrollbar">
              {sugestoes.map((s) => {
                const checked = selecionadas.has(s.transacao_id);
                return (
                  <div
                    key={s.transacao_id}
                    className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      checked
                        ? "border-emerald-400 dark:border-lime-spark/60 bg-emerald-50/40 dark:bg-lime-spark/5"
                        : "border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelecionada(s.transacao_id)}
                        aria-label={`Selecionar ${s.descricao}`}
                        className="mt-1 w-4 h-4 accent-emerald-600 dark:accent-lime-spark cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-slate-900 dark:text-slate-100 truncate">
                            {s.descricao}
                          </strong>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {formatCurrency(s.valor)}
                          </span>
                          <span className="text-[11px] text-slate-400">{formatDate(s.data)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Atual: {s.categoria_atual_nome}
                          </span>
                          <span className="text-slate-400">&rarr;</span>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border"
                            style={{
                              borderColor: s.categoria_sugerida_cor || "#10b981",
                              color: s.categoria_sugerida_cor || "#10b981",
                              backgroundColor: `${s.categoria_sugerida_cor || "#10b981"}18`,
                            }}
                          >
                            {s.categoria_sugerida_nome}
                          </span>
                          <span className="text-slate-400">
                            ({ORIGEM_LABELS[s.origem] || s.origem} · {Math.round(s.confianca * 100)}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.motivo}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-7 sm:pl-0">
                      <button
                        type="button"
                        disabled={aplicando}
                        onClick={() => aplicarLista([s])}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        <Check size={13} /> Aprovar
                      </button>
                      {!s.regra_id && (
                        <AppTooltip content="Usar esta despesa para criar regra automática">
                          <button
                            type="button"
                            onClick={() => prepararRegraDaSugestao(s)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Wand2 size={14} />
                          </button>
                        </AppTooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna Direita: Simulador + Nova Regra + Lista de Regras */}
        <div className="space-y-6">
          {/* Simulador rápido */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Search size={15} className="text-emerald-600 dark:text-lime-spark" />
              Testar Classificação
            </h2>
            <form onSubmit={handleTestarDescricao} className="flex gap-2">
              <input
                type="text"
                value={testeDesc}
                onChange={(e) => setTesteDesc(e.target.value)}
                placeholder="Ex: Uber Centro, iFood, Netflix..."
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={testando || !testeDesc.trim()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0"
              >
                {testando ? "..." : "Testar"}
              </button>
            </form>
            {testeRes && (
              <div className="text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                {testeRes.sem_match ? (
                  <span className="text-slate-500 dark:text-slate-400">
                    Nenhuma regra ou associação automática encontrada para esta descrição.
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Sugestão: <strong>{testeRes.categoria_nome}</strong>{" "}
                      <span className="text-slate-400">({testeRes.motivo})</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark">
                      {Math.round((testeRes.confianca || 0) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Criar Nova Regra */}
          <form
            onSubmit={handleCriarRegra}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3"
          >
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus size={15} className="text-emerald-600 dark:text-lime-spark" />
              Nova Regra Automática
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Se a descrição
                </label>
                <div className="flex gap-2">
                  <select
                    value={tipoMatch}
                    onChange={(e) => setTipoMatch(e.target.value)}
                    className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value="contains">Contiver</option>
                    <option value="starts_with">Começar com</option>
                    <option value="exact">For exatamente</option>
                  </select>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={padrao}
                    onChange={(e) => setPadrao(e.target.value)}
                    placeholder="Ex: uber, supermercado, enel"
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Sugerir categoria
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                >
                  {categorias.length === 0 && <option value="">Cadastre uma categoria</option>}
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Prioridade (-100 a 1000)
                </label>
                <input
                  type="number"
                  min={-100}
                  max={1000}
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={salvandoRegra || categorias.length === 0}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-lime-spark dark:hover:bg-lime-spark/90 text-white dark:text-slate-900 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {salvandoRegra ? "Salvando..." : "Salvar Regra"}
            </button>
          </form>

          {/* Regras Salvas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Suas Regras ({regras.length})
            </h2>
            {regras.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                Nenhuma regra configurada ainda.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {regras.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                      r.ativo
                        ? "border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                        : "opacity-60 border-slate-200/50 dark:border-slate-800/60"
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-[10px] font-semibold">
                          {MATCH_LABELS[r.tipo_match] || r.tipo_match}
                        </span>
                        <strong className="text-slate-900 dark:text-slate-100 truncate">
                          &ldquo;{r.padrao}&rdquo;
                        </strong>
                        <span className="text-slate-400">&rarr;</span>
                        <span
                          className="font-bold"
                          style={{ color: r.categoria_cor || "#10b981" }}
                        >
                          {r.categoria_nome}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Prioridade: {r.prioridade} · Aplicada {r.acertos || 0}x
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <AppTooltip content={r.ativo ? "Pausar regra" : "Ativar regra"}>
                        <button
                          type="button"
                          onClick={() => handleToggleAtiva(r)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          {r.ativo ? <Pause size={13} /> : <Play size={13} />}
                        </button>
                      </AppTooltip>
                      <AppTooltip content="Excluir regra">
                        <button
                          type="button"
                          onClick={() => setRegraParaExcluir(r)}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </AppTooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(regraParaExcluir)}
        onClose={() => setRegraParaExcluir(null)}
        onConfirm={confirmarExcluirRegra}
        loading={excluindo}
        variant="destructive"
        title="Excluir regra de classificação"
        message={
          regraParaExcluir
            ? `Remover a regra "${regraParaExcluir.padrao}"? As transações já categorizadas não serão alteradas.`
            : ""
        }
        confirmText="Excluir"
      />
    </div>
  );
}
