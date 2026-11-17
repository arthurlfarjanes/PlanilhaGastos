import React from "react";
import { Play, Compass, X, CheckCircle2 } from "lucide-react";
import { useTecoTour } from "@/context/TecoTourContext";
import TecoAvatar from "@/components/teco/TecoAvatar";

const ONBOARDING_STEPS = [
  { n: "1", title: "Registre entradas e gastos", route: "/dashboard" },
  { n: "2", title: "Automatize contas fixas", route: "/gastos-fixos" },
  { n: "3", title: "Defina limites em Orçamentos", route: "/orcamentos" },
  { n: "4", title: "Acompanhe metas e Projeções", route: "/projecoes" },
];

/**
 * Resumo de onboarding exibido ao primeiro acesso até o usuário concluir o tour inicial ou dispensar.
 */
export default function TecoOnboardingBanner() {
  const {
    shouldShowOnboardingBanner,
    isTourRunning,
    startTour,
    openHelp,
    dismissHint,
    navigateSafe,
  } = useTecoTour();

  if (!shouldShowOnboardingBanner || isTourRunning) return null;

  return (
    <section
      aria-label="Boas-vindas e resumo inicial do MeFinance"
      className="mb-5 rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-50 via-white to-sky-50/70 dark:from-emerald-950/35 dark:via-graphite-900 dark:to-slate-900 p-4 sm:p-5 shadow-xs"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <TecoAvatar mood="greeting" size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Bem-vindo ao MeFinance! Vamos começar?
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Guia inicial
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Em menos de 2 minutos o Teco mostra onde organizar seu mês — sem gastar nada da sua cota gratuita de IA.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dismissHint("onboarding-summary")}
          aria-label="Dispensar resumo inicial"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {ONBOARDING_STEPS.map((st) => (
          <button
            key={st.route}
            type="button"
            onClick={() => navigateSafe(st.route)}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 px-3 py-2 text-left text-xs hover:border-emerald-500/50 transition-colors cursor-pointer"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
              {st.n}
            </span>
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">
              {st.title}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => startTour("primeiros-passos", 0)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
        >
          <Play className="h-3.5 w-3.5" />
          Começar tour guiado
        </button>
        <button
          type="button"
          onClick={() => openHelp("explorar")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <Compass className="h-3.5 w-3.5 text-emerald-500" />
          Explorar funcionalidades
        </button>
        <button
          type="button"
          onClick={() => dismissHint("onboarding-summary")}
          className="ml-auto text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
        >
          Agora não
        </button>
      </div>
    </section>
  );
}
