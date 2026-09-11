import React from "react";
import { Link } from "react-router-dom";
import { ServerCrash, Home } from "lucide-react";

export default function ServerError() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="w-20 h-20 rounded-3xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 mb-6 shadow-lg shadow-red-500/5">
        <ServerCrash size={40} />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400 px-3 py-1 rounded-full bg-red-50 dark:bg-graphite-800 border border-red-200 dark:border-graphite-600 mb-3">
        Erro 500
      </span>
      <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
        Erro Interno do Servidor
      </h1>
      <p className="text-sm sm:text-base text-slate-600 dark:text-graphite-300 max-w-md mb-8">
        Ops! Nossos servidores estão enfrentando instabilidades no momento.
        Nossa equipe já foi notificada.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 font-bold px-6 py-3 rounded-xl bg-slate-900 dark:bg-lime-spark text-white dark:text-graphite-900 shadow-md hover:opacity-90 transition-all text-sm"
      >
        <Home size={18} /> Tentar ir para o Início
      </Link>
    </div>
  );
}
