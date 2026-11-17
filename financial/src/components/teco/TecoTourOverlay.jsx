import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  X,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import { useTecoTour } from "@/context/TecoTourContext";
import TecoAvatar from "@/components/teco/TecoAvatar";
import { AppTooltip } from "@/components/ui/Tooltip";

const PADDING = 8;

function computePopoverStyle(targetRect, placement, cardHeight = 270) {
  if (typeof window === "undefined") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(380, vw - 24);

  if (!targetRect || vw < 640) {
    // No mobile ou quando o alvo está ausente/oculto, fixa de forma segura sem cortar
    if (vw < 640 && targetRect) {
      const targetMid = targetRect.top + targetRect.height / 2;
      const placeBottom = targetMid < vh * 0.48;
      return {
        width: cardWidth,
        left: Math.round((vw - cardWidth) / 2),
        ...(placeBottom ? { bottom: 16 } : { top: 16 }),
      };
    }
    return {
      width: cardWidth,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const gap = 14;
  const paddedTop = Math.max(8, targetRect.top - PADDING);
  const paddedBottom = Math.min(vh - 8, targetRect.bottom + PADDING);
  const paddedLeft = Math.max(8, targetRect.left - PADDING);

  let top;
  let left = Math.max(12, Math.min(paddedLeft, vw - cardWidth - 12));

  const spaceBelow = vh - paddedBottom;
  const spaceAbove = paddedTop;

  if (placement === "top" && spaceAbove >= cardHeight + gap) {
    top = paddedTop - cardHeight - gap;
  } else if (placement !== "top" && spaceBelow >= cardHeight + gap) {
    top = paddedBottom + gap;
  } else if (spaceAbove >= cardHeight + gap) {
    top = paddedTop - cardHeight - gap;
  } else if (spaceBelow >= 160) {
    top = Math.min(vh - cardHeight - 12, paddedBottom + gap);
  } else {
    top = Math.max(12, Math.round((vh - cardHeight) / 2));
  }

  top = Math.max(12, Math.min(top, vh - cardHeight - 12));
  return { width: cardWidth, top, left };
}

export default function TecoTourOverlay() {
  const {
    activeTour,
    currentStep,
    stepIndex,
    isTourRunning,
    targetRect,
    resolvingTarget,
    targetMissing,
    nextStep,
    prevStep,
    skipStep,
    endTour,
  } = useTecoTour();

  const cardRef = useRef(null);
  const [cardHeight, setCardHeight] = useState(260);

  useEffect(() => {
    if (!isTourRunning || !cardRef.current) return;
    setCardHeight(cardRef.current.offsetHeight || 260);
    cardRef.current.focus({ preventScroll: true });
  }, [isTourRunning, currentStep?.id, targetMissing, resolvingTarget]);

  useEffect(() => {
    if (!isTourRunning) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        endTour({ completed: false });
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [endTour, isTourRunning, nextStep, prevStep]);

  const paddedRect = useMemo(() => {
    if (!targetRect || typeof window === "undefined") return null;
    const top = Math.max(0, targetRect.top - PADDING);
    const left = Math.max(0, targetRect.left - PADDING);
    const right = Math.min(window.innerWidth, targetRect.right + PADDING);
    const bottom = Math.min(window.innerHeight, targetRect.bottom + PADDING);
    return {
      top,
      left,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }, [targetRect]);

  if (!isTourRunning || !activeTour || !currentStep) return null;

  const totalSteps = activeTour.steps.length;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const popoverStyle = computePopoverStyle(targetRect, currentStep.placement, cardHeight);

  return (
    <div
      className="fixed inset-0 z-[70] pointer-events-none"
      aria-live="polite"
    >
      {/* Recorte não-bloqueante ao redor do elemento alvo */}
      {paddedRect ? (
        <>
          <div
            className="fixed left-0 right-0 top-0 bg-slate-950/55 transition-all duration-200 pointer-events-none"
            style={{ height: paddedRect.top }}
          />
          <div
            className="fixed left-0 bg-slate-950/55 transition-all duration-200 pointer-events-none"
            style={{
              top: paddedRect.top,
              height: paddedRect.height,
              width: paddedRect.left,
            }}
          />
          <div
            className="fixed right-0 bg-slate-950/55 transition-all duration-200 pointer-events-none"
            style={{
              top: paddedRect.top,
              height: paddedRect.height,
              left: paddedRect.right,
            }}
          />
          <div
            className="fixed left-0 right-0 bottom-0 bg-slate-950/55 transition-all duration-200 pointer-events-none"
            style={{ top: paddedRect.bottom }}
          />
          <div
            aria-hidden="true"
            className="fixed rounded-xl ring-2 ring-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] transition-all duration-200 pointer-events-none"
            style={{
              top: paddedRect.top,
              left: paddedRect.left,
              width: paddedRect.width,
              height: paddedRect.height,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-slate-950/50 pointer-events-none" />
      )}

      {/* Card flutuante do Teco */}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-label={`${activeTour.title}: ${currentStep.title}`}
        style={popoverStyle}
        className="fixed z-[71] pointer-events-auto rounded-2xl border border-emerald-500/30 bg-white dark:bg-graphite-900 p-4 shadow-2xl outline-none ring-1 ring-black/5 dark:ring-white/10"
      >
        <div className="flex items-start gap-3">
          <TecoAvatar mood={currentStep.mood || "explaining"} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                {activeTour.title} · {stepIndex + 1}/{totalSteps}
              </span>
              <AppTooltip content="Pausar e continuar depois (Esc)" side="top">
                <button
                  type="button"
                  onClick={() => endTour({ completed: false })}
                  aria-label="Pausar tour e fechar"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </AppTooltip>
            </div>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
              {currentStep.title}
            </h3>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {currentStep.description}
        </p>

        {resolvingTarget && (
          <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 shrink-0" />
            <span>Preparando seção desta tela...</span>
          </div>
        )}

        {targetMissing && (
          <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-800 dark:text-amber-200">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
            <span>
              {currentStep.fallbackHint ||
                "Este bloco está oculto ou indisponível no layout atual, mas você pode avançar normalmente para a próxima etapa."}
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={() => endTour({ discardProgress: true })}
              className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Encerrar
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {!isLast && (
              <button
                type="button"
                onClick={skipStep}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Pular
              </button>
            )}
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
