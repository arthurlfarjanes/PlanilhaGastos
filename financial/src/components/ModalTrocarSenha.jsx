import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Lock, Save } from "lucide-react";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function ModalTrocarSenha({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("As novas senhas não coincidem.");
    }

    if (newPassword.length < 8) {
      return toast.error("A nova senha deve ter no mínimo 8 caracteres.");
    }

    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao trocar a senha");

      toast.success("Senha alterada com sucesso!");
      handleClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-600">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Lock size={20} className="text-lime-spark" />
            Trocar Senha
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha Atual (se possuir)</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
            />
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-graphite-700">
              Cancelar
            </Button>
            <Button type="submit" variant="default" disabled={loading} className="cursor-pointer bg-lime-spark text-graphite-900 hover:bg-lime-spark-hover">
              <Save size={16} /> Salvar Senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
