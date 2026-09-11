import React, { useState } from "react";
import { LifeBuoy, X } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  return (
    <>
      <footer className="w-full py-6 mt-auto border-t border-slate-200/80 dark:border-graphite-700 bg-white/50 dark:bg-graphite-900/50 backdrop-blur-sm text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 dark:text-graphite-400">
          <p>© {currentYear} MeFinance. Todos os direitos reservados.</p>

          <div className="flex items-center gap-4">
            <a
              href="/politica-de-privacidade.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Privacidade
            </a>

            {/* <span>•</span>

            <a
              href="/termos.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Termos
            </a> */}

            <span>•</span>

            <button
              onClick={() => setIsSupportOpen(true)}
              className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-transparent border-none cursor-pointer p-0 text-xs text-slate-400 dark:text-graphite-400 font-sans"
            >
              Suporte
            </button>
          </div>
        </div>
      </footer>

      {/* Modal integrado puramente com Tailwind */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-graphite-800 border border-slate-200 dark:border-graphite-600 text-slate-900 dark:text-slate-100 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setIsSupportOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center gap-2 mt-1">
              <div className="w-12 h-12 rounded-2xl bg-lime-spark/20 text-[#059669] dark:text-lime-spark flex items-center justify-center border border-lime-spark/40 mb-1">
                <LifeBuoy size={24} />
              </div>
              <h3 className="text-lg font-bold">Suporte em Desenvolvimento</h3>
              <p className="text-slate-500 dark:text-graphite-300 text-sm">
                Esta funcionalidade está sendo construída com carinho e estará
                disponível em breve para ajudar você com qualquer dúvida!
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setIsSupportOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-lime-spark text-graphite-900 font-bold text-sm shadow-[0_4px_14px_rgba(182,255,226,0.3)] hover:bg-lime-spark-hover hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
