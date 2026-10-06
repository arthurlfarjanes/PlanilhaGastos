import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarClock, LayoutDashboard, ListOrdered, Target } from "lucide-react";
import { CountUp, ScrubIn, SplitHeading } from "./primitives";

const NAV = [
  { Icon: LayoutDashboard, label: "Dashboard", active: true },
  { Icon: ListOrdered, label: "Transações" },
  { Icon: CalendarClock, label: "Gastos fixos" },
  { Icon: BarChart3, label: "Comparativo" },
];

const ROWS = [
  { nome: "Supermercado", cat: "Alimentação", valor: "− R$ 182,40", up: false },
  { nome: "Salário", cat: "Receita", valor: "+ R$ 6.500,00", up: true },
  { nome: "Streaming", cat: "Lazer", valor: "− R$ 55,90", up: false },
];

function StatCard({ label, to, up }) {
  return (
    <div className="rounded-2xl bg-slate-900/[0.04] dark:bg-white/[0.04] border border-slate-900/5 dark:border-white/5 p-3.5 md:p-4">
      <div className="flex items-center justify-between text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-graphite-300">
        {label}
        {up ? (
          <ArrowUpRight size={14} className="text-emerald-600 dark:text-lime-spark" />
        ) : (
          <ArrowDownRight size={14} className="text-rose-500" />
        )}
      </div>
      <p className="mt-1.5 text-base md:text-xl font-black text-slate-900 dark:text-white">
        <CountUp to={to} decimals={2} prefix="R$ " />
      </p>
    </div>
  );
}

