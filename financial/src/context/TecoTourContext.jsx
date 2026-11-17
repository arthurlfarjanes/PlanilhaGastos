import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { usePreferences } from "@/context/PreferencesContext";
import { normalizeAllowedTecoRoute } from "@/data/teco/allowedRoutes";
import { getRouteGuide } from "@/data/teco/routeGuide";
import {
  TECO_TOURS,
  getRecommendedTourForRoute,
  getTourById,
  getTourStatus,
} from "@/data/teco/tourRegistry";

const TecoTourContext = createContext(null);

function isElementVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function TecoTourProvider({ role = "user", token = null, apiUrl = "", children }) {
  const { prefs, updatePreferences } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTab, setHelpTab] = useState("inicio");
  const [runningState, setRunningState] = useState(null); // { id, step, version }
  const [targetRect, setTargetRect] = useState(null);
  const [resolvingTarget, setResolvingTarget] = useState(false);
  const [targetMissing, setTargetMissing] = useState(false);

  const lastScrolledStepRef = useRef(null);
  const helpPrefs = useMemo(
    () =>
      prefs?.help || {
        completedTours: [],
        activeTour: null,
        dismissedHints: [],
        tipsEnabled: true,
        tourVersion: {},
      },
    [prefs?.help]
  );
  const reduceMotion = Boolean(prefs?.appearance?.reduceMotion);

  const currentGuide = useMemo(() => getRouteGuide(location.pathname), [location.pathname]);
  const recommendedTour = useMemo(
    () => getRecommendedTourForRoute(location.pathname),
    [location.pathname]
  );

  const activeTour = useMemo(
    () => (runningState ? getTourById(runningState.id) : null),
    [runningState]
  );
  const stepIndex = runningState?.step ?? 0;
  const currentStep = activeTour?.steps?.[stepIndex] || null;

  const savedActiveTour = useMemo(() => {
    const saved = helpPrefs?.activeTour;
    if (!saved || !saved.id) return null;
    const tour = getTourById(saved.id);
    if (!tour || !tour.steps?.length) return null;
    const clampedStep = Math.max(0, Math.min(Number(saved.step || 0), tour.steps.length - 1));
    return {
      ...saved,
      step: clampedStep,
      tour,
    };
  }, [helpPrefs?.activeTour]);

  const navigateSafe = useCallback(
    (target) => {
      const normalized = normalizeAllowedTecoRoute(target, { role });
      if (!normalized) {
        toast.error("Rota não permitida pelo Teco.");
        return false;
      }
      navigate(normalized.full);
      return true;
    },
    [navigate, role]
  );

  const openHelp = useCallback((tab = "inicio") => {
    setHelpTab(tab);
    setHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setHelpOpen(false);
  }, []);

  const persistHelpPatch = useCallback(
    (patch) => {
      return updatePreferences({ help: patch });
    },
    [updatePreferences]
  );

  const startTour = useCallback(
    (tourId, initialStep = 0) => {
      const tour = getTourById(tourId);
      if (!tour || !tour.steps?.length) return false;
      const safeIndex = Math.max(0, Math.min(initialStep, tour.steps.length - 1));
      const step = tour.steps[safeIndex];
      const normalized = normalizeAllowedTecoRoute(step.route, { role });
      if (!normalized) {
        toast.error("Esta tela do tour não está disponível para sua conta.");
        return false;
      }

      setHelpOpen(false);
      lastScrolledStepRef.current = null;
      const nextState = { id: tour.id, step: safeIndex, version: tour.version };
      setRunningState(nextState);

      if (location.pathname !== normalized.pathname) {
        navigate(normalized.full);
      }

      persistHelpPatch({ activeTour: nextState });
      return true;
    },
    [location.pathname, navigate, persistHelpPatch, role]
  );

  const resumeTour = useCallback(() => {
    if (!savedActiveTour) return false;
    return startTour(savedActiveTour.id, savedActiveTour.step);
  }, [savedActiveTour, startTour]);

  const endTour = useCallback(
    ({ completed = false, discardProgress = false } = {}) => {
      const current = runningState;
      const tour = current ? getTourById(current.id) : null;
      setRunningState(null);
      setTargetRect(null);
      setTargetMissing(false);
      setResolvingTarget(false);
      lastScrolledStepRef.current = null;

      if (!current || !tour) return;

      if (completed) {
        const prevCompleted = Array.isArray(helpPrefs.completedTours)
          ? helpPrefs.completedTours
          : [];
        const completedTours = prevCompleted.includes(tour.id)
          ? prevCompleted
          : [...prevCompleted, tour.id];
        const prevVersions =
          helpPrefs.tourVersion && typeof helpPrefs.tourVersion === "object"
            ? helpPrefs.tourVersion
            : {};
        persistHelpPatch({
          completedTours,
          activeTour: null,
          tourVersion: { ...prevVersions, [tour.id]: tour.version },
        });
        toast.success(`Tour "${tour.title}" concluído!`);
        return;
      }

      if (discardProgress) {
        persistHelpPatch({ activeTour: null });
        return;
      }

      // Pausado no meio: preserva ponto exato para permitir "Retomar tour" depois
      persistHelpPatch({
        activeTour: { id: tour.id, step: current.step, version: tour.version },
      });
    },
    [helpPrefs.completedTours, helpPrefs.tourVersion, persistHelpPatch, runningState]
  );

  const goToStep = useCallback(
    (nextIdx) => {
      if (!activeTour) return;
      if (nextIdx < 0) return;
      if (nextIdx >= activeTour.steps.length) {
        endTour({ completed: true });
        return;
      }
      const nextStepObj = activeTour.steps[nextIdx];
      const normalized = normalizeAllowedTecoRoute(nextStepObj.route, { role });
      if (!normalized) {
        // Se uma etapa aponta para rota restrita, pula com segurança
        if (nextIdx + 1 < activeTour.steps.length) {
          goToStep(nextIdx + 1);
        } else {
          endTour({ completed: true });
        }
        return;
      }

      const nextState = {
        id: activeTour.id,
        step: nextIdx,
        version: activeTour.version,
      };
      lastScrolledStepRef.current = null;
      setRunningState(nextState);
      if (location.pathname !== normalized.pathname) {
        navigate(normalized.full);
      }
      persistHelpPatch({ activeTour: nextState });
    },
    [activeTour, endTour, location.pathname, navigate, persistHelpPatch, role]
  );

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    goToStep(stepIndex + 1);
  }, [activeTour, goToStep, stepIndex]);

  const prevStep = useCallback(() => {
    if (!activeTour) return;
    goToStep(Math.max(0, stepIndex - 1));
  }, [activeTour, goToStep, stepIndex]);

  const skipStep = useCallback(() => {
    if (!activeTour) return;
    goToStep(stepIndex + 1);
  }, [activeTour, goToStep, stepIndex]);

  const discardSavedTour = useCallback(() => {
    persistHelpPatch({ activeTour: null });
  }, [persistHelpPatch]);

  const toggleTipsEnabled = useCallback(() => {
    persistHelpPatch({ tipsEnabled: !helpPrefs.tipsEnabled });
  }, [helpPrefs.tipsEnabled, persistHelpPatch]);

  const resetHelpProgress = useCallback(() => {
    setRunningState(null);
    persistHelpPatch({
      completedTours: [],
      activeTour: null,
      dismissedHints: [],
      tourVersion: {},
    });
    toast.success("Progresso dos tours reiniciado.");
  }, [persistHelpPatch]);

  const askTeco = useCallback(
    (origemPath = location.pathname, topico = "") => {
      setHelpOpen(false);
      const cleanPath = (origemPath || "/comparativo").replace(/\/+$/, "") || "/comparativo";
      const params = new URLSearchParams({ origem: cleanPath });
      if (topico && /^[a-z0-9_-]{1,64}$/.test(topico)) {
        params.set("topico", topico);
      }
      navigateSafe(`/assistente?${params.toString()}`);
    },
    [location.pathname, navigateSafe]
  );

  const dismissHint = useCallback(
    (hintId) => {
      if (!hintId || !/^[a-z0-9-]{1,64}$/.test(hintId)) return;
      const prev = Array.isArray(helpPrefs.dismissedHints) ? helpPrefs.dismissedHints : [];
      if (prev.includes(hintId)) return;
      persistHelpPatch({ dismissedHints: [...prev, hintId] });
    },
    [helpPrefs.dismissedHints, persistHelpPatch]
  );

  const submitHelpFeedback = useCallback(
    async ({ topicId, route = location.pathname, helpful, reason, note = "" }) => {
      if (!token || !apiUrl) return false;
      const cleanRoute = (route || "/comparativo").replace(/\/+$/, "") || "/comparativo";
      try {
        const res = await fetch(`${apiUrl}/preferencias/ajuda-feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topicId,
            route: cleanRoute,
            helpful: Boolean(helpful),
            reason: reason || (helpful ? "helpful" : "not_helpful"),
            note: note ? String(note).trim().slice(0, 240) : null,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success(
          reason === "outdated"
            ? "Obrigado! Registramos seu aviso sobre instrução desatualizada."
            : "Obrigado pelo feedback!"
        );
        return true;
      } catch {
        toast.error("Não foi possível enviar o feedback agora.");
        return false;
      }
    },
    [apiUrl, location.pathname, token]
  );

  // Resolver e acompanhar a posição do elemento alvo `[data-tour="..."]`
  useEffect(() => {
    if (!currentStep || !activeTour) {
      setTargetRect(null);
      setTargetMissing(false);
      setResolvingTarget(false);
      return undefined;
    }

    let cancelled = false;
    const stepKey = `${activeTour.id}:${currentStep.id}`;
    const expectedPath = currentStep.route;

    const measure = () => {
      if (cancelled) return false;
      if (location.pathname !== expectedPath) {
        setTargetRect(null);
        setResolvingTarget(true);
        setTargetMissing(false);
        return false;
      }

      const el = document.querySelector(currentStep.target);
      if (!el || !isElementVisible(el)) {
        return false;
      }

      if (lastScrolledStepRef.current !== stepKey) {
        lastScrolledStepRef.current = stepKey;
        const r = el.getBoundingClientRect();
        const outOfView = r.top < 72 || r.bottom > window.innerHeight - 80;
        if (outOfView) {
          el.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }

      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      });
      setResolvingTarget(false);
      setTargetMissing(false);
      return true;
    };

    setResolvingTarget(true);
    setTargetMissing(false);

    // Tentativa imediata + acompanhamento durante Suspense/carregamento de dados
    const foundNow = measure();
    let timeoutId = null;

    if (!foundNow) {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        const foundLater = measure();
        if (!foundLater) {
          setResolvingTarget(false);
          setTargetRect(null);
          setTargetMissing(true);
        }
      }, 2200);
    }

    const observer = new MutationObserver(() => {
      if (measure() && timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-tour"],
    });

    const onViewportChange = () => {
      measure();
    };

    window.addEventListener("resize", onViewportChange, { passive: true });
    window.addEventListener("scroll", onViewportChange, { passive: true, capture: true });

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [activeTour, currentStep, location.pathname, reduceMotion]);

  const toursWithStatus = useMemo(
    () =>
      TECO_TOURS.map((tour) => ({
        ...tour,
        status: getTourStatus(tour, helpPrefs),
      })),
    [helpPrefs]
  );

  const outdatedTours = useMemo(
    () => toursWithStatus.filter((t) => t.status.outdated),
    [toursWithStatus]
  );

  const shouldShowOnboardingBanner = useMemo(() => {
    if (!token) return false;
    if (helpPrefs.tipsEnabled === false) return false;
    const completed = Array.isArray(helpPrefs.completedTours) ? helpPrefs.completedTours : [];
    const dismissed = Array.isArray(helpPrefs.dismissedHints) ? helpPrefs.dismissedHints : [];
    return (
      !completed.includes("primeiros-passos") &&
      !savedActiveTour &&
      !dismissed.includes("onboarding-summary")
    );
  }, [helpPrefs.completedTours, helpPrefs.dismissedHints, helpPrefs.tipsEnabled, savedActiveTour, token]);

  const value = useMemo(
    () => ({
      helpOpen,
      helpTab,
      setHelpTab,
      openHelp,
      closeHelp,
      helpPrefs,
      tipsEnabled: Boolean(helpPrefs.tipsEnabled ?? true),
      toggleTipsEnabled,
      currentGuide,
      recommendedTour,
      toursWithStatus,
      outdatedTours,
      shouldShowOnboardingBanner,
      activeTour,
      stepIndex,
      currentStep,
      isTourRunning: Boolean(activeTour && currentStep),
      savedActiveTour,
      targetRect,
      resolvingTarget,
      targetMissing,
      startTour,
      resumeTour,
      nextStep,
      prevStep,
      skipStep,
      endTour,
      discardSavedTour,
      resetHelpProgress,
      dismissHint,
      submitHelpFeedback,
      askTeco,
      navigateSafe,
    }),
    [
      helpOpen,
      helpTab,
      openHelp,
      closeHelp,
      helpPrefs,
      toggleTipsEnabled,
      currentGuide,
      recommendedTour,
      toursWithStatus,
      outdatedTours,
      shouldShowOnboardingBanner,
      activeTour,
      stepIndex,
      currentStep,
      savedActiveTour,
      targetRect,
      resolvingTarget,
      targetMissing,
      startTour,
      resumeTour,
      nextStep,
      prevStep,
      skipStep,
      endTour,
      discardSavedTour,
      resetHelpProgress,
      dismissHint,
      submitHelpFeedback,
      askTeco,
      navigateSafe,
    ]
  );

  return <TecoTourContext.Provider value={value}>{children}</TecoTourContext.Provider>;
}

export function useTecoTour() {
  const ctx = useContext(TecoTourContext);
  if (!ctx) {
    throw new Error("useTecoTour deve ser usado dentro de TecoTourProvider.");
  }
  return ctx;
}
