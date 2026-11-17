import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Play,
  RotateCcw,
  Compass,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Search,
  Trash2,
} from "lucide-react";
import { useTecoTour } from "@/context/TecoTourContext";
import TecoAvatar from "@/components/teco/TecoAvatar";
import { EXPLORE_FEATURE_GROUPS } from "@/data/teco/routeGuide";
import { AppTooltip } from "@/components/ui/Tooltip";

const TABS = [
  { id: "inicio", label: "Tours e Ações", icon: Play },
  { id: "entender", label: "Entender esta tela", icon: BookOpen },
  { id: "explorar", label: "Explorar sistema", icon: Compass },
];

export default function TecoHelpPanel() {
  const {
    helpOpen,
    helpTab,
    setHelpTab,
    closeHelp,
    currentGuide,
    recommendedTour,
    toursWithStatus,
    outdatedTours,
    savedActiveTour,
    tipsEnabled,
    toggleTipsEnabled,
    startTour,
    resumeTour,
    discardSavedTour,
    resetHelpProgress,
    askTeco,
    navigateSafe,
  } = useTecoTour();

  const [query, setQuery] = useState("");
  const panelRef = useRef(null);

  useEffect(() => {
    if (!helpOpen) return undefined;
    panelRef.current?.focus({ preventScroll: true });
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeHelp();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeHelp, helpOpen]);

  const tourByRoute = useMemo(() => {
    const map = new Map();
    for (const t of toursWithStatus) {
      if (t.id !== "primeiros-passos") {
        map.set(t.entryRoute, t);
      }
    }
    return map;
  }, [toursWithStatus]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXPLORE_FEATURE_GROUPS;
    return EXPLORE_FEATURE_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.short.toLowerCase().includes(q) ||
          item.route.toLowerCase().includes(q)
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  if (!helpOpen) return null;

  const onboardingTour = toursWithStatus.find((t) => t.id === "primeiros-passos");
  const recommendedWithStatus =
    toursWithStatus.find((t) => t.id === recommendedTour?.id) || onboardingTour;

  return (
    <div className="fixed inset-0 z-[65] flex justify-end bg-slate-950/50 backdrop-blur-[1px]">
      <div
        className="fixed inset-0"
        aria-hidden="true"
        onClick={closeHelp}
      />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Central de Ajuda do Teco"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-graphite-900 shadow-2xl outline-none"
      >
        {/* Cabeçalho */}
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <TecoAvatar mood="greeting" size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                  Ajuda do Teco
                </h2>
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Gratuito · offline
                </span>
              </div>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Tela atual: {currentGuide.title}
              </p>
            </div>
          </div>

          <AppTooltip content="Fechar ajuda (Esc)" side="left">
            <button
              type="button"
              onClick={closeHelp}
              aria-label="Fechar painel de ajuda"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </AppTooltip>
        </header>

        {/* Navegação interna */}
        <nav
          aria-label="Seções da ajuda"
          className="grid grid-cols-3 gap-1 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = helpTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHelpTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {helpTab === "inicio" && (
            <>
              {/* Banner Retomar tour */}
              {savedActiveTour && (
                <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                        Tour em andamento
                      </p>
                      <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                        {savedActiveTour.tour.title} · passo {savedActiveTour.step + 1} de{" "}
                        {savedActiveTour.tour.steps.length}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={discardSavedTour}
                      aria-label="Descartar tour salvo"
                      className="rounded-md p-1 text-amber-700/70 hover:bg-amber-500/15 hover:text-amber-900 dark:text-amber-300/70 dark:hover:text-amber-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={resumeTour}
                    className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retomar tour de onde parei
                  </button>
                </div>
              )}

              {/* Novidades em tours versionados */}
              {outdatedTours.length > 0 && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-200">
                    <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                    Novidades disponíveis ({outdatedTours.length})
                  </p>
                  <p className="mt-1 text-[11px] text-sky-700 dark:text-sky-300">
                    Apenas os tours atualizados aparecem aqui — seu restante segue concluído.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {outdatedTours.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => startTour(t.id, 0)}
                        className="rounded-lg bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30 hover:bg-sky-50 dark:hover:bg-slate-700"
                      >
                        Rever: {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações principais */}
              <div className="space-y-2.5">
                {recommendedWithStatus && (
                  <button
                    type="button"
                    onClick={() => startTour(recommendedWithStatus.id, 0)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3.5 text-left hover:bg-emerald-500/15 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                          Começar tour desta tela
                        </span>
                        {recommendedWithStatus.status?.completedCurrent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Concluído
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-emerald-700/90 dark:text-emerald-300/90">
                        {recommendedWithStatus.title} · {recommendedWithStatus.steps.length} passos
                      </p>
                    </div>
                    <Play className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  </button>
                )}

                {onboardingTour && onboardingTour.id !== recommendedWithStatus?.id && (
                  <button
                    type="button"
                    onClick={() => startTour("primeiros-passos", 0)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3.5 text-left hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Tour completo: Primeiros passos
                        </span>
                        {onboardingTour.status?.completedCurrent && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Passeio guiado por Dashboard, Transações, Orçamentos, Projeções e Teco IA
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setHelpTab("entender")}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Entender esta tela
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Indicadores, ações seguras e próximos passos em {currentGuide.title}
                    </p>
                  </div>
                  <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setHelpTab("explorar")}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Explorar funcionalidades
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Catálogo completo com 14+ fluxos do MeFinance
                    </p>
                  </div>
                  <Compass className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </div>

              {/* Preferências rápidas de ajuda */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Dicas contextuais do Teco
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Exibe atalhos discretos de explicação nas telas
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tipsEnabled}
                    onClick={toggleTipsEnabled}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      tipsEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        tipsEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Tours concluídos:{" "}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {toursWithStatus.filter((t) => t.status.completedCurrent).length}/
                      {toursWithStatus.length}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={resetHelpProgress}
                    className="font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                  >
                    Reiniciar progresso
                  </button>
                </div>
              </div>
            </>
          )}

          {helpTab === "entender" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentGuide.title}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {currentGuide.subtitle}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {currentGuide.summary}
                </p>
              </div>

              {currentGuide.indicators?.length > 0 && (
                <section>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Indicadores desta tela
                  </h4>
                  <ul className="space-y-2">
                    {currentGuide.indicators.map((ind) => (
                      <li
                        key={ind.label}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-xs"
                      >
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {ind.label}:
                        </span>{" "}
                        <span className="text-slate-600 dark:text-slate-300">{ind.meaning}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {currentGuide.actions?.length > 0 && (
                <section>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    O que você pode fazer aqui
                  </h4>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">
                    {currentGuide.actions.map((act) => (
                      <li key={act}>{act}</li>
                    ))}
                  </ul>
                </section>
              )}

              {currentGuide.prerequisites?.length > 0 && (
                <section className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
                  <h4 className="text-xs font-semibold text-sky-800 dark:text-sky-200">
                    Dica para melhores resultados
                  </h4>
                  <ul className="mt-1 space-y-1 text-xs text-sky-700 dark:text-sky-300">
                    {currentGuide.prerequisites.map((pre) => (
                      <li key={pre}>{pre}</li>
                    ))}
                  </ul>
                </section>
              )}

              {currentGuide.nextSteps?.length > 0 && (
                <section>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Próximos passos
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentGuide.nextSteps.map((next) => (
                      <button
                        key={next.route + next.label}
                        type="button"
                        onClick={() => {
                          navigateSafe(next.route);
                          closeHelp();
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      >
                        {next.label}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {recommendedWithStatus && (
                <button
                  type="button"
                  onClick={() => startTour(recommendedWithStatus.id, 0)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  Iniciar tour guiado desta tela
                </button>
              )}
            </div>
          )}

          {helpTab === "explorar" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar tela ou funcionalidade..."
                  aria-label="Buscar funcionalidade no catálogo do Teco"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {filteredGroups.map((group) => (
                <section key={group.id} className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {group.label}
                  </h4>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const tour = tourByRoute.get(item.route);
                      const status = tour?.status;
                      return (
                        <div
                          key={item.route}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                                {item.title}
                              </p>
                              {status?.completedCurrent && (
                                <CheckCircle2
                                  className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                                  aria-label="Tour concluído"
                                />
                              )}
                              {status?.outdated && (
                                <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                                  Atualizado
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {item.short}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                navigateSafe(item.route);
                                closeHelp();
                              }}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              Abrir
                            </button>
                            {tour && (
                              <button
                                type="button"
                                onClick={() => startTour(tour.id, 0)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors"
                              >
                                <Play className="h-3 w-3" />
                                Tour
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}

              {filteredGroups.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  Nenhuma funcionalidade encontrada para "{query}".
                </p>
              )}
            </div>
          )}
        </div>

        {/* Rodapé fixo: Perguntar ao Teco */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 px-5 py-3.5">
          <button
            type="button"
            onClick={() => askTeco()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-emerald-500/50 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-emerald-500" />
            Perguntar ao Teco no Assistente
          </button>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            Tours e guias são gratuitos e nunca consomem sua cota de IA.
          </p>
        </footer>
      </aside>
    </div>
  );
}
