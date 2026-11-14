import React, { useState, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import { formatCurrency, formatDate, todayInTimezone } from "../utils/formatters";

export default function ProximosVencimentos({ onPago }) {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";

  const [resumo, setResumo] = useState(null);
  const [pagandoId, setPagandoId] = useState(null);

  const hojeStr = todayInTimezone(timezone);
  const [ano, mes] = hojeStr.split("-").map(Number);

  const carregarResumo = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/gastos-fixos/resumo?mes=${mes}&ano=${ano}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setResumo(await res.json());
      }
    } catch {
      // Falha silenciosa no widget para não bloquear o Dashboard principal
    }
  }, [API_URL, token, mes, ano]);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  const handlePagarRapido = async (item) => {
    setPagandoId(item.id);
    try {
      const res = await fetch(`${API_URL}/gastos-fixos/${item.id}/pagar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ano,
          mes,
          data_pagamento: hojeStr,
          lancar_transacao: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao pagar conta.");
      toast.success(`"${item.descricao}" marcada como paga!`);
      await carregarResumo();
      if (onPago) onPago();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPagandoId(null);
    }
  };

  if (!resumo || (resumo.contagem?.ativas ?? 0) === 0) {
    return null;
  }

  const lista = (resumo.proximos_vencimentos || []).slice(0, 5);

  return (
    <div className="bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200/80 dark:border-graphite-600 shadow-xs p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-500/20">
            <CalendarClock size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              Próximos Vencimentos do Mês
            </h2>
            <p className="text-xs text-slate-500 dark:text-graphite-300">
              {resumo.contagem.pendentes} pendente(s) · A pagar:{" "}
              <strong className="text-slate-700 dark:text-slate-100">
                {formatCurrency(resumo.total_despesas_pendentes)}
              </strong>
            </p>
          </div>
        </div>

        <Link
          to="/gastos-fixos"
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent-strong)] dark:text-lime-spark hover:underline"
        >
          Ver todas <ArrowRight size={14} />
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20">
          <CheckCircle2 size={16} />
          Todas as contas fixas deste mês estão pagas!
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-graphite-600">
          {lista.map((item) => {
            const atrasado = item.status_competencia === "atrasado";
            const hoje = item.status_competencia === "vence_hoje";
            return (
              <li
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {atrasado ? (
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  ) : (
                    <Clock
                      size={16}
                      className={hoje ? "text-amber-500 shrink-0" : "text-slate-400 shrink-0"}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {item.descricao}
                    </p>
                    <p
                      className={`text-xs ${
                        atrasado
                          ? "text-red-500 font-semibold"
                          : hoje
                            ? "text-amber-600 dark:text-amber-400 font-semibold"
                            : "text-slate-500 dark:text-graphite-300"
                      }`}
                    >
                      {atrasado
                        ? `Atrasada (${formatDate(item.data_vencimento)})`
                        : hoje
                          ? "Vence hoje"
                          : `Vence em ${formatDate(item.data_vencimento)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {formatCurrency(item.valor)}
                  </span>
                  <button
                    type="button"
                    disabled={pagandoId === item.id}
                    onClick={() => handlePagarRapido(item)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-200/70 dark:border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {pagandoId === item.id ? "..." : "Pagar"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

