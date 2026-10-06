import { useContext } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, CheckCircle2, ChevronDown, TrendingUp } from "lucide-react";
import { AuthContext } from "../../App";
import { CountUp, EASE_OUT, Magnetic, SplitHeading } from "./primitives";

const TRUST = ["100% gratuito", "Sem cartão de crédito", "Entre com Google"];

function SaldoChip() {
  return (
    <div className="lp-glass-strong rounded-2xl p-4 w-[210px] sm:w-[232px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-graphite-300">
          Saldo do mês
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-lime-spark bg-emerald-600/10 dark:bg-lime-spark/10 rounded-full px-2 py-0.5">
          <TrendingUp size={11} /> +12%
        </span>
      </div>
      <p className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
        <CountUp to={4280} decimals={2} prefix="R$ " duration={2.2} />
      </p>
      <svg viewBox="0 0 200 48" className="w-full h-10 mt-2 overflow-visible" fill="none">
        <motion.path
          d="M0 38 C 20 34, 28 18, 48 22 S 80 40, 100 28 S 140 6, 160 14 S 190 10, 200 4"
          className="stroke-emerald-600 dark:stroke-lime-spark"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, delay: 1.1, ease: EASE_OUT }}
        />
      </svg>
    </div>
  );
}

function EconomiaChip() {
  return (
    <div className="lp-glass-strong rounded-2xl p-3.5 pr-5 flex items-center gap-3">
      <span className="w-10 h-10 rounded-full bg-emerald-600/10 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark flex items-center justify-center">
        <CheckCircle2 size={20} />
      </span>
      <div className="text-left">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-graphite-300">
          Economia
        </p>
        <p className="text-base font-black text-slate-900 dark:text-white">
          + <CountUp to={1250} decimals={2} prefix="R$ " duration={2.2} />
        </p>
      </div>
    </div>
  );
}

function CategoriaChip() {
  return (
    <div className="lp-glass-strong rounded-2xl p-4 w-[190px]">
      <div className="flex items-center justify-between text-xs font-semibold mb-2.5">
        <span className="text-slate-700 dark:text-slate-200">Alimentação</span>
        <span className="text-slate-500 dark:text-graphite-300">32%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-emerald-600 dark:bg-lime-spark origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0.32 }}
          transition={{ duration: 1.4, delay: 1.3, ease: EASE_OUT }}
          style={{ width: "100%" }}
        />
      </div>
      <div className="flex gap-1.5 mt-3">
        {["bg-emerald-600 dark:bg-lime-spark", "bg-emerald-400", "bg-slate-400", "bg-slate-300 dark:bg-graphite-500"].map(
          (c, i) => (
            <motion.span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${c}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 + i * 0.1 }}
            />
          ),
        )}
      </div>
    </div>
  );
}

export function Hero() {
  const { token } = useContext(AuthContext);
  const { scrollY } = useScroll();

  // Camadas com velocidades distintas → profundidade
  const textY = useTransform(scrollY, [0, 600], [0, -70]);
  const textOpacity = useTransform(scrollY, [0, 420], [1, 0]);
  const yA = useTransform(scrollY, [0, 800], [0, -150]);
  const yB = useTransform(scrollY, [0, 800], [0, -260]);
  const yC = useTransform(scrollY, [0, 800], [0, -70]);
  const cueOpacity = useTransform(scrollY, [0, 160], [1, 0]);

  return (
    <section id="inicio" className="relative min-h-[100svh] flex items-center pt-28 pb-20 lg:pt-32">
      <div className="max-w-7xl mx-auto w-full px-6 grid lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Texto */}
        <motion.div
          style={{ y: textY, opacity: textOpacity }}
          className="lg:col-span-7 text-center lg:text-left"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            className="lp-glass inline-flex items-center gap-2.5 rounded-full pl-3 pr-4 py-1.5 mb-7 text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-200"
          >
            <span className="relative flex h-2 w-2">
              <span className="lp-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-500 dark:bg-lime-spark" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-lime-spark" />
            </span>
            Nova versão 2.0 · controle financeiro sem complicação
          </motion.div>

          <SplitHeading
            as="h1"
            delay={0.15}
            className="text-5xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.05] text-slate-900 dark:text-white"
            words={[
              { t: "Saiba" },
              { t: "para" },
              { t: "onde" },
              { br: true },
              { t: "vai" },
              { t: "cada" },
              { t: "real.", accent: true },
            ]}
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: EASE_OUT }}
            className="mt-6 text-lg md:text-xl text-slate-600 dark:text-graphite-300 max-w-xl mx-auto lg:mx-0 leading-relaxed"
          >
            Registre receitas e despesas, preveja gastos fixos e acompanhe tudo em gráficos que se
            atualizam sozinhos. Sem conectar seu banco.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.85, ease: EASE_OUT }}
            className="mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
          >
            <Magnetic>
              <Link
                to={token ? "/dashboard" : "/register"}
                className="group flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-full bg-emerald-600 dark:bg-lime-spark text-white dark:text-graphite-900 text-base shadow-lg shadow-emerald-900/10 hover:brightness-105 transition"
              >
                {token ? "Ir para o painel" : "Começar gratuitamente"}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.2}>
              <a
                href="#funciona"
                className="lp-glass flex items-center justify-center gap-2 font-semibold px-7 py-4 rounded-full text-base text-slate-800 dark:text-slate-100 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
              >
                Ver como funciona
              </a>
            </Magnetic>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-graphite-300"
          >
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-lime-spark" />
                {t}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Palco 3D (âncora da cena) + chips de vidro */}
        <div className="lg:col-span-5 relative">
          <div data-scene-anchor="hero" className="relative h-[380px] sm:h-[480px] lg:h-[600px]">
            <motion.div
              style={{ y: yA }}
              className="absolute left-0 sm:-left-2 lg:-left-10 top-[4%]"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.9, ease: EASE_OUT }}
            >
              <div className="lp-float">
                <SaldoChip />
              </div>
            </motion.div>

            <motion.div
              style={{ y: yB }}
              className="absolute right-0 lg:-right-4 top-[46%]"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 1.05, ease: EASE_OUT }}
            >
              <div className="lp-float-slow">
                <EconomiaChip />
              </div>
            </motion.div>

            <motion.div
              style={{ y: yC }}
              className="absolute left-[6%] bottom-[2%] hidden sm:block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.2, ease: EASE_OUT }}
            >
              <div className="lp-float-fast">
                <CategoriaChip />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <motion.a
        href="#funciona"
        style={{ opacity: cueOpacity }}
        aria-label="Rolar para a próxima seção"
        className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-graphite-400"
      >
        Role para explorar
        <ChevronDown size={16} className="lp-scroll-cue" />
      </motion.a>
    </section>
  );
}
