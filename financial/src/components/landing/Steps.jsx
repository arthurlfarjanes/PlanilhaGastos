import { useRef } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { UserPlus, ReceiptText, PieChart, Star } from "lucide-react";
import { SplitHeading, VelocityMarquee } from "./primitives";
import { sceneStore } from "./sceneStore";

/* ---------- Faixa de palavras-chave (velocidade reage ao scroll) ---------- */

const MARQUEE_ITEMS = [
  "Gastos fixos",
  "Compras parceladas",
  "Categorias com cores",
  "Dashboards interativos",
  "Filtros em tempo real",
  "Login com Google",
  "Receitas e despesas",
  "100% web",
];

export function Marquee() {
  return (
    <div className="relative py-5 border-y border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-sm">
      <VelocityMarquee baseVelocity={-2.2}>
        {MARQUEE_ITEMS.map((t) => (
          <span
            key={t}
            className="flex items-center gap-8 pr-8 text-sm md:text-base font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-graphite-300"
          >
            {t}
            <Star size={12} className="text-emerald-600 dark:text-lime-spark fill-current" />
          </span>
        ))}
      </VelocityMarquee>
    </div>
  );
}

/* ---------- Como funciona: seção "pinada" guiada pelo scroll ---------- */

const STEPS = [
  {
    n: "01",
    title: "Crie sua conta",
    text: "Em menos de 1 minuto, sem cartão de crédito. Você pode entrar direto com sua conta Google.",
    mini: (
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-white dark:bg-graphite-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-600 dark:text-lime-spark">
          <UserPlus size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Continuar com Google</p>
          <p className="text-xs text-slate-500 dark:text-graphite-300">Pronto em poucos segundos</p>
        </div>
      </div>
    ),
  },
  {
    n: "02",
    title: "Registre seus gastos",
    text: "Adicione receitas, despesas e defina seus gastos fixos mensais com categorização simples.",
    mini: (
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-emerald-600/10 dark:bg-lime-spark/15 flex items-center justify-center text-emerald-700 dark:text-lime-spark">
          <ReceiptText size={18} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Supermercado</p>
          <p className="text-xs text-slate-500 dark:text-graphite-300">Alimentação · hoje</p>
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-white">− R$ 182,40</span>
      </div>
    ),
  },
  {
    n: "03",
    title: "Analise e melhore",
    text: "Veja a mágica acontecer: os gráficos mostram, sem esforço, para onde o seu dinheiro está indo.",
    mini: (
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-emerald-600/10 dark:bg-lime-spark/15 flex items-center justify-center text-emerald-700 dark:text-lime-spark">
          <PieChart size={18} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Maior gasto do mês</p>
          <p className="text-xs text-slate-500 dark:text-graphite-300">Moradia · 38% do total</p>
        </div>
      </div>
    ),
  },
];

/** Opacidade/posição de cada passo ao longo do progresso 0..1 da seção. */
const STEP_RANGES = [
  { o: [0, 0.26, 0.36], ov: [1, 1, 0], y: [0, 0.26, 0.36], yv: [0, 0, -48] },
  { o: [0.28, 0.38, 0.62, 0.72], ov: [0, 1, 1, 0], y: [0.28, 0.38, 0.62, 0.72], yv: [48, 0, 0, -48] },
  { o: [0.64, 0.74, 1], ov: [0, 1, 1], y: [0.64, 0.74, 1], yv: [48, 0, 0] },
];

function StepText({ step, ranges, progress }) {
  const opacity = useTransform(progress, ranges.o, ranges.ov);
  const y = useTransform(progress, ranges.y, ranges.yv);
  return (
    <motion.div style={{ opacity, y }} className="absolute inset-0 flex flex-col justify-center">
      <span className="lp-outline-text text-8xl md:text-9xl font-black leading-none select-none">
        {step.n}
      </span>
      <h3 className="mt-2 text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {step.title}
      </h3>
      <p className="mt-4 text-base md:text-lg text-slate-600 dark:text-graphite-300 max-w-md leading-relaxed">
        {step.text}
      </p>
      <div className="lp-glass rounded-2xl p-4 mt-6 max-w-sm">{step.mini}</div>
    </motion.div>
  );
}

function StepPill({ index, progress }) {
  const fill = useTransform(progress, [index / 3, (index + 1) / 3], [0, 1], { clamp: true });
  return (
    <div className="h-1 w-14 sm:w-20 rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
      <motion.div
        className="h-full w-full origin-left rounded-full bg-emerald-600 dark:bg-lime-spark"
        style={{ scaleX: fill }}
      />
    </div>
  );
}

export function Steps() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  // Alimenta a cena 3D (morph cartão → moedas → barras)
  useMotionValueEvent(progress, "change", (v) => sceneStore.steps.set(v));

  return (
    <section id="funciona" className="relative">
      <div className="max-w-7xl mx-auto px-6 pt-28 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700 dark:text-lime-spark mb-4">
          Como funciona
        </p>
        <SplitHeading
          inView
          className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          words={[{ t: "Três" }, { t: "passos" }, { t: "para" }, { br: true }, { t: "a" }, { t: "liberdade", accent: true }]}
        />
      </div>

      {/* Contêiner alto: o scroll "gasta" altura enquanto o palco fica fixo */}
      <div ref={ref} className="relative h-[320vh]">
        <div className="sticky top-0 h-[100svh] pt-24 pb-8">
          <div className="max-w-7xl mx-auto px-6 h-full grid grid-rows-[42%_1fr] lg:grid-rows-1 lg:grid-cols-2 gap-4 lg:gap-12">
            {/* Palco 3D */}
            <div className="relative lg:order-2">
              <div data-scene-anchor="steps" className="absolute inset-0" />
            </div>

            {/* Textos dos passos */}
            <div className="relative lg:order-1 flex flex-col justify-center">
              <div className="relative h-[330px] md:h-[420px]">
                {STEPS.map((s, i) => (
                  <StepText key={s.n} step={s} ranges={STEP_RANGES[i]} progress={progress} />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4" aria-hidden="true">
                {STEPS.map((_, i) => (
                  <StepPill key={i} index={i} progress={progress} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
