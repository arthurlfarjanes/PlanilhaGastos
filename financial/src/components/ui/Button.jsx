import React from "react";
import { Loader2 } from "lucide-react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };

  const variants = {
    // Lime Spark primário com texto Graphite para alto contraste e modernidade
    primary:
      "bg-[#B6FFE2] text-[#14171F] font-bold hover:bg-[#8DF3CA] shadow-[0_2px_12px_rgba(182,255,226,0.25)] hover:shadow-[0_4px_18px_rgba(182,255,226,0.35)]",
    // Superfície Graphite com texto claro
    secondary:
      "bg-slate-100 dark:bg-[#23262F] text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-[#2E3342] border border-slate-200 dark:border-[#2E3342]",
    // Acento Vermelho para exclusões
    danger:
      "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white border border-red-200 dark:border-red-500/20",
    // Contorno
    outline:
      "border border-slate-300 dark:border-[#2E3342] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#23262F]",
    // Ghost
    ghost:
      "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#23262F]/60 hover:text-slate-900 dark:hover:text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin shrink-0" />}
      {children}
    </button>
  );
}

export default Button;
