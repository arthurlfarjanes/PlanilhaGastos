import React from "react";
import { Link } from "react-router-dom";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12">
      {/* Ícone com destaque na cor do tema */}
      <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 dark:bg-lime-spark/10 border border-emerald-500/20 dark:border-lime-spark/30 flex items-center justify-center text-[#059669] dark:text-lime-spark mb-6 shadow-lg shadow-emerald-500/5">
        <FileQuestion size={40} />
      </div>

      {/* Badge de Erro */}
      <span className="text-xs font-bold uppercase tracking-widest text-[#059669] dark:text-lime-spark px-3 py-1 rounded-full bg-emerald-50 dark:bg-graphite-800 border border-emerald-200 dark:border-graphite-600 mb-3">
        Erro 404
      </span>

      <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
        Página não encontrada
      </h1>

      <p className="text-sm sm:text-base text-slate-600 dark:text-graphite-300 max-w-md mb-8">
        Ops! A página que você tentou acessar não existe, foi movida ou o
        endereço inserido está incorreto.
      </p>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          to="/"
          className="w-full sm:w-auto flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl bg-[#059669] dark:bg-lime-spark text-white dark:text-graphite-900 shadow-md hover:bg-emerald-600 dark:hover:bg-lime-spark-hover hover:-translate-y-0.5 transition-all cursor-pointer text-sm"
        >
          <Home size={18} /> Ir para a página inicial
        </Link>
      </div>
    </div>
  );
}
