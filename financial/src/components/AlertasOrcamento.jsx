import React, { useState, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import { Target, AlertTriangle, AlertCircle, ArrowRight } from "lucide-react";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import { formatCurrency, todayInTimezone } from "../utils/formatters";

export default function AlertasOrcamento({ refreshKey = 0 }) {
  const { token, API_URL } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const timezone = prefs?.financial?.timezone || "America/Sao_Paulo";

  const [dados, setDados] = useState(null);
  const [ano, mes] = todayInTimezone(timezone).split("-").map(Number);

  const carregar = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/orcamentos?mes=${mes}&ano=${ano}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDados(await res.json());
    } catch {
      // Falha silenciosa no widget do Dashboard
    }
  }, [API_URL, token, mes, ano]);

  useEffect(() => {
    carregar();
  }, [carregar, refreshKey]);

  if (!dados || (dados.resumo?.contagem?.ativos ?? 0) === 0) {
    return null;
  }

  const alertas = (dados.itens || []).filter(
    (i) => i.ativo && (i.status === "alerta" || i.status === "excedido"),
  );

  if (alertas.length === 0) return null;

  return (
    <div className="bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200/80 dark:border-graphite-600 shadow-xs p-5 flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-500/20">
            <Target size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              Alertas de Orçamento
            </h2>
            <p className="text-xs text-slate-500 dark:text-graphite-300">
              {alertas.length} categoria(s) perto ou acima do limite neste mês
            </p>
          </div>
        </div>

        <Link
          to="/orcamentos"
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent-strong)] dark:text-lime-spark hover:underline"
        >
          Gerenciar <ArrowRight size={14} />
        </Link>
      </div>

      <ul className="flex flex-col gap-2.5">
        {alertas.slice(0, 4).map((item) => {
          const excedido = item.status === "excedido";
          return (
            <li key={item.id} className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {excedido ? (
                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                  ) : (
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  )}
                  {item.categoria_nome}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-200 shrink-0">
                  {formatCurrency(item.gasto_realizado)} / {formatCurrency(item.valor_limite)} (
                  {item.percentual_consumido}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-graphite-900 overflow-hidden">
                <div
                  className={`h-full rounded-full ${excedido ? "bg-red-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(100, item.percentual_consumido)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

