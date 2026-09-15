import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./input";
import { AlertTriangle, KeyRound } from "lucide-react";

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message = "Tem certeza que deseja prosseguir com esta ação?",
  confirmText = "Excluir",
  cancelText = "Cancelar",
  variant = "destructive",
  loading = false,
  askPassword = false,
}) {
  const [password, setPassword] = React.useState("");

  // Reseta a senha quando o modal fechar ou abrir
  React.useEffect(() => {
    if (isOpen) setPassword("");
  }, [isOpen]);
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

        {askPassword && (
          <div className="flex flex-col gap-2 pt-2 px-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <KeyRound size={16} className="text-slate-400" />
              Sua senha de administrador
            </label>
            <Input 
              type="password"
              placeholder="Digite sua senha para confirmar"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-graphite-700">
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={() => onConfirm(askPassword ? password : null)}
            disabled={loading || (askPassword && !password)}
            className="cursor-pointer"
          >
            {loading ? "Processando..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
