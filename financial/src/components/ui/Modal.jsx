import React, { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop com blur */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Conteúdo do Modal */}
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-[#1E222B] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#2E3342] overflow-hidden z-10 animate-scale-in my-8`}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 dark:border-[#2E3342]">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#2E3342] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
