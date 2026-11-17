import React from "react";
import { HelpCircle, Play, RotateCcw, BookOpen } from "lucide-react";
import { useTecoTour } from "@/context/TecoTourContext";
import TecoAvatar from "@/components/teco/TecoAvatar";

/**
 * Faixa contextual discreta exibida no topo da tela atual quando `tipsEnabled` está ativo.
 * Oferece acesso direto a "Entender esta tela", "Começar tour" ou "Retomar tour".
 */
export default function TecoHelpLauncher() {
  const {
    tipsEnabled,
    isTourRunning,
    currentGuide,
    recommendedTour,
    savedActiveTour,
    outdatedTours,
    openHelp,
    startTour,
    resumeTour,
  } = useTecoTour();

  if (!tipsEnabled || isTourRunning) return null;

  const hasOutdated = outdatedTours.length > 0;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/75 dark:bg-graphite-900/60 px-3 py-2 text-xs shadow-xs backdrop-blur-xs">
      <div className="flex min-w-0 items-center gap-2.5">
        <TecoAvatar mood={savedActiveTour ? "thinking" : "idle"} size="xs" />
        <span className="truncate text-slate-600 dark:text-slate-300">
          <strong className="font-semibold text-slate-800 dark:text-slate-100">Teco:</strong>{" "}
          {savedActiveTour
            ? `Você parou no passo ${savedActiveTour.step + 1} de "${savedActiveTour.tour.title}".`
            : currentGuide.subtitle}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {savedActiveTour ? (
          <button
            type="button"
            onClick={resumeTour}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Retomar tour
          </button>
        ) : (
          recommendedTour && (
            <button
              type="button"
              onClick={() => startTour(recommendedTour.id, 0)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 transition-colors"
            >
              <Play className="h-3 w-3" />
              Tour desta tela
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => openHelp("entender")}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <BookOpen className="h-3 w-3 text-emerald-500" />
          Entender tela
        </button>

        <button
          type="button"
          onClick={() => openHelp("inicio")}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Ajuda</span>
          {hasOutdated && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-sky-500"
              aria-label="Novidades de tour disponíveis"
            />
          )}
        </button>
      </div>
    </div>
  );
}
