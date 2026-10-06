import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { AuthContext } from "../../App";
import { Magnetic } from "./primitives";

const LINKS = [
  { id: "funciona", label: "Como funciona" },
  { id: "recursos", label: "Recursos" },
  { id: "produto", label: "Produto" },
  { id: "faq", label: "FAQ" },
];

/** Barra de progresso de leitura no topo da página. */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-0.5 z-[60] origin-left bg-emerald-600 dark:bg-lime-spark"
      style={{ scaleX }}
    />
  );
}

export function Navbar() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Seção ativa conforme o scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex flex-col items-center px-4 pt-4 pointer-events-none">
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1, maxWidth: scrolled ? 880 : 1120 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="lp-glass-strong pointer-events-auto w-full rounded-full pl-3 pr-2 py-2 flex items-center justify-between"
      >
        <Link to="/" className="flex items-center gap-2.5 pl-1" aria-label="MeFinance">
          <span className="w-9 h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-graphite-800 flex items-center justify-center">
            <img src="/logo.png" alt="" className="w-5 h-5 object-scale-down" />
          </span>
          <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
            Me<span className="text-emerald-600 dark:text-lime-spark">Finance</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={`relative px-4 py-2 rounded-full transition-colors ${
                active === l.id
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-graphite-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {active === l.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-slate-900/5 dark:bg-white/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{l.label}</span>
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-1">
          {token ? (
            <Magnetic strength={0.2}>
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-full bg-emerald-600 dark:bg-lime-spark text-white dark:text-graphite-900 text-sm cursor-pointer hover:brightness-105 transition"
              >
                Ir para o App <ArrowRight size={15} />
              </button>
            </Magnetic>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-full text-sm font-semibold text-slate-600 dark:text-graphite-200 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Magnetic strength={0.2}>
                <Link
                  to="/register"
                  className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-full bg-slate-900 dark:bg-lime-spark text-white dark:text-graphite-900 text-sm hover:brightness-110 transition"
                >
                  Criar conta
                </Link>
              </Magnetic>
            </>
          )}
        </div>

        <button
          className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="lp-glass-strong pointer-events-auto md:hidden w-full max-w-[1120px] mt-2 rounded-3xl p-4 flex flex-col gap-1 origin-top"
          >
            {LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-2xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
            <div className="h-px bg-slate-200 dark:bg-white/10 my-2" />
            {token ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full font-bold px-6 py-3 rounded-full bg-emerald-600 dark:bg-lime-spark text-white dark:text-graphite-900"
              >
                Ir para o App
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  className="w-full text-center font-semibold py-3 rounded-full border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
                >
                  Entrar
                </Link>
                <Link
                  to="/register"
                  className="w-full text-center font-bold py-3 rounded-full bg-slate-900 dark:bg-lime-spark text-white dark:text-graphite-900"
                >
                  Criar conta
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
