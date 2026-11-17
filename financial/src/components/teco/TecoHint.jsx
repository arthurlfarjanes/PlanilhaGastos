import React, { useEffect, useRef, useState } from "react";
import { HelpCircle, X, ArrowRight, MessageSquare } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTecoTour } from "@/context/TecoTourContext";
import { getIndicatorExplanation } from "@/data/teco/contextualCatalog";
import TecoAvatar from "@/components/teco/TecoAvatar";
import TecoHelpFeedbackBox from "@/components/teco/TecoHelpFeedbackBox";
import { AppTooltip } from "@/components/ui/Tooltip";

/**
 * Ícone contextual "Explicar indicador" (100% local até o usuário clicar em "Perguntar ao Teco").
 */
export default function TecoHint({ metricId, className = "" }) {
  const { tipsEnabled, navigateSafe, askTeco } = useTecoTour();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const info = getIndicatorExplanation(metricId);

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!info || !tipsEnabled) return null;

  return (
    <span ref={wrapRef} className={`relative inline-flex items-center ${className}`}>
      <AppTooltip content={`Entender: ${info.title}`} side="top">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Explicar indicador ${info.title}`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors cursor-pointer"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </AppTooltip>

      {open && (
        <div
          role="dialog"
          aria-label={`Explicação: ${info.title}`}
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-emerald-500/30 bg-white dark:bg-graphite-900 p-4 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 text-left space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <TecoAvatar mood="explaining" size="xs" />
              <h4 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                {info.title}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar explicação"
              className="rounded-md p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {info.formula && (
            <p className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-700 dark:text-slate-200">
              {info.formula}
            </p>
          )}

          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {info.explanation}
          </p>

          {info.healthyRef && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
              {info.healthyRef}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {info.nextRoute && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigateSafe(info.nextRoute);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {info.nextLabel || "Ver módulo"}
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                askTeco(location.pathname, info.id);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer"
            >
              <MessageSquare className="h-3 w-3" />
              Perguntar ao Teco
            </button>
          </div>

          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <TecoHelpFeedbackBox topicId={info.id} route={location.pathname} compact />
          </div>
        </div>
      )}
    </span>
  );
}
