import React from "react";

export function Badge({
  children,
  variant = "default",
  color,
  size = "md",
  className = "",
  ...props
}) {
  const sizes = {
    sm: "px-2 py-0.5 text-[0.65rem]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-sm",
  };

  const variants = {
    default:
      "bg-slate-100 dark:bg-[#23262F] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2E3342]",
    lime:
      "bg-[#B6FFE2]/15 text-[#059669] dark:text-[#B6FFE2] border border-[#B6FFE2]/30 font-semibold",
    emerald:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold",
    danger:
      "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 font-semibold",
    warning:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-semibold",
    info:
      "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 font-semibold",
  };

  // Estilo customizado quando uma cor hex for fornecida
  const customStyle = color
    ? {
        backgroundColor: `${color}18`,
        color: color,
        borderColor: `${color}35`,
      }
    : {};

  return (
    <span
      style={customStyle}
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full border ${
        sizes[size]
      } ${!color ? variants[variant] : ""} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
