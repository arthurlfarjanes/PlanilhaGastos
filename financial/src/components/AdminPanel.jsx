import React, { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../App";
import toast from "react-hot-toast";
import { ShieldAlert, Users, Activity, FileText, Search, UserPlus, Power, Trash2, Mail, Lock, Shield, CheckCircle2, ChevronRight, Filter, Download, ArrowUpRight, ArrowDownRight, LayoutDashboard, SearchX, Copy, Loader2, UserX, RefreshCw, TrendingUp, Edit2, Terminal, AlertTriangle, AlertOctagon, Info, BarChart2 } from "lucide-react";
import ConfirmDialog from "./ui/ConfirmDialog";
import FiltroTransacoes from "./FiltroTransacoes";
import ListaTransacoes from "./ListaTransacoes";

// Shadcn Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Recharts
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316'];

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Logs state
  const [systemLogs, setSystemLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilters, setLogFilters] = useState({ startDate: "", endDate: "", userId: "" });

  // Modals state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userReport, setUserReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: "", userId: null, username: "", activeStatus: null, requirePassword: false });
  const [resetResult, setResetResult] = useState({ isOpen: false, password: "", username: "" });

  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState({ id: null, username: "", email: "", role: "user" });
  const [editingUserLoading, setEditingUserLoading] = useState(false);

  // New user form state
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "user" });
  const [creatingUser, setCreatingUser] = useState(false);

  // Filters for Report
  const [filtros, setFiltros] = useState({
    descricao: "",
    tipo: "",
    categoriaId: "",
    dataInicio: "",
    dataFim: "",
  });

  const { API_URL, token } = useContext(AuthContext);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao buscar usuários");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, [token]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (logFilters.startDate) params.append("startDate", logFilters.startDate);
      if (logFilters.endDate) params.append("endDate", logFilters.endDate);
      if (logFilters.userId && logFilters.userId !== "all") params.append("userId", logFilters.userId);

      const response = await fetch(`${API_URL}/admin/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao buscar logs");
      const data = await response.json();
      setSystemLogs(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (token) fetchLogs();
  }, [logFilters.startDate, logFilters.endDate, logFilters.userId]);

  const handleToggleStatus = async (password = null) => {
    const { userId, activeStatus, requirePassword } = confirmDialog;

    if (requirePassword && !password) return;

    setConfirmDialog({ isOpen: false });

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !activeStatus, adminPassword: password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao atualizar status");

      toast.success(data.message);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleResetPassword = async () => {
    const { userId } = confirmDialog;
    setConfirmDialog({ isOpen: false });

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao resetar senha");

      setResetResult({ isOpen: true, password: data.tempPassword, username: confirmDialog.username });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao criar usuário");

      toast.success("Usuário criado com sucesso!");
      setCreateUserOpen(false);
      setNewUser({ username: "", email: "", password: "", role: "user" });
      fetchUsers();
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
      const response = await fetch(`${API_URL}/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editingUser.username,
          email: editingUser.email,
          role: editingUser.role
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao editar usuário");

      toast.success(data.message);
      setEditUserOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditingUserLoading(false);
    }
  };

  const handleDeleteUser = async (password = null) => {
    const { userId, requirePassword } = confirmDialog;

    if (requirePassword && !password) return;

    setConfirmDialog({ isOpen: false });

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adminPassword: password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao deletar usuário");

      toast.success(data.message);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenReport = async (user) => {
    setSelectedUser(user);
    setReportModalOpen(true);
    setLoadingReport(true);
    // Reset filters
    setFiltros({ descricao: "", tipo: "", categoriaId: "", dataInicio: "", dataFim: "" });

    try {
      const response = await fetch(`${API_URL}/admin/users/${user.id}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Erro ao carregar relatório");
      const data = await response.json();
      setUserReport(data);
    } catch (err) {
      toast.error(err.message);
      setReportModalOpen(false);
    } finally {
      setLoadingReport(false);
    }
  };

  const openConfirm = (type, user) => {
    setConfirmDialog({
      isOpen: true,
      type,
      userId: user.id,
      username: user.username,
      activeStatus: user.is_active,
      requirePassword: user.role === 'admin'
    });
  };

  const openEdit = (user) => {
    setEditingUser({ id: user.id, username: user.username, email: user.email, role: user.role });
    setEditUserOpen(true);
  };

  // Processed Data for Report
  const categoriasFilter = useMemo(() => {
    if (!userReport?.transacoes) return [];
    const cats = new Map();
    userReport.transacoes.forEach(t => {
      if (t.categoria_nome) {
        cats.set(t.categoria_nome, { id: t.categoria_nome, nome: t.categoria_nome });
      }
    });
    return Array.from(cats.values());
  }, [userReport]);

  const transacoesFiltradas = useMemo(() => {
    if (!userReport?.transacoes) return [];
    return userReport.transacoes.filter(t => {
      if (filtros.descricao && !t.descricao.toLowerCase().includes(filtros.descricao.toLowerCase())) return false;
      if (filtros.tipo && t.tipo !== filtros.tipo) return false;
      if (filtros.categoriaId && t.categoria_nome !== filtros.categoriaId) return false;
      if (filtros.dataInicio && new Date(t.data) < new Date(filtros.dataInicio)) return false;
      if (filtros.dataFim && new Date(t.data) > new Date(filtros.dataFim)) return false;
      return true;
    });
  }, [userReport, filtros]);

  // Dashboard Data Generation based on filtered transactions
  const dashboardData = useMemo(() => {
    if (!transacoesFiltradas.length) return null;

    let totalReceitas = 0;
    let totalDespesas = 0;
    const despesasPorCategoria = {};
    const gastosPorDia = {};

    transacoesFiltradas.forEach(t => {
      const valor = parseFloat(t.valor);
      if (t.tipo === "receita") {
        totalReceitas += valor;
      } else {
        totalDespesas += valor;
        // Category Pie
        const catName = t.categoria_nome || "Outros";
        despesasPorCategoria[catName] = (despesasPorCategoria[catName] || 0) + valor;

        // Line chart by date
        const date = t.data.split('T')[0]; // simple format
        gastosPorDia[date] = (gastosPorDia[date] || 0) + valor;
      }
    });

    const pieData = Object.entries(despesasPorCategoria)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const lineData = Object.entries(gastosPorDia)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const maiorGasto = [...transacoesFiltradas].filter(t => t.tipo === "despesa").sort((a, b) => parseFloat(b.valor) - parseFloat(a.valor))[0];

    return { totalReceitas, totalDespesas, pieData, lineData, maiorGasto };
  }, [transacoesFiltradas]);

  // Processed Data for Logs Charts
  const logsDashboardData = useMemo(() => {
    if (!systemLogs.length) return null;

    const errorsByDate = {};
    const errorsByUser = {};
    let totalErrors = 0;
    let totalInfos = 0;

    systemLogs.forEach(log => {
      if (log.level === 'error' || log.level === 'critical') {
        totalErrors++;
        const date = log.created_at.split('T')[0];
        errorsByDate[date] = (errorsByDate[date] || 0) + 1;

        const userName = log.username || (log.user_id ? `ID: ${log.user_id}` : 'Sistema');
        errorsByUser[userName] = (errorsByUser[userName] || 0) + 1;
      } else {
        totalInfos++;
      }
    });

    const dateData = Object.entries(errorsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const userData = Object.entries(errorsByUser)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { dateData, userData, totalErrors, totalInfos };
  }, [systemLogs]);

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-lime-spark w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white dark:bg-graphite-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-graphite-600">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                Painel do Administrador
              </h1>
              <p className="text-slate-500 dark:text-graphite-300 text-sm mt-1">
                Gerencie usuários e acesso ao sistema.
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-6 bg-slate-100 dark:bg-graphite-900 rounded-xl p-1">
            <TabsTrigger value="usuarios" className="cursor-pointer rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-graphite-800 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400">
              <Users size={16} className="mr-2" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="cursor-pointer rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-graphite-800 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400">
              <Terminal size={16} className="mr-2" /> Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-4">
            <div className="flex items-center justify-end gap-3 mb-4">
              <div className="bg-slate-100 dark:bg-graphite-900 px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-graphite-700">
                <Users size={18} className="text-slate-500 dark:text-graphite-400" />
                <span className="font-bold text-slate-700 dark:text-slate-200">{users.length} usuários</span>
              </div>

              <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                <DialogTrigger render={<Button className="cursor-pointer rounded-xl font-bold bg-lime-spark text-graphite-900 hover:bg-lime-spark-hover" />}>
                  <UserPlus size={18} className="mr-2" /> Novo Usuário
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-600 text-slate-900 dark:text-slate-100">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Criar Novo Usuário</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Nome de Usuário</Label>
                      <Input
                        id="username"
                        required
                        value={newUser.username}
                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                        className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                        className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha Temporária</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={newUser.password}
                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                        className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
                      />
                    </div>
                    <div className="space-y-2">
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
                    <Button type="submit" className="w-full font-bold mt-2 cursor-pointer bg-lime-spark text-graphite-900 hover:bg-lime-spark-hover" disabled={creatingUser}>
                      {creatingUser ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                      Criar Usuário
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-graphite-700">
                    <th className="pb-3 text-sm font-semibold text-slate-500 dark:text-graphite-400 px-4">ID</th>
                    <th className="pb-3 text-sm font-semibold text-slate-500 dark:text-graphite-400 px-4">Usuário</th>
                    <th className="pb-3 text-sm font-semibold text-slate-500 dark:text-graphite-400 px-4">Role</th>
                    <th className="pb-3 text-sm font-semibold text-slate-500 dark:text-graphite-400 px-4">Status</th>
                    <th className="pb-3 text-sm font-semibold text-slate-500 dark:text-graphite-400 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 dark:border-graphite-700/50 hover:bg-slate-50 dark:hover:bg-graphite-700/30 transition-colors group">
                      <td className="py-4 px-4 text-sm font-medium text-slate-500 dark:text-graphite-400">#{user.id}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{user.username}</span>
                          <span className="text-xs text-slate-500 dark:text-graphite-400">{user.email || "Sem e-mail"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${user.role === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-graphite-700 dark:text-graphite-300'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${user.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                          {user.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => handleOpenReport(user)} className="cursor-pointer text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg" />}>
                              <Activity size={18} />
                            </TooltipTrigger>
                            <TooltipContent>Ver Relatório</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => openEdit(user)} className="cursor-pointer text-slate-400 hover:text-lime-600 hover:bg-lime-50 dark:hover:bg-lime-500/20 rounded-lg" />}>
                              <Edit2 size={18} />
                            </TooltipTrigger>
                            <TooltipContent>Editar Usuário</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => openConfirm("reset", user)} className="cursor-pointer text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/20 rounded-lg" />}>
                              <RefreshCw size={18} />
                            </TooltipTrigger>
                            <TooltipContent>Resetar Senha</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => openConfirm("toggle", user)} className="cursor-pointer text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/20 rounded-lg" />}>
                              <UserX size={18} />
                            </TooltipTrigger>
                            <TooltipContent>{user.is_active ? "Desativar" : "Ativar"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => openConfirm("delete", user)} className="cursor-pointer text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg" />}>
                              <Trash2 size={18} />
                            </TooltipTrigger>
                            <TooltipContent>Excluir Usuário</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="auditoria" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-graphite-900 p-4 rounded-2xl border border-slate-100 dark:border-graphite-700">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Usuário</Label>
                <Select value={logFilters.userId} onValueChange={(v) => setLogFilters({ ...logFilters, userId: v })}>
                  <SelectTrigger className="bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-700">
                    <SelectValue placeholder="Todos os Usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Usuários</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Data Inicial</Label>
                <Input
                  type="date"
                  value={logFilters.startDate}
                  onChange={e => setLogFilters({ ...logFilters, startDate: e.target.value })}
                  className="bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-700"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Data Final</Label>
                <Input
                  type="date"
                  value={logFilters.endDate}
                  onChange={e => setLogFilters({ ...logFilters, endDate: e.target.value })}
                  className="bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-700"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setLogFilters({ startDate: "", endDate: "", userId: "" })}
                  className="w-full cursor-pointer hover:bg-slate-100 dark:hover:bg-graphite-800 border-slate-200 dark:border-graphite-700"
                >
                  <RefreshCw size={16} className="mr-2" /> Limpar Filtros
                </Button>
              </div>
            </div>

            {logsDashboardData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-50 dark:bg-graphite-900 p-5 rounded-2xl border border-slate-100 dark:border-graphite-700 flex flex-col justify-center items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 flex items-center justify-center mb-3">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-500 mb-1">Total de Erros</h3>
                  <p className="text-4xl font-black text-slate-800 dark:text-slate-100">{logsDashboardData.totalErrors}</p>
                </div>

                <div className="bg-slate-50 dark:bg-graphite-900 p-5 rounded-2xl border border-slate-100 dark:border-graphite-700 col-span-2">
                  <h3 className="text-sm font-bold text-slate-500 mb-4">Erros por Data</h3>
                  {logsDashboardData.dateData.length > 0 ? (
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={logsDashboardData.dateData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                          <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <p className="text-sm text-slate-400 py-10 text-center">Nenhum erro no período</p>}
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 dark:border-graphite-700 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-graphite-900">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Data/Hora</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Nível</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Usuário</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Rota / Ação</th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLogs ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center">
                        <Loader2 className="animate-spin text-lime-spark mx-auto" size={30} />
                      </td>
                    </tr>
                  ) : systemLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-slate-500">Nenhum log encontrado.</td>
                    </tr>
                  ) : (
                    systemLogs.map(log => (
                      <tr key={log.id} className="border-t border-slate-100 dark:border-graphite-700/50 hover:bg-slate-50 dark:hover:bg-graphite-800/50">
                        <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase ${log.level === 'error' || log.level === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                            log.level === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                            }`}>
                            {log.level === 'error' ? <AlertOctagon size={12} /> : log.level === 'warning' ? <AlertTriangle size={12} /> : <Info size={12} />}
                            {log.level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {log.username ? log.username : log.user_id ? `ID: ${log.user_id}` : 'Sistema'}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                          {log.route || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 max-w-md truncate" title={log.message}>
                          {log.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === "toggle"}
        title={confirmDialog.activeStatus ? "Desativar Usuário" : "Ativar Usuário"}
        message={`Tem certeza que deseja ${confirmDialog.activeStatus ? "desativar" : "ativar"} o usuário ${confirmDialog.username}?`}
        confirmText={confirmDialog.activeStatus ? "Desativar" : "Ativar"}
        cancelText="Cancelar"
        onConfirm={handleToggleStatus}
        onClose={() => setConfirmDialog({ isOpen: false })}
        variant={confirmDialog.activeStatus ? "destructive" : "default"}
        askPassword={confirmDialog.requirePassword}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === "delete"}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir permanentemente o usuário ${confirmDialog.username}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDeleteUser}
        onClose={() => setConfirmDialog({ isOpen: false })}
        variant="destructive"
        askPassword={confirmDialog.requirePassword}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.type === "reset"}
        title="Resetar Senha"
        message={`Deseja gerar uma nova senha temporária para o usuário ${confirmDialog.username}? A senha atual dele será sobrescrita.`}
        confirmText="Resetar Senha"
        cancelText="Cancelar"
        onConfirm={handleResetPassword}
        onClose={() => setConfirmDialog({ isOpen: false })}
        variant="destructive"
      />

      {/* Modal de Editar Usuário */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-600">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Nome de Usuário</Label>
              <Input
                id="edit-username"
                required
                value={editingUser.username}
                onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editingUser.email}
                onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Função</Label>
              <Select value={editingUser.role} onValueChange={(v) => setEditingUser({ ...editingUser, role: v })}>
                <SelectTrigger className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário Comum</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setEditUserOpen(false)} disabled={editingUserLoading} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-graphite-700">Cancelar</Button>
              <Button type="submit" variant="default" disabled={editingUserLoading} className="cursor-pointer bg-lime-spark text-graphite-900 hover:bg-lime-spark-hover">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <Button size="icon" variant="outline" className="cursor-pointer dark:bg-graphite-700" onClick={() => {
                navigator.clipboard.writeText(resetResult.password);
                toast.success("Senha copiada para a área de transferência!");
              }}>
                <Copy size={16} />
              </Button>
            </div>
            <p className="text-xs text-red-500 text-center">
              Guarde esta senha e envie para o usuário. Ele deverá trocá-la no próximo acesso.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResult({ isOpen: false, password: "", username: "" })} className="w-full cursor-pointer bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-graphite-700 dark:text-white dark:hover:bg-graphite-600">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="w-[95vw] max-w-5xl lg:max-w-7xl bg-white dark:bg-graphite-800 border-slate-200 dark:border-graphite-600 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Activity className="text-lime-spark" /> Relatório de Usuário: {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>

          {loadingReport ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-lime-spark" size={40} />
            </div>
          ) : userReport ? (
            <div className="mt-4">
              <Tabs defaultValue="movimentacoes" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-graphite-900">
                  <TabsTrigger className="cursor-pointer" value="movimentacoes">Últimas Movimentações</TabsTrigger>
                  <TabsTrigger className="cursor-pointer" value="perfil">Perfil de Gastos</TabsTrigger>
                </TabsList>

                <TabsContent value="movimentacoes" className="space-y-4">
                  <FiltroTransacoes filtros={filtros} setFiltros={setFiltros} categorias={categoriasFilter} />

                  <div className="bg-slate-50 dark:bg-graphite-900 p-4 rounded-xl border border-slate-100 dark:border-graphite-700">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-2">Resumo Filtrado</p>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs text-slate-500">Receitas</p>
                        <p className="text-emerald-500 font-extrabold">R$ {dashboardData?.totalReceitas.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Despesas</p>
                        <p className="text-red-500 font-extrabold">R$ {dashboardData?.totalDespesas.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  </div>

                  <ListaTransacoes
                    transacoes={transacoesFiltradas}
                    onEdit={() => toast.error("Ação não permitida neste painel.")}
                    onDelete={() => toast.error("Ação não permitida neste painel.")}
                  />
                </TabsContent>

                <TabsContent value="perfil">
                  {dashboardData && transacoesFiltradas.length > 0 ? (
                    <div className="space-y-6 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 dark:bg-graphite-900 p-5 rounded-2xl border border-slate-100 dark:border-graphite-700">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><TrendingUp size={14} /> Maior Gasto</p>
                          {dashboardData.maiorGasto ? (
                            <>
                              <p className="text-red-500 font-black text-xl">R$ {parseFloat(dashboardData.maiorGasto.valor).toFixed(2)}</p>
                              <p className="text-xs text-slate-400 mt-1 truncate">{dashboardData.maiorGasto.descricao}</p>
                            </>
                          ) : <p className="text-slate-400 text-sm">Nenhum gasto</p>}
                        </div>
                        <div className="bg-slate-50 dark:bg-graphite-900 p-5 rounded-2xl border border-slate-100 dark:border-graphite-700">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Ticket Médio (Despesas)</p>
                          <p className="text-slate-800 dark:text-slate-100 font-black text-xl">
                            R$ {dashboardData.totalDespesas > 0 ? (dashboardData.totalDespesas / transacoesFiltradas.filter(t => t.tipo === 'despesa').length).toFixed(2) : '0.00'}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-graphite-900 p-5 rounded-2xl border border-slate-100 dark:border-graphite-700">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Movimentado</p>
                          <p className="text-slate-800 dark:text-slate-100 font-black text-xl">
                            R$ {(dashboardData.totalReceitas + dashboardData.totalDespesas).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gráfico de Pizza (Categorias) */}
                        <div className="bg-white dark:bg-graphite-900 p-5 rounded-2xl border border-slate-100 dark:border-graphite-700 shadow-sm">
                          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4">Despesas por Categoria</h3>
                          {dashboardData.pieData.length > 0 ? (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <PieChart>
                                  <Pie
                                    data={dashboardData.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {dashboardData.pieData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip
                                    formatter={(value) => `R$ ${value.toFixed(2)}`}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">Nenhum dado de despesa no período.</p>
                          )}
                        </div>

                        {/* Gráfico de Linha (Evolução) */}
                        <div className="bg-white dark:bg-graphite-900 p-5 rounded-2xl border border-slate-100 dark:border-graphite-700 shadow-sm">
                          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4">Evolução de Gastos Diários</h3>
                          {dashboardData.lineData.length > 0 ? (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <LineChart data={dashboardData.lineData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickMargin={10} />
                                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `R$${v}`} width={60} />
                                  <RechartsTooltip
                                    formatter={(value) => `R$ ${value.toFixed(2)}`}
                                    labelStyle={{ color: '#0f172a' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                  />
                                  <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">Nenhum dado de evolução no período.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-slate-500">Ajuste os filtros para visualizar o perfil de gastos.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminPanel;