export function Showcase() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.5 });

  // "Levanta" o painel: de inclinado em 3D para frontal, conforme o scroll
  const rotateX = useTransform(p, [0, 1], [34, 0]);
  const scale = useTransform(p, [0, 1], [0.84, 1]);
  const y = useTransform(p, [0, 1], [90, 0]);
  const draw = useTransform(p, [0.3, 1], [0, 1]);
  const draw2 = useTransform(p, [0.4, 1], [0, 1]);

  // Painéis flutuantes em profundidade (translateZ) com velocidades distintas
  const modalY = useTransform(p, [0, 1], [140, 0]);
  const toastY = useTransform(p, [0, 1], [-110, 0]);

  return (
    <section id="produto" className="relative max-w-6xl mx-auto px-6 py-28 md:py-36">
      <div className="text-center mb-14 md:mb-20">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700 dark:text-lime-spark mb-4">
          Produto
        </p>
        <SplitHeading
          inView
          className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          words={[{ t: "Seu" }, { t: "mês" }, { t: "inteiro" }, { br: true }, { t: "de" }, { t: "relance.", accent: true }]}
        />
      </div>

      <div ref={ref} style={{ perspective: 1600 }}>
        <motion.div
          style={{ rotateX, scale, y, transformStyle: "preserve-3d", transformOrigin: "50% 100%" }}
          className="relative"
        >
          <div className="lp-glass-strong rounded-[28px] p-2 md:p-3">
            <div className="rounded-[20px] overflow-hidden border border-slate-900/5 dark:border-white/5 bg-slate-50/80 dark:bg-graphite-900/80">
              {/* Barra da janela */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-900/5 dark:border-white/5">
                <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-graphite-500" />
                <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-graphite-500" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 dark:bg-lime-spark" />
                <span className="ml-4 text-xs font-medium text-slate-400 dark:text-graphite-400">mefinance.netlify.app/dashboard</span>
              </div>

              <div className="grid md:grid-cols-[190px_1fr]">
                {/* Sidebar */}
                <aside className="hidden md:flex flex-col gap-1.5 p-4 border-r border-slate-900/5 dark:border-white/5">
                  {NAV.map(({ Icon, label, active }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium ${
                        active
                          ? "bg-emerald-600/10 dark:bg-lime-spark/10 text-emerald-800 dark:text-lime-spark"
                          : "text-slate-500 dark:text-graphite-300"
                      }`}
                    >
                      <Icon size={16} /> {label}
                    </div>
                  ))}
                </aside>

                {/* Conteúdo */}
                <div className="p-4 md:p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard label="Receitas" to={8450} up />
                    <StatCard label="Despesas" to={4170} />
                    <StatCard label="Saldo" to={4280} up />
                  </div>

                  <div className="grid md:grid-cols-5 gap-4">
                    <div className="md:col-span-3 rounded-2xl bg-slate-900/[0.04] dark:bg-white/[0.04] border border-slate-900/5 dark:border-white/5 p-4">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">Fluxo diário</p>
                      <svg viewBox="0 0 400 140" className="w-full h-32 md:h-40 overflow-visible" fill="none">
                        {[35, 70, 105].map((yy) => (
                          <line key={yy} x1="0" x2="400" y1={yy} y2={yy} className="stroke-slate-900/10 dark:stroke-white/10" strokeDasharray="3 6" />
                        ))}
                        <motion.path
                          d="M0 100 C 40 90, 60 60, 100 70 S 160 110, 200 80 S 270 30, 310 45 S 370 20, 400 12"
                          className="stroke-emerald-600 dark:stroke-lime-spark"
                          strokeWidth="3"
                          strokeLinecap="round"
                          style={{ pathLength: draw }}
                        />
                        <motion.path
                          d="M0 120 C 50 115, 70 100, 110 108 S 170 125, 210 105 S 280 90, 320 98 S 380 80, 400 74"
                          className="stroke-slate-400 dark:stroke-graphite-300"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          style={{ pathLength: draw2 }}
                        />
                      </svg>
                      <div className="flex gap-4 mt-2 text-[11px] text-slate-500 dark:text-graphite-300">
                        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-lime-spark" /> Receitas</span>
                        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-slate-400 dark:bg-graphite-300" /> Despesas</span>
                      </div>
                    </div>

                    <div className="md:col-span-2 rounded-2xl bg-slate-900/[0.04] dark:bg-white/[0.04] border border-slate-900/5 dark:border-white/5 p-4">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">Últimas transações</p>
                      <ul className="space-y-2.5">
                        {ROWS.map((r) => (
                          <li key={r.nome} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{r.nome}</p>
                              <p className="text-[11px] text-slate-500 dark:text-graphite-300">{r.cat}</p>
                            </div>
                            <span className={`text-sm font-bold tabular-nums whitespace-nowrap ${r.up ? "text-emerald-700 dark:text-lime-spark" : "text-slate-900 dark:text-white"}`}>
                              {r.valor}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Camadas flutuantes à frente (profundidade 3D) */}
          <motion.div
            style={{ y: modalY, z: 90 }}
            className="hidden md:block absolute -left-8 lg:-left-14 bottom-10 w-64"
          >
            <div className="lp-glass-strong rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-graphite-300">Nova despesa</p>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">R$ 182,40</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 bg-emerald-600/10 dark:bg-lime-spark/10 text-emerald-800 dark:text-lime-spark">Alimentação</span>
                <span className="text-[11px] text-slate-500 dark:text-graphite-300">à vista</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            style={{ y: toastY, z: 120 }}
            className="hidden md:block absolute -right-6 lg:-right-12 top-16 w-60"
          >
            <div className="lp-glass-strong rounded-2xl p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-600/10 dark:bg-lime-spark/15 text-emerald-700 dark:text-lime-spark flex items-center justify-center">
                <Target size={20} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Meta do mês</p>
                <p className="text-xs text-slate-500 dark:text-graphite-300">Você economizou 18% a mais</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Faixa de números (fatos reais do produto) ---------- */

const STATS = [
  { to: 1, prefix: "< ", suffix: " min", label: "para criar sua conta" },
  { to: 0, from: 50, prefix: "R$ ", label: "para usar o MeFinance" },
  { to: 0, from: 12, label: "conexões com o seu banco" },
  { to: 100, suffix: "%", label: "web, em qualquer tela" },
];

export function Stats() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 pb-8">
      <ScrubIn y={50} scale={0.97}>
        <div className="lp-glass rounded-3xl grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-900/10 dark:divide-white/10">
          {STATS.map((s) => (
            <div key={s.label} className="p-6 md:p-8 text-center">
              <p className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                <CountUp to={s.to} from={s.from ?? 0} prefix={s.prefix} suffix={s.suffix} duration={2} />
              </p>
              <p className="mt-2 text-xs md:text-sm text-slate-500 dark:text-graphite-300">{s.label}</p>
            </div>
          ))}
        </div>
      </ScrubIn>
    </section>
  );
}
