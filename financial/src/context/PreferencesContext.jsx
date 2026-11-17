import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { setFormatConfig } from "../utils/formatters";

export const PreferencesContext = createContext(null);

export const DEFAULT_PREFERENCES = {
  appearance: {
    theme: "dark",
    accent: "emerald",
    density: "comfortable",
    reduceMotion: false,
    highContrast: false,
    fontScale: "normal",
    navLayout: "navbar",
  },
  dashboard: {
    defaultPeriod: "all",
    cardOrder: ["receitas", "despesas", "saldo"],
    hiddenCards: [],
  },
  financial: {
    currency: "BRL",
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
    dateFormat: "locale",
    periodStartDay: 1,
  },
  help: {
    completedTours: [],
    activeTour: null,
    dismissedHints: [],
    tipsEnabled: true,
    tourVersion: {},
  },
};

// Cache local APENAS para evitar "flash" de tema antes da resposta do servidor.
// A fonte da verdade é o servidor (Neon); o cache é limpo no logout.
const CACHE_KEY = "mefinance-prefs-cache";

const merge = (base, patch) => {
  const out = {};
  for (const section of Object.keys(base)) {
    out[section] = { ...base[section], ...(patch?.[section] || {}) };
  }
  return out;
};

const readCache = () => {
  try {
    return merge(DEFAULT_PREFERENCES, JSON.parse(localStorage.getItem(CACHE_KEY)));
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export function PreferencesProvider({ token, apiUrl, children }) {
  const [prefs, setPrefs] = useState(readCache);
  const [loaded, setLoaded] = useState(false);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true,
  );
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  // Formatadores regionais precisam estar atualizados antes dos filhos renderizarem.
  setFormatConfig(prefs.financial);

  // Carrega do servidor ao autenticar; limpa ao sair.
  useEffect(() => {
    if (!token) {
      localStorage.removeItem(CACHE_KEY);
      setPrefs(DEFAULT_PREFERENCES);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    fetch(`${apiUrl}/preferencias`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Falha ao carregar preferências.");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setPrefs(merge(DEFAULT_PREFERENCES, data));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true); // segue com defaults/cache
      });
    return () => {
      cancelled = true;
    };
  }, [token, apiUrl]);

  // Tema automático acompanha o sistema operacional.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const a = prefs.appearance;
  const resolvedTheme = a.theme === "auto" ? (systemDark ? "dark" : "light") : a.theme;

  // Aplica aparência no <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.dataset.accent = a.accent;
    root.dataset.density = a.density;
    root.dataset.fontScale = a.fontScale;
    root.dataset.reduceMotion = String(a.reduceMotion);
    root.dataset.contrast = a.highContrast ? "high" : "normal";
    root.lang = prefs.financial.locale;
    if (token) localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
  }, [resolvedTheme, a, prefs, token]);

  // Atualização otimista + persistência no servidor; reverte em caso de falha.
  const updatePreferences = useCallback(
    async (patch) => {
      const previous = prefsRef.current;
      setPrefs(merge(previous, patch));
      if (!token) return true; // sem sessão: apenas local (ex.: tela de login)
      try {
        const r = await fetch(`${apiUrl}/preferencias`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(patch),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Falha ao salvar preferências.");
        setPrefs(merge(DEFAULT_PREFERENCES, data));
        return true;
      } catch (err) {
        setPrefs(previous);
        toast.error(err.message);
        return false;
      }
    },
    [token, apiUrl],
  );

  const resetPreferences = useCallback(async () => {
    const previous = prefsRef.current;
    setPrefs(DEFAULT_PREFERENCES);
    if (!token) return true;
    try {
      const r = await fetch(`${apiUrl}/preferencias`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Falha ao restaurar preferências.");
      return true;
    } catch (err) {
      setPrefs(previous);
      toast.error(err.message);
      return false;
    }
  }, [token, apiUrl]);

  const toggleTheme = useCallback(
    () => updatePreferences({ appearance: { theme: resolvedTheme === "dark" ? "light" : "dark" } }),
    [updatePreferences, resolvedTheme],
  );

  const value = useMemo(
    () => ({ prefs, loaded, resolvedTheme, updatePreferences, resetPreferences, toggleTheme }),
    [prefs, loaded, resolvedTheme, updatePreferences, resetPreferences, toggleTheme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => useContext(PreferencesContext);

