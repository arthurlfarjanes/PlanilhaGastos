import React, { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "../App";
import { usePreferences } from "../context/PreferencesContext";
import toast from "react-hot-toast";
import {
  formatDate,
  formatDateTimeInTimezone,
  resolveSafeTimezone,
} from "../utils/formatters";
import {
  ShieldAlert,
  Users,
  Activity,
  Search,
  UserPlus,
  Trash2,
  Copy,
  Loader2,
  UserX,
  RefreshCw,
  Edit2,
  Terminal,
  AlertTriangle,
  AlertOctagon,
  Info,
  Cpu,
  HeartPulse,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Database,
  CheckCircle2,
  KeyRound,
  LayoutDashboard,
  ThumbsUp,
  Flag,
} from "lucide-react";
import ConfirmDialog from "./ui/ConfirmDialog";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { AppTooltip } from "@/components/ui/Tooltip";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const ACTION_LABELS = {
  "user.create": "Criação de usuário",
  "user.update": "Edição de cadastro",
  "user.role_change": "Mudança de papel",
  "user.activate": "Ativação de conta",
  "user.deactivate": "Desativação de conta",
  "user.reset_password": "Reset de senha",
  "user.delete": "Exclusão de usuário",
};

function PaginationBar({ pagination, onPageChange, loading }) {
  if (!pagination || pagination.totalPages <= 1) {
    return pagination ? (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {pagination.total} registro(s) encontrado(s)
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
      <span>
        Página <strong>{pagination.page}</strong> de <strong>{pagination.totalPages}</strong> ·{" "}
        {pagination.total} registro(s)
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="h-8 px-2.5 cursor-pointer"
        >
          <ChevronLeft size={14} /> Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="h-8 px-2.5 cursor-pointer"
        >
          Próxima <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

function AdminPanel() {
  const { API_URL, token, username: currentAdminUsername } = useContext(AuthContext);
  const { prefs } = usePreferences();
  const adminTimezone = resolveSafeTimezone(prefs?.financial?.timezone);

  const [activeTab, setActiveTab] = useState("visao_geral");

  // Overview & Health
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // IA / Teco Observability
  const [aiDays, setAiDays] = useState(7);
  const [aiMetrics, setAiMetrics] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Usuários (paginado)
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [userFilters, setUserFilters] = useState({ search: "", role: "all", status: "all", page: 1 });
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Auditoria administrativa (paginada)
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [auditFilters, setAuditFilters] = useState({ action: "all", startDate: "", endDate: "", page: 1 });
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Logs do sistema (paginados)
  const [systemLogs, setSystemLogs] = useState([]);
  const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [logsSummary, setLogsSummary] = useState({ totalErrors: 0, totalWarnings: 0, totalInfos: 0, errorsByDate: [] });
  const [logFilters, setLogFilters] = useState({ startDate: "", endDate: "", level: "all", route: "", userId: "", page: 1 });
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Modais
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSummary, setUserSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "user", adminPassword: "" });
  const [creatingUser, setCreatingUser] = useState(false);

  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState({ id: null, originalRole: "user", username: "", email: "", role: "user", adminPassword: "" });
  const [editingUserLoading, setEditingUserLoading] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: "",
    userId: null,
    username: "",
    activeStatus: null,
    requirePassword: false,
  });
  const [resetResult, setResetResult] = useState({ isOpen: false, password: "", username: "" });

  const authHeaders = useCallback(
    (json = false) => ({
      ...(json ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  const fetchOverview = useCallback(async () => {
    if (!token) return;
    setLoadingOverview(true);
    try {
      const r = await fetch(`${API_URL}/admin/overview`, { headers: authHeaders(), cache: "no-store" });
      if (!r.ok) throw new Error("Falha ao carregar visão geral.");
      setOverview(await r.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingOverview(false);
    }
  }, [API_URL, authHeaders, token]);

  const fetchHealth = useCallback(async () => {
    if (!token) return;
    setLoadingHealth(true);
    try {
      const r = await fetch(`${API_URL}/admin/health`, { headers: authHeaders(), cache: "no-store" });
      if (!r.ok) throw new Error("Falha ao verificar saúde do sistema.");
      setHealth(await r.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingHealth(false);
    }
  }, [API_URL, authHeaders, token]);

  const fetchAiMetrics = useCallback(async () => {
    if (!token) return;
    setLoadingAi(true);
    try {
      const r = await fetch(`${API_URL}/admin/ai-metrics?days=${aiDays}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Falha ao carregar métricas de IA e Teco.");
      setAiMetrics(await r.json());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingAi(false);
    }
  }, [API_URL, aiDays, authHeaders, token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        page: String(userFilters.page),
        limit: "20",
      });
      if (userFilters.search.trim()) params.set("search", userFilters.search.trim());
      if (userFilters.role !== "all") params.set("role", userFilters.role);
      if (userFilters.status !== "all") params.set("status", userFilters.status);

      const r = await fetch(`${API_URL}/admin/users?${params.toString()}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Falha ao buscar usuários.");
      const data = await r.json();
      setUsers(Array.isArray(data?.items) ? data.items : []);
      if (data?.pagination) setUsersPagination(data.pagination);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [API_URL, authHeaders, token, userFilters]);

  const fetchAudit = useCallback(async () => {
    if (!token) return;
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams({
        page: String(auditFilters.page),
        limit: "25",
        timezone: adminTimezone,
      });
      if (auditFilters.action !== "all") params.set("action", auditFilters.action);
      if (auditFilters.startDate) params.set("startDate", auditFilters.startDate);
      if (auditFilters.endDate) params.set("endDate", auditFilters.endDate);

      const r = await fetch(`${API_URL}/admin/audit?${params.toString()}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Falha ao buscar trilha de auditoria.");
      const data = await r.json();
      setAuditLogs(Array.isArray(data?.items) ? data.items : []);
      if (data?.pagination) setAuditPagination(data.pagination);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingAudit(false);
    }
  }, [API_URL, adminTimezone, auditFilters, authHeaders, token]);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        page: String(logFilters.page),
        limit: "50",
        timezone: adminTimezone,
      });
      if (logFilters.startDate) params.set("startDate", logFilters.startDate);
      if (logFilters.endDate) params.set("endDate", logFilters.endDate);
      if (logFilters.level !== "all") params.set("level", logFilters.level);
      if (logFilters.route.trim()) params.set("route", logFilters.route.trim());
      if (logFilters.userId && logFilters.userId !== "all") params.set("userId", logFilters.userId);

      const r = await fetch(`${API_URL}/admin/logs?${params.toString()}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Falha ao buscar logs do sistema.");
      const data = await r.json();
      setSystemLogs(Array.isArray(data?.items) ? data.items : []);
      if (data?.pagination) setLogsPagination(data.pagination);
      if (data?.summary) setLogsSummary(data.summary);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingLogs(false);
    }
  }, [API_URL, adminTimezone, authHeaders, logFilters, token]);

  useEffect(() => {
    fetchOverview();
    fetchUsers();
  }, [fetchOverview, fetchUsers]);

  useEffect(() => {
    if (activeTab === "auditoria") fetchAudit();
    if (activeTab === "logs") fetchLogs();
    if (activeTab === "ia") fetchAiMetrics();
    if (activeTab === "saude") fetchHealth();
  }, [activeTab, fetchAiMetrics, fetchAudit, fetchHealth, fetchLogs]);

  const handleOpenSummary = async (user) => {
    setSelectedUser(user);
    setSummaryModalOpen(true);
    setLoadingSummary(true);
    try {
      const r = await fetch(`${API_URL}/admin/users/${user.id}/summary`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Falha ao carregar resumo administrativo.");
      setUserSummary(await r.json());
    } catch (err) {
      toast.error(err.message);
      setSummaryModalOpen(false);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const r = await fetch(`${API_URL}/admin/users`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(newUser),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Erro ao criar usuário.");

      toast.success("Usuário criado com sucesso!");
      setCreateUserOpen(false);
      setNewUser({ username: "", email: "", password: "", role: "user", adminPassword: "" });
      fetchUsers();
      fetchOverview();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditingUserLoading(true);
    try {
      const r = await fetch(`${API_URL}/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({
          username: editingUser.username,
          email: editingUser.email,
          role: editingUser.role,
          adminPassword: editingUser.adminPassword || undefined,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Erro ao editar usuário.");

      toast.success(data.message || "Usuário atualizado!");
      setEditUserOpen(false);
      fetchUsers();
      fetchOverview();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditingUserLoading(false);
    }
  };

  const handleConfirmAction = async (password = null) => {
    const { type, userId, activeStatus, username: targetUsername, requirePassword } = confirmDialog;
    if (requirePassword && !password) return;
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

    try {
      if (type === "toggle") {
        const r = await fetch(`${API_URL}/admin/users/${userId}/status`, {
          method: "PATCH",
          headers: authHeaders(true),
          body: JSON.stringify({ is_active: !activeStatus, adminPassword: password }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Erro ao atualizar status.");
        toast.success(data.message);
      } else if (type === "delete") {
        const r = await fetch(`${API_URL}/admin/users/${userId}`, {
          method: "DELETE",
          headers: authHeaders(true),
          body: JSON.stringify({ adminPassword: password }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Erro ao deletar usuário.");
        toast.success(data.message);
      } else if (type === "reset") {
        const r = await fetch(`${API_URL}/admin/users/${userId}/reset-password`, {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify({ adminPassword: password }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Erro ao resetar senha.");
        setResetResult({ isOpen: true, password: data.tempPassword, username: targetUsername });
      }
      fetchUsers();
      fetchOverview();
      if (activeTab === "auditoria") fetchAudit();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openConfirm = (type, user) => {
    const mustAskPassword =
      type === "delete" ||
      type === "reset" ||
      user.role === "admin" ||
      (type === "toggle" && user.is_active === true);
    setConfirmDialog({
      isOpen: true,
      type,
      userId: user.id,
      username: user.username,
      activeStatus: user.is_active,
      requirePassword: mustAskPassword,
    });
  };

  const openEdit = (user) => {
    setEditingUser({
      id: user.id,
      originalRole: user.role,
      username: user.username,
      email: user.email || "",
      role: user.role,
      adminPassword: "",
    });
    setEditUserOpen(true);
  };

  const editNeedsAdminPassword =
    editingUser.originalRole === "admin" || editingUser.role !== editingUser.originalRole;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white dark:bg-graphite-800 rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-100 dark:border-graphite-600">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
                Painel do Administrador
              </h1>
              <p className="text-slate-500 dark:text-graphite-300 text-xs sm:text-sm mt-0.5">
                Operações administrativas, auditoria e observabilidade (fuso: {adminTimezone}) — dados financeiros e conversas permanecem privados.
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 mb-6 bg-slate-100 dark:bg-graphite-900 rounded-xl p-1 h-auto">
            <TabsTrigger value="visao_geral" className="cursor-pointer rounded-lg py-2 text-xs font-semibold">
              <LayoutDashboard size={14} className="mr-1.5" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="cursor-pointer rounded-lg py-2 text-xs font-semibold">
              <Users size={14} className="mr-1.5" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="cursor-pointer rounded-lg py-2 text-xs font-semibold">
              <ClipboardList size={14} className="mr-1.5" /> Auditoria
            </TabsTrigger>
            <TabsTrigger value="logs" className="cursor-pointer rounded-lg py-2 text-xs font-semibold">
              <Terminal size={14} className="mr-1.5" /> Logs
            </TabsTrigger>
            <TabsTrigger value="ia" className="cursor-pointer rounded-lg py-2 text-xs font-semibold">
              <Cpu size={14} className="mr-1.5" /> IA &amp; Teco
            </TabsTrigger>
            <TabsTrigger value="saude" className="cursor-pointer rounded-lg py-2 text-xs font-semibold">
              <HeartPulse size={14} className="mr-1.5" /> Saúde
            </TabsTrigger>
          </TabsList>

          {/* 1. VISÃO GERAL */}
          <TabsContent value="visao_geral" className="space-y-5">
            {loadingOverview && !overview ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-lime-spark w-8 h-8" />
              </div>
            ) : overview ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-slate-50/70 dark:bg-graphite-900/60 p-4 space-y-1">
                    <p className="text-xs font-semibold text-slate-500 dark:text-graphite-300">Contas cadastradas</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{overview.users.total}</p>
                    <p className="text-[11px] text-slate-500">
                      {overview.users.active} ativas · {overview.users.inactive} inativas · {overview.users.admins} admin(s)
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-slate-50/70 dark:bg-graphite-900/60 p-4 space-y-1">
                    <p className="text-xs font-semibold text-slate-500 dark:text-graphite-300">Novos cadastros</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-lime-spark">+{overview.users.new_7d}</p>
                    <p className="text-[11px] text-slate-500">
                      Últimos 7 dias (+{overview.users.new_30d} em 30 dias)
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-slate-50/70 dark:bg-graphite-900/60 p-4 space-y-1">
                    <p className="text-xs font-semibold text-slate-500 dark:text-graphite-300">Logs de erro / atenção</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{overview.logs.errors_24h}</p>
                    <p className="text-[11px] text-slate-500">
                      Erros 24h · {overview.logs.errors_7d} erros e {overview.logs.warnings_7d} avisos (7d)
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 bg-slate-50/70 dark:bg-graphite-900/60 p-4 space-y-1">
                    <p className="text-xs font-semibold text-slate-500 dark:text-graphite-300">Teco IA &amp; Ajuda (7d)</p>
                    <p className="text-2xl font-black text-sky-600 dark:text-sky-400">{overview.ai.requests_7d}</p>
                    <p className="text-[11px] text-slate-500">
                      {overview.ai.unique_users_7d} usuários únicos IA · {overview.tecoHelp.users_with_tours} com tours
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-graphite-700 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                  <span>
                    Ações administrativas auditadas (7d): <strong>{overview.audit.actions_7d}</strong> · Feedbacks Teco Ajuda:{" "}
                    <strong>{overview.tecoHelp.feedback_helpful}</strong> positivos / <strong>{overview.tecoHelp.feedback_outdated}</strong> avisos de revisão
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={fetchOverview} className="h-8 cursor-pointer">
                    <RefreshCw size={13} className="mr-1.5" /> Atualizar
                  </Button>
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* 2. USUÁRIOS */}
          <TabsContent value="usuarios" className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    type="search"
                    placeholder="Buscar username ou e-mail..."
                    value={userFilters.search}
                    onChange={(e) => setUserFilters((p) => ({ ...p, search: e.target.value, page: 1 }))}
                    className="pl-8 bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
                  />
                </div>
                <Select value={userFilters.role} onValueChange={(v) => setUserFilters((p) => ({ ...p, role: v, page: 1 }))}>
                  <SelectTrigger className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700">
                    <SelectValue placeholder="Papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os papéis</SelectItem>
                    <SelectItem value="user">Usuário Comum</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={userFilters.status} onValueChange={(v) => setUserFilters((p) => ({ ...p, status: v, page: 1 }))}>
                  <SelectTrigger className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Somente ativos</SelectItem>
                    <SelectItem value="inactive">Somente inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                <DialogTrigger render={<Button className="cursor-pointer rounded-xl font-bold bg-lime-spark text-graphite-900 hover:bg-lime-spark-hover shrink-0" />}>
                  <UserPlus size={16} className="mr-1.5" /> Novo Usuário
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-600 text-slate-900 dark:text-slate-100">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Criar Novo Usuário</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="username">Nome de Usuário</Label>
                      <Input
                        id="username"
                        required
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Senha Temporária</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="role">Função</Label>
                      <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                        <SelectTrigger className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700">
                          <SelectValue placeholder="Selecione a função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário Comum</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newUser.role === "admin" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="create-adm-pw" className="flex items-center gap-1.5">
                          <KeyRound size={13} /> Sua senha de administrador (obrigatória)
                        </Label>
                        <Input
                          id="create-adm-pw"
                          type="password"
                          required
                          value={newUser.adminPassword}
                          onChange={(e) => setNewUser({ ...newUser, adminPassword: e.target.value })}
                          className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
                        />
                      </div>
                    )}
                    <Button type="submit" className="w-full font-bold cursor-pointer bg-lime-spark text-graphite-900 hover:bg-lime-spark-hover" disabled={creatingUser}>
                      {creatingUser && <Loader2 className="animate-spin mr-2" size={16} />}
                      Criar Usuário
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-graphite-700 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-graphite-900/70">
                  <tr className="border-b border-slate-200 dark:border-graphite-700">
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">ID</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Usuário</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Role</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Cadastro</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers && users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center">
                        <Loader2 className="animate-spin text-lime-spark mx-auto" size={26} />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-sm text-slate-500">
                        Nenhum usuário encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-t border-slate-100 dark:border-graphite-700/50 hover:bg-slate-50 dark:hover:bg-graphite-700/30 transition-colors">
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-500">#{user.id}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.username}</span>
                            <span className="text-xs text-slate-500 dark:text-graphite-400">{user.email || "Sem e-mail"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${user.role === "admin" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" : "bg-slate-100 text-slate-600 dark:bg-graphite-700 dark:text-graphite-300"}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${user.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                            {user.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {user.created_at ? formatDateTimeInTimezone(user.created_at, adminTimezone) : "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <AppTooltip content="Resumo administrativo (sem finanças)">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenSummary(user)} className="cursor-pointer text-slate-400 hover:text-blue-500 rounded-lg">
                                <Activity size={17} />
                              </Button>
                            </AppTooltip>
                            <AppTooltip content="Editar usuário">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(user)} className="cursor-pointer text-slate-400 hover:text-lime-600 rounded-lg">
                                <Edit2 size={17} />
                              </Button>
                            </AppTooltip>
                            <AppTooltip content="Resetar senha">
                              <Button variant="ghost" size="icon" onClick={() => openConfirm("reset", user)} className="cursor-pointer text-slate-400 hover:text-amber-500 rounded-lg">
                                <RefreshCw size={17} />
                              </Button>
                            </AppTooltip>
                            {user.username !== currentAdminUsername && (
                              <>
                                <AppTooltip content={user.is_active ? "Desativar" : "Ativar"}>
                                  <Button variant="ghost" size="icon" onClick={() => openConfirm("toggle", user)} className="cursor-pointer text-slate-400 hover:text-amber-600 rounded-lg">
                                    <UserX size={17} />
                                  </Button>
                                </AppTooltip>
                                <AppTooltip content="Excluir usuário">
                                  <Button variant="ghost" size="icon" onClick={() => openConfirm("delete", user)} className="cursor-pointer text-slate-400 hover:text-red-500 rounded-lg">
                                    <Trash2 size={17} />
                                  </Button>
                                </AppTooltip>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              pagination={usersPagination}
              loading={loadingUsers}
              onPageChange={(page) => setUserFilters((p) => ({ ...p, page }))}
            />
          </TabsContent>

          {/* 3. AUDITORIA ADMINISTRATIVA */}
          <TabsContent value="auditoria" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-graphite-900 p-4 rounded-2xl border border-slate-100 dark:border-graphite-700">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Ação</Label>
                <Select value={auditFilters.action} onValueChange={(v) => setAuditFilters((p) => ({ ...p, action: v, page: 1 }))}>
                  <SelectTrigger className="bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-700">
                    <SelectValue placeholder="Todas as ações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    {Object.entries(ACTION_LABELS).map(([k, lbl]) => (
                      <SelectItem key={k} value={k}>{lbl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Data Inicial</Label>
                <Input
                  type="date"
                  value={auditFilters.startDate}
                  onChange={(e) => setAuditFilters((p) => ({ ...p, startDate: e.target.value, page: 1 }))}
                  className="bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-700"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Data Final</Label>
                <Input
                  type="date"
                  value={auditFilters.endDate}
                  onChange={(e) => setAuditFilters((p) => ({ ...p, endDate: e.target.value, page: 1 }))}
                  className="bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-700"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAuditFilters({ action: "all", startDate: "", endDate: "", page: 1 })}
                  className="w-full cursor-pointer"
                >
                  <RefreshCw size={14} className="mr-1.5" /> Limpar
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-graphite-700 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-graphite-900">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Data/Hora</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Admin</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Ação</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Alvo</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Metadados</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAudit ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center">
                        <Loader2 className="animate-spin text-lime-spark mx-auto" size={26} />
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-sm text-slate-500">
                        Nenhum evento administrativo registrado neste filtro.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((ev) => (
                      <tr key={ev.id} className="border-t border-slate-100 dark:border-graphite-700/50 text-xs">
                        <AppTooltip content={`Fuso: ${adminTimezone} · UTC: ${ev.created_at}`}>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {formatDateTimeInTimezone(ev.created_at, adminTimezone)}
                          </td>
                        </AppTooltip>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {ev.actor_username || (ev.actor_user_id ? `ID ${ev.actor_user_id}` : "Sistema")}
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded-md bg-slate-100 dark:bg-graphite-700 px-2 py-0.5 font-semibold text-slate-700 dark:text-slate-200">
                            {ACTION_LABELS[ev.action] || ev.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {ev.target_type}#{ev.target_id ?? "-"}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                          {JSON.stringify(ev.metadata_sanitized || {})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              pagination={auditPagination}
              loading={loadingAudit}
              onPageChange={(page) => setAuditFilters((p) => ({ ...p, page }))}
            />
          </TabsContent>

          {/* 4. LOGS DO SISTEMA */}
          <TabsContent value="logs" className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 dark:bg-graphite-900 p-4 rounded-2xl border border-slate-100 dark:border-graphite-700">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Nível</Label>
                <Select value={logFilters.level} onValueChange={(v) => setLogFilters((p) => ({ ...p, level: v, page: 1 }))}>
                  <SelectTrigger className="bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-700">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os níveis</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Rota contém</Label>
                <Input
                  type="text"
                  placeholder="/relatorios, /ia..."
                  value={logFilters.route}
                  onChange={(e) => setLogFilters((p) => ({ ...p, route: e.target.value, page: 1 }))}
                  className="bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-700"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Data Inicial</Label>
                <Input
                  type="date"
                  value={logFilters.startDate}
                  onChange={(e) => setLogFilters((p) => ({ ...p, startDate: e.target.value, page: 1 }))}
                  className="bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-700"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Data Final</Label>
                <Input
                  type="date"
                  value={logFilters.endDate}
                  onChange={(e) => setLogFilters((p) => ({ ...p, endDate: e.target.value, page: 1 }))}
                  className="bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-700"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogFilters({ startDate: "", endDate: "", level: "all", route: "", userId: "", page: 1 })}
                  className="w-full cursor-pointer"
                >
                  <RefreshCw size={14} className="mr-1.5" /> Limpar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div className="bg-slate-50 dark:bg-graphite-900 p-4 rounded-2xl border border-slate-100 dark:border-graphite-700 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Total de Erros</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{logsSummary.totalErrors}</p>
                  </div>
                  <AlertOctagon size={22} className="text-rose-500" />
                </div>
                <div className="bg-slate-50 dark:bg-graphite-900 p-4 rounded-2xl border border-slate-100 dark:border-graphite-700 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Avisos</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{logsSummary.totalWarnings}</p>
                  </div>
                  <AlertTriangle size={22} className="text-amber-500" />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-graphite-900 p-4 rounded-2xl border border-slate-100 dark:border-graphite-700 lg:col-span-2">
                <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Erros por Data ({adminTimezone})</h3>
                {logsSummary.errorsByDate?.length > 0 ? (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={logsSummary.errorsByDate}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} tick={{ fontSize: 10, fill: "#64748b" }} />
                        <RechartsTooltip labelFormatter={(d) => formatDate(d)} />
                        <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">Nenhum erro registrado neste filtro.</p>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-graphite-700 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-graphite-900">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Data/Hora</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Nível</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Usuário</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Rota</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLogs ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center">
                        <Loader2 className="animate-spin text-lime-spark mx-auto" size={26} />
                      </td>
                    </tr>
                  ) : systemLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-sm text-slate-500">Nenhum log encontrado.</td>
                    </tr>
                  ) : (
                    systemLogs.map((log) => (
                      <tr key={log.id} className="border-t border-slate-100 dark:border-graphite-700/50 hover:bg-slate-50 dark:hover:bg-graphite-800/50">
                        <AppTooltip content={`Fuso: ${adminTimezone} · UTC: ${log.created_at}`}>
                          <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {formatDateTimeInTimezone(log.created_at, adminTimezone)}
                          </td>
                        </AppTooltip>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${log.level === "error" || log.level === "critical" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" : log.level === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"}`}>
                            {log.level === "error" || log.level === "critical" ? <AlertOctagon size={11} /> : log.level === "warning" ? <AlertTriangle size={11} /> : <Info size={11} />}
                            {log.level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {log.username || (log.user_id ? `ID: ${log.user_id}` : "Sistema")}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500">{log.route || "-"}</td>
                        <AppTooltip content={log.message} className="max-w-md">
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-md truncate">
                            {log.message}
                          </td>
                        </AppTooltip>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              pagination={logsPagination}
              loading={loadingLogs}
              onPageChange={(page) => setLogFilters((p) => ({ ...p, page }))}
            />
          </TabsContent>

          {/* 5. IA & TECO (OBSERVABILIDADE AGREGADA) */}
          <TabsContent value="ia" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-graphite-300">
                Métricas agregadas de uso, latência, cotas gratuitas e feedback do Teco Ajuda — sem acesso a conversas privadas.
              </p>
              <div className="flex items-center gap-1.5">
                {[1, 7, 30].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant={aiDays === d ? "default" : "outline"}
                    onClick={() => setAiDays(d)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    {d === 1 ? "24h" : `${d} dias`}
                  </Button>
                ))}
              </div>
            </div>

            {loadingAi && !aiMetrics ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-lime-spark w-8 h-8" />
              </div>
            ) : aiMetrics ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 p-4 space-y-1">
                    <p className="text-xs text-slate-500 font-semibold">Consultas IA ({aiMetrics.days}d)</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{aiMetrics.summary.totalRequests}</p>
                    <p className="text-[11px] text-slate-500">
                      {aiMetrics.summary.okRequests} OK · {aiMetrics.summary.uniqueUsers} usuários únicos
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 p-4 space-y-1">
                    <p className="text-xs text-slate-500 font-semibold">Latência</p>
                    <p className="text-2xl font-black text-sky-600 dark:text-sky-400">{aiMetrics.summary.avgLatencyMs} ms</p>
                    <p className="text-[11px] text-slate-500">P95: {aiMetrics.summary.p95LatencyMs} ms</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 p-4 space-y-1">
                    <p className="text-xs text-slate-500 font-semibold">Cotas / Falhas</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{aiMetrics.summary.quotaExceededCount}</p>
                    <p className="text-[11px] text-slate-500">
                      Cota excedida · {aiMetrics.summary.failedRequests} indisponibilidades
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 p-4 space-y-1">
                    <p className="text-xs text-slate-500 font-semibold">Política gratuita</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-lime-spark">
                      {aiMetrics.quotaPolicy.baseUserDailyLimit}/dia
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Até +{aiMetrics.quotaPolicy.maxUserBonusDailyRequests} bônus Teco (máx. {aiMetrics.quotaPolicy.maxUserTotalDailyLimit}/dia)
                    </p>
                  </div>
                </div>

                {/* Provedores e Uso por Provedor */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Uso por Provedor ({aiMetrics.days}d)</h3>
                    {aiMetrics.byProvider?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-graphite-700 text-slate-500">
                              <th className="py-2 pr-2">Provedor</th>
                              <th className="py-2 pr-2">OK</th>
                              <th className="py-2 pr-2">Falhas/Cota</th>
                              <th className="py-2 pr-2">Tokens</th>
                              <th className="py-2">Neurons</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-graphite-700">
                            {aiMetrics.byProvider.map((p) => (
                              <tr key={p.provider}>
                                <td className="py-2 pr-2 font-semibold">{p.provider}</td>
                                <td className="py-2 pr-2 text-emerald-600 font-bold">{p.ok_requests}</td>
                                <td className="py-2 pr-2 text-amber-600">{p.failed_requests + p.quota_exceeded_count}</td>
                                <td className="py-2 pr-2">{Number(p.total_tokens || 0).toLocaleString("pt-BR")}</td>
                                <td className="py-2">{Number(p.total_neurons || 0).toLocaleString("pt-BR")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-4">Sem chamadas registradas neste período.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Telemetria Teco Ajuda ({aiMetrics.days}d)</h3>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
                        <ThumbsUp size={13} /> Útil: {aiMetrics.helpTelemetry.helpful}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-graphite-700 px-2.5 py-1 font-semibold">
                        Não útil: {aiMetrics.helpTelemetry.not_helpful}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-700 dark:text-amber-300">
                        <Flag size={13} /> Desatualizada: {aiMetrics.helpTelemetry.outdated}
                      </span>
                    </div>
                    {aiMetrics.helpTelemetry.recentOutdated?.length > 0 ? (
                      <ul className="space-y-1.5 text-xs">
                        {aiMetrics.helpTelemetry.recentOutdated.map((rep) => (
                          <li key={rep.id} className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-1.5">
                            <span className="font-semibold">{rep.topic_id}</span> ({rep.route}) —{" "}
                            <span className="text-slate-600 dark:text-slate-300">{rep.note || "Sem observação"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">Nenhum aviso recente de instrução desatualizada.</p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* 6. SAÚDE DO SISTEMA */}
          <TabsContent value="saude" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-graphite-300">
                Verificação em tempo real de API, banco Neon e configuração de provedores gratuitos (sem exibir segredos).
              </p>
              <Button type="button" variant="outline" size="sm" onClick={fetchHealth} disabled={loadingHealth} className="h-8 cursor-pointer">
                <RefreshCw size={13} className={`mr-1.5 ${loadingHealth ? "animate-spin" : ""}`} /> Reverificar
              </Button>
            </div>

            {loadingHealth && !health ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-lime-spark w-8 h-8" />
              </div>
            ) : health ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold flex items-center gap-2">
                      <Database size={16} className="text-emerald-500" /> {health.database.provider}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 size={12} /> {health.database.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Latência ping: <strong>{health.database.latencyMs} ms</strong> · Migrations aplicadas:{" "}
                    <strong>{health.database.migrationsCount}</strong>
                  </p>
                  {health.database.lastMigrationAt && (
                    <p className="text-[11px] text-slate-500">
                      Última migration: {formatDateTimeInTimezone(health.database.lastMigrationAt, adminTimezone)}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-graphite-700 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold flex items-center gap-2">
                      <HeartPulse size={16} className="text-sky-500" /> API &amp; Provedores Gratuitos
                    </span>
                    <span className="text-xs text-slate-500">Uptime: {health.api.uptimeSeconds}s</span>
                  </div>
                  <div className="space-y-1.5">
                    {(health.aiProviders || []).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium">
                          {p.name} <span className="text-slate-400">({p.model || "—"})</span>
                        </span>
                        <span className={`font-bold ${p.configured ? "text-emerald-600 dark:text-lime-spark" : "text-slate-400"}`}>
                          {p.configured ? "Configurado" : "Não configurado"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmação crítica com senha quando aplicável */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.type === "delete"
            ? "Excluir Usuário"
            : confirmDialog.type === "reset"
              ? "Resetar Senha"
              : confirmDialog.activeStatus
                ? "Desativar Usuário"
                : "Ativar Usuário"
        }
        message={
          confirmDialog.type === "delete"
            ? `Tem certeza que deseja excluir permanentemente ${confirmDialog.username}? Esta ação não pode ser desfeita.`
            : confirmDialog.type === "reset"
              ? `Deseja gerar uma nova senha temporária para ${confirmDialog.username}? Todas as sessões ativas serão revogadas.`
              : `Confirma ${confirmDialog.activeStatus ? "desativar" : "ativar"} a conta de ${confirmDialog.username}?`
        }
        confirmText={
          confirmDialog.type === "delete"
            ? "Excluir"
            : confirmDialog.type === "reset"
              ? "Resetar Senha"
              : confirmDialog.activeStatus
                ? "Desativar"
                : "Ativar"
        }
        cancelText="Cancelar"
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
        variant={confirmDialog.type === "toggle" && !confirmDialog.activeStatus ? "default" : "destructive"}
        askPassword={confirmDialog.requirePassword}
      />

      {/* Modal Editar Usuário */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-600">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-username">Nome de Usuário</Label>
              <Input
                id="edit-username"
                required
                value={editingUser.username}
                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Função</Label>
              <Select
                value={editingUser.role}
                disabled={editingUser.username === currentAdminUsername}
                onValueChange={(v) => setEditingUser({ ...editingUser, role: v })}
              >
                <SelectTrigger className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário Comum</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              {editingUser.username === currentAdminUsername && (
                <p className="text-[11px] text-slate-400">Não é permitido alterar seu próprio papel por aqui.</p>
              )}
            </div>
            {editNeedsAdminPassword && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-adm-pw" className="flex items-center gap-1.5">
                  <KeyRound size={13} /> Sua senha de administrador (obrigatória)
                </Label>
                <Input
                  id="edit-adm-pw"
                  type="password"
                  required
                  value={editingUser.adminPassword}
                  onChange={(e) => setEditingUser({ ...editingUser, adminPassword: e.target.value })}
                  className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
                />
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setEditUserOpen(false)} disabled={editingUserLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editingUserLoading} className="cursor-pointer bg-lime-spark text-graphite-900 hover:bg-lime-spark-hover">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Senha Temporária Gerada */}
      <Dialog open={resetResult.isOpen} onOpenChange={(open) => !open && setResetResult({ isOpen: false, password: "", username: "" })}>
        <DialogContent className="max-w-md bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-600">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Senha Resetada</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A senha temporária de <strong>{resetResult.username}</strong> foi gerada.
            </p>
            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-graphite-900 rounded-lg">
              <code className="flex-1 text-center font-mono text-lg text-slate-800 dark:text-white">{resetResult.password}</code>
              <Button
                size="icon"
                variant="outline"
                className="cursor-pointer dark:bg-graphite-700"
                onClick={() => {
                  navigator.clipboard.writeText(resetResult.password);
                  toast.success("Senha copiada!");
                }}
              >
                <Copy size={16} />
              </Button>
            </div>
            <p className="text-xs text-red-500 text-center">
              Envie ao usuário por canal seguro; ele deverá trocá-la no próximo login.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResult({ isOpen: false, password: "", username: "" })} className="w-full cursor-pointer">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Resumo Administrativo Mínimo (ZERO finanças privadas) */}
      <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-600 text-slate-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Activity className="text-lime-spark" size={18} />
              Resumo Administrativo: {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>

          {loadingSummary ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-lime-spark" size={30} />
            </div>
          ) : userSummary ? (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 dark:border-graphite-700 p-3.5 space-y-1.5">
                <p><strong>ID:</strong> #{userSummary.user.id}</p>
                <p><strong>E-mail:</strong> {userSummary.user.email || "Não informado"}</p>
                <p><strong>Papel / Status:</strong> {userSummary.user.role} · {userSummary.user.is_active ? "Ativo" : "Inativo"}</p>
                <p><strong>Senha local:</strong> {userSummary.user.hasLocalPassword ? "Sim" : "Não (Login social)"}</p>
                <p>
                  <strong>Cadastro:</strong>{" "}
                  {userSummary.user.created_at
                    ? formatDateTimeInTimezone(userSummary.user.created_at, adminTimezone)
                    : "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-graphite-700 p-3.5 space-y-1.5">
                <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Uso operacional (agregado)</p>
                <p><strong>Consultas IA (30d / total):</strong> {userSummary.activity.aiRequests30d} / {userSummary.activity.aiRequestsTotal}</p>
                <p><strong>Tours do Teco concluídos:</strong> {userSummary.activity.completedToursCount}</p>
                <p><strong>Feedbacks enviados:</strong> {userSummary.activity.helpFeedbackCount}</p>
              </div>

              <p className="text-[11px] text-slate-500">
                Por privacidade (LGPD), transações, saldos, patrimônio e conversas individuais não são acessíveis neste painel.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminPanel;
