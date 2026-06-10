import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../App";
import { Eye, EyeOff, LogIn, Loader2, AlertCircle } from "lucide-react";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, API_URL } = useContext(AuthContext);
  const navigate = useNavigate();

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

  const inputClass =
    "w-full p-3.5 border border-slate-200 rounded-xl text-[0.95rem] text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all";
  const labelClass = "block mb-1.5 text-slate-500 font-medium text-[0.85rem]";

  return (
    <div className="w-full max-w-md mx-auto mt-10 sm:mt-20">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            Bem-vindo de volta
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            Acesse sua conta para gerenciar suas finanças
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
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
            className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex justify-center items-center gap-2"
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

        <p className="text-center text-slate-500 text-sm mt-8">
          Ainda não tem uma conta?{" "}
          <Link
            to="/register"
            className="font-semibold text-emerald-500 hover:text-emerald-600 transition-colors"
          >
            Registre-se
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
