import React, { useMemo, useState } from "react";
import { CalendarClock, CreditCard, Edit2, Search, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, todayInTimezone } from "../utils/formatters";
import { isParcelaVincenda } from "../utils/parcelas";
import { AppTooltip } from "@/components/ui/Tooltip";

const PARCELA_REGEX = /^(.*?)\s*\((\d{1,3}\/\d{1,3})\)$/;

function diffDaysISO(fromISO, toISO) {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86400000);
}

function ParcelasVincendas({ parcelas = [], loading, onEdit, onDelete, timezone }) {
  const [busca, setBusca] = useState("");
  const hoje = todayInTimezone(timezone);

  const parcelasFiltradas = useMemo(() => {
    const futuras = parcelas.filter((p) => isParcelaVincenda(p, hoje));
    const termo = busca.trim().toLowerCase();
    if (!termo) return futuras;
    return futuras.filter(
      (p) =>
        (p.descricao || "").toLowerCase().includes(termo) ||
        (p.cartao_nome || "").toLowerCase().includes(termo) ||
        (p.cartao_excluido_nome || "").toLowerCase().includes(termo) ||
        (p.categoria_nome || "").toLowerCase().includes(termo),
    );
  }, [parcelas, busca, hoje]);

  const totalValor = useMemo(
    () => parcelasFiltradas.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0),
    [parcelasFiltradas],
  );

  const proximoVencimento =
    parcelasFiltradas.length > 0 ? formatDate(parcelasFiltradas[0].data) : "—";

  if (loading) {
    return (
      <div className="bg-white dark:bg-graphite-800 rounded-2xl p-8 text-center border border-slate-200/80 dark:border-graphite-600">
        <p className="text-slate-500 dark:text-graphite-300 animate-pulse font-medium">
          Carregando parcelas vincendas...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho e resumo das parcelas a vencer */}
      <div className="bg-white dark:bg-graphite-800 p-5 sm:p-7 rounded-2xl shadow-xs border border-slate-200/80 dark:border-graphite-600 transition-colors duration-200 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-graphite-600 pb-3">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CalendarClock size={18} className="text-[var(--accent-strong)] dark:text-lime-spark" />
              Parcelas Vincendas
            </h3>
            <p className="text-xs text-slate-500 dark:text-graphite-300 mt-0.5">
              Parcelas futuras de compras parceladas que ainda não atingiram a data de vencimento.
            </p>
          </div>

          <div className="relative flex items-center sm:w-64">
            <Search
              size={15}
              className="absolute left-3 text-slate-400 dark:text-graphite-400 pointer-events-none"
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar parcela, cartão..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-[#2E3342] rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-[#14171F] focus:outline-none focus:border-[var(--color-lime-spark)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-graphite-900 border border-slate-200/70 dark:border-graphite-600">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-500 dark:text-graphite-300">
              Parcelas a Vencer
            </span>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {parcelasFiltradas.length}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-graphite-900 border border-slate-200/70 dark:border-graphite-600">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-500 dark:text-graphite-300">
              Total Vincendo
            </span>
            <p className="text-lg font-black text-red-500 dark:text-red-400 mt-0.5">
              {formatCurrency(totalValor)}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-graphite-900 border border-slate-200/70 dark:border-graphite-600">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-500 dark:text-graphite-300">
              Próximo Vencimento
            </span>
            <p className="text-lg font-black text-emerald-600 dark:text-lime-spark mt-0.5">
              {proximoVencimento}
            </p>
          </div>
        </div>
      </div>

      {/* Lista cronológica */}
      {parcelasFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-graphite-800 p-12 rounded-2xl border border-slate-200/80 dark:border-graphite-600 text-center shadow-xs">
          <p className="text-slate-400 dark:text-graphite-300 font-medium">
            {busca.trim()
              ? "Nenhuma parcela vincenda encontrada para essa busca."
              : "Nenhuma parcela vincenda no momento."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-228.75 overflow-y-auto pr-1 custom-scrollbar">
          {parcelasFiltradas.map((t) => {
            const match = (t.descricao || "").match(PARCELA_REGEX);
            const tituloBase = match ? match[1] : t.descricao;
            const badgeParcela = match ? match[2] : null;
            const dataISO = String(t.data || "").slice(0, 10);
            const diasRestantes = dataISO && hoje ? diffDaysISO(hoje, dataISO) : null;

            return (
              <div
                key={t.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-white dark:bg-graphite-800 rounded-2xl shadow-xs border border-slate-200/80 dark:border-graphite-600 border-l-4 sm:border-l-[6px] border-l-amber-500 transition-all duration-150 hover:shadow-md hover:translate-x-0.5"
              >
                <div className="flex items-start gap-3.5 mb-3 sm:mb-0 min-w-0">
                  <div className="p-2.5 rounded-xl shrink-0 mt-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300">
                    <CalendarClock size={18} strokeWidth={2.2} />
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 truncate">
                        {tituloBase}
                      </span>
                      {badgeParcela && (
                        <span className="text-[0.7rem] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/25">
                          Parcela {badgeParcela}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-graphite-900 text-slate-600 dark:text-graphite-300 border border-slate-200 dark:border-graphite-600">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: t.categoria_cor || "#10b981" }}
                        />
                        {t.categoria_nome || "Sem Categoria"}
                      </span>

                      <span className="text-xs text-slate-500 dark:text-graphite-300 font-semibold">
                        Vence em {formatDate(t.data)}
                        {diasRestantes != null && diasRestantes > 0 && (
                          <span className="text-slate-400 dark:text-graphite-400 font-normal">
                            {" "}
                            ({diasRestantes === 1 ? "amanhã" : `em ${diasRestantes} dias`})
                          </span>
                        )}
                      </span>

                      {t.cartao_nome && (
                        <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20">
                          <CreditCard size={11} />
                          {t.cartao_nome}
                        </span>
                      )}

                      {!t.cartao_id && t.cartao_excluido_nome && (
                        <AppTooltip content="Esta transação foi lançada em um cartão que não está mais cadastrado.">
                          <span
                            className="inline-flex items-center gap-1 text-[0.7rem] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-dashed border-amber-300 dark:border-amber-500/35"
                          >
                            <CreditCard size={11} />
                            Cartão excluído ({t.cartao_excluido_nome})
                          </span>
                        </AppTooltip>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2.5 pt-3 sm:pt-0 border-t border-slate-100 dark:border-graphite-600 sm:border-0 w-full sm:w-auto">
                  <span className="text-xl font-black self-start sm:self-end text-red-500 dark:text-red-400">
                    - {formatCurrency(t.valor)}
                  </span>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => onEdit(t)}
                      className="flex-1 sm:flex-none justify-center bg-slate-100 dark:bg-graphite-700 hover:bg-slate-200 dark:hover:bg-graphite-600 text-slate-700 dark:text-slate-200 py-2 sm:py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200 dark:border-graphite-600 cursor-pointer"
                    >
                      <Edit2 size={13} /> Editar
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="flex-1 sm:flex-none justify-center bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 py-2 sm:py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-red-200/60 dark:border-red-500/20 cursor-pointer"
                    >
                      <Trash2 size={13} /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ParcelasVincendas;

