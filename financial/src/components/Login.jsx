import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext, ThemeContext } from "../App";
import { Eye, EyeOff, LogIn, Loader2, AlertCircle, Wallet } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, API_URL } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  // Login Convencional
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao fazer login.");

      login(data.token, username, null, data.role);
      navigate("/");
    } catch (err) {
      setError(err.message || "Falha no login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  // Função para lidar com o sucesso do Google Login
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Erro no login com Google.");

      login(data.token, data.username, data.picture, data.role);
      navigate("/");
    } catch (err) {
      setError(err.message || "Falha ao autenticar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Removidas as classes utilitárias hardcoded para label e input, usaremos os componentes do Shadcn.
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-graphite-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-graphite-600">
        <div className="text-center mb-8">
          {/* Logo do app */}
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <div className="w-11 h-11 rounded-xl border border-slate-200 dark:border-graphite-600 flex items-center justify-center shadow-xs overflow-hidden">
              <img src="/logo.png" alt="MeFinance Logo" className="w-10 h-10 object-scale-down" />
            </div>
            <span className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">
              Me
              <span className="text-[#059669] dark:text-lime-spark">
                Finance
              </span>
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            Bem-vindo de volta
          </h2>
          <p className="text-slate-500 dark:text-graphite-300 text-sm mt-1.5">
            Acesse sua conta para gerenciar suas finanças
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 border border-red-100 dark:border-red-500/20">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Seu nome de usuário"
              className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700 h-12"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative flex items-center">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                className="bg-slate-50 dark:bg-graphite-900 border-slate-200 dark:border-graphite-700 h-12 pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3 text-slate-400 hover:text-emerald-500 transition-colors p-1"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button
            disabled={loading}
            type="submit"
            className="cursor-pointer w-full mt-2 h-12 bg-lime-spark hover:bg-lime-spark-hover text-graphite-900 font-bold rounded-xl shadow-[0_4px_14px_rgba(182,255,226,0.3)] hover:shadow-[0_6px_20px_rgba(182,255,226,0.4)]"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin mr-2" />
            ) : (
              <LogIn size={20} className="mr-2" />
            )}
            Entrar
          </Button>
        </form>

        {/* NOVO: Divisor visual */}
        <div className="flex items-center my-6">
          <div className="grow border-t border-slate-200 dark:border-graphite-600"></div>
          <span className="px-4 text-sm text-slate-400 dark:text-graphite-400 font-medium">
            Ou continue com
          </span>
          <div className="grow border-t border-slate-200 dark:border-graphite-600"></div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("O login com o Google falhou.")}
            theme={theme === "dark" ? "filled_black" : "outline"}
            size="large"
            shape="rectangular"
            text="continue_with"
          />
        </div>

        <p className="text-center text-slate-500 dark:text-graphite-300 text-sm mt-8">
          Ainda não tem uma conta?{" "}
          <Link
            to="/register"
            className="font-semibold text-[#059669] dark:text-lime-spark hover:opacity-80 transition-opacity"
          >
            Registre-se
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
