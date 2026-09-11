import React from "react";

export function Card({ children, className = "", hover = false, ...props }) {
  return (
    <div
      className={`bg-white dark:bg-[#1E222B] rounded-2xl border border-slate-200/80 dark:border-[#2E3342] shadow-sm ${
        hover ? "transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-[#3E4351]" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div
      className={`p-5 sm:p-6 pb-4 sm:pb-4 border-b border-slate-100 dark:border-[#2E3342] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", ...props }) {
  return (
    <h3
      className={`font-bold text-lg sm:text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "", ...props }) {
  return (
    <p
      className={`text-xs sm:text-sm text-slate-500 dark:text-[#8E9AA8] mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ children, className = "", ...props }) {
  return (
    <div className={`p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
