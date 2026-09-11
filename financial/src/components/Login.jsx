import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../App";
import { Eye, EyeOff, LogIn, Loader2, AlertCircle, Wallet } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, API_URL } = useContext(AuthContext);
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

      login(data.token, username);
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

      login(data.token, data.username, data.picture);
      navigate("/");
    } catch (err) {
      setError(err.message || "Falha ao autenticar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full p-3.5 border border-slate-200 dark:border-[#2E3342] rounded-xl text-[0.95rem] text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-[#14171F] focus:bg-white dark:focus:bg-[#14171F] focus:outline-none focus:border-[#B6FFE2] focus:ring-4 focus:ring-[#B6FFE2]/15 transition-all placeholder-slate-400 dark:placeholder-[#687082]";
  const labelClass = "block mb-1.5 text-slate-500 dark:text-[#8E9AA8] font-medium text-[0.85rem]";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-[#1E222B] p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-[#2E3342]">
        <div className="text-center mb-8">
          {/* Logo do app */}
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <div className="w-11 h-11 rounded-xl bg-[#23262F] dark:bg-[#14171F] border border-slate-200 dark:border-[#2E3342] flex items-center justify-center text-[#B6FFE2] shadow-sm">
              <Wallet size={22} className="drop-shadow-[0_0_8px_rgba(182,255,226,0.5)]" />
            </div>
            <span className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">
              Me<span className="text-[#059669] dark:text-[#B6FFE2]">Finance</span>
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            Bem-vindo de volta
          </h2>
          <p className="text-slate-500 dark:text-[#8E9AA8] text-sm mt-1.5">
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
          <div>
            <label className={labelClass}>Usuário</label>
            <input
              type="text"
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Seu nome de usuário"
            />
          </div>

          <div>
            <label className={labelClass}>Senha</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                className={`${inputClass} pr-12`}
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

          <button
            disabled={loading}
            type="submit"
            className="w-full mt-2 bg-[#B6FFE2] hover:bg-[#8DF3CA] text-[#14171F] font-bold py-3.5 px-6 rounded-xl transition-all shadow-[0_4px_14px_rgba(182,255,226,0.3)] hover:shadow-[0_6px_20px_rgba(182,255,226,0.4)] hover:-translate-y-0.5 flex justify-center items-center gap-2"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <LogIn size={20} /> Entrar
              </>
            )}
          </button>
        </form>

        {/* NOVO: Divisor visual */}
        <div className="flex items-center my-6">
          <div className="grow border-t border-slate-200 dark:border-[#2E3342]"></div>
          <span className="px-4 text-sm text-slate-400 dark:text-[#687082] font-medium">
            Ou continue com
          </span>
          <div className="grow border-t border-slate-200 dark:border-[#2E3342]"></div>
        </div>

        {/* NOVO: Botão do Google */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("O login com o Google falhou.")}
            theme="outline"
            size="large"
            shape="rectangular"
            // width="100%"
            text="continue_with"
          />
        </div>

        <p className="text-center text-slate-500 dark:text-[#8E9AA8] text-sm mt-8">
          Ainda não tem uma conta?{" "}
          <Link
            to="/register"
            className="font-semibold text-[#059669] dark:text-[#B6FFE2] hover:opacity-80 transition-opacity"
          >
            Registre-se
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
