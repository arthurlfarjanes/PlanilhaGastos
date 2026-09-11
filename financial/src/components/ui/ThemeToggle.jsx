import React from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ theme, toggleTheme, className = "" }) {
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className={`relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#23262F] border border-slate-200 dark:border-[#2E3342] text-slate-600 dark:text-[#B6FFE2] hover:bg-slate-200 dark:hover:bg-[#2A2E39] hover:scale-105 transition-all cursor-pointer shadow-xs ${className}`}
      aria-label="Alternar tema"
    >
      {isDark ? (
        <Sun size={19} className="transition-transform duration-200 rotate-0 hover:rotate-45 text-[#B6FFE2]" />
      ) : (
        <Moon size={19} className="transition-transform duration-200 rotate-0 hover:-rotate-12 text-slate-700" />
      )}
    </button>
  );
}

export default ThemeToggle;
