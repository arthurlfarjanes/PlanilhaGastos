import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message = "Tem certeza que deseja prosseguir com esta ação?",
  confirmText = "Excluir",
  cancelText = "Cancelar",
  variant = "danger",
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <p className="text-sm text-slate-600 dark:text-[#8E9AA8] leading-relaxed pt-1">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
