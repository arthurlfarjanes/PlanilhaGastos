import React from "react";

export function Input({
  label,
  error,
  icon: Icon,
  className = "",
  id,
  ...props
}) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8E9AA8]"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 dark:text-[#8E9AA8] pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        <input
          id={id}
          className={`w-full py-3 px-3.5 ${
            Icon ? "pl-10" : ""
          } border border-slate-200 dark:border-[#2E3342] rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-[#14171F] placeholder-slate-400 dark:placeholder-[#687082] focus:outline-none focus:border-[#B6FFE2] focus:ring-4 focus:ring-[#B6FFE2]/15 transition-all shadow-xs ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500/15" : ""
          } ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
}

export function Select({
  label,
  error,
  children,
  className = "",
  id,
  ...props
}) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8E9AA8]"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full py-3 px-3.5 border border-slate-200 dark:border-[#2E3342] rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-[#14171F] focus:outline-none focus:border-[#B6FFE2] focus:ring-4 focus:ring-[#B6FFE2]/15 transition-all shadow-xs cursor-pointer ${
          error ? "border-red-500" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
}

export default Input;
