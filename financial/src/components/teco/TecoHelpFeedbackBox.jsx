import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Flag, CheckCircle2 } from "lucide-react";
import { useTecoTour } from "@/context/TecoTourContext";

export default function TecoHelpFeedbackBox({ topicId, route, compact = false }) {
  const { submitHelpFeedback } = useTecoTour();
  const [sent, setSent] = useState(null); // "helpful" | "not_helpful" | "outdated" | null
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const handleVote = async (reason) => {
    if (sending) return;
    setSending(true);
    const helpful = reason === "helpful";
    const ok = await submitHelpFeedback({
      topicId,
      route,
      helpful,
      reason,
      note: showNote ? note : "",
    });
    setSending(false);
    if (ok) {
      setSent(reason);
      setShowNote(false);
      setNote("");
    }
  };

  if (sent) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>
          {sent === "outdated"
            ? "Aviso registrado. Obrigado por ajudar a manter os guias em dia!"
            : "Feedback registrado. Obrigado!"}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`flex flex-wrap items-center justify-between gap-2 ${compact ? "text-[11px]" : "text-xs"}`}>
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          Esta explicação foi útil?
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={sending}
            onClick={() => handleVote("helpful")}
            aria-label="Sim, foi útil"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <ThumbsUp className="h-3 w-3" /> Sim
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => handleVote("not_helpful")}
            aria-label="Não foi útil"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-rose-500/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            <ThumbsDown className="h-3 w-3" /> Não
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => setShowNote((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Flag className="h-3 w-3" /> Desatualizada?
          </button>
        </div>
      </div>

      {showNote && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
          <input
            type="text"
            maxLength={240}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="O que mudou nesta tela? (opcional, até 240 caracteres)"
            aria-label="Descreva o que está desatualizado"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500 focus:outline-none"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowNote(false)}
              className="rounded-lg px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => handleVote("outdated")}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer disabled:opacity-50"
            >
              Enviar aviso
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
