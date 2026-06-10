import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../App";
import {
  Eye,
  EyeOff,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { API_URL } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Erro ao registrar.");

      setMessage("Conta criada com sucesso! Redirecionando...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.message || "Falha no registro. Tente novamente.");
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
          <h2 className="text-2xl font-bold text-slate-800">Crie sua conta</h2>
          <p className="text-slate-500 text-sm mt-2">
            Comece a gerenciar suas finanças hoje mesmo
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {message && (
          <div className="flex items-center gap-3 bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 border border-emerald-100">
            <CheckCircle2 size={20} className="shrink-0" />
            <p className="text-sm font-medium">{message}</p>
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
              placeholder="Escolha um nome de usuário"
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
                placeholder="Crie uma senha forte"
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
            className="w-full mt-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex justify-center items-center gap-2"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <UserPlus size={20} /> Registrar
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-8">
          Já tem uma conta?{" "}
          <Link
            to="/login"
            className="font-semibold text-emerald-500 hover:text-emerald-600 transition-colors"
          >
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
