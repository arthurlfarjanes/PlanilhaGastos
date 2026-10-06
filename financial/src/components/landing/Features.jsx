import { motion } from "motion/react";
import { CalendarClock, Laptop, Lock, ShieldCheck, Smartphone, Tablet, Zap } from "lucide-react";
import { EASE_OUT, ScrubIn, SplitHeading, handleSpotlight } from "./primitives";

/* ---------- Cartão base do bento (glass + spotlight + entrada scrubbed) ---------- */

function BentoCard({ className = "", children }) {
  return (
    <ScrubIn y={64} scale={0.94} className={className}>
      <div
        onPointerMove={handleSpotlight}
        className="lp-glass lp-spotlight rounded-3xl p-6 md:p-7 h-full overflow-hidden flex flex-col"
      >
        {children}
      </div>
    </ScrubIn>
  );
}

const Title = ({ icon: Icon, children, sub }) => (
  <div>
    <div className="flex items-center gap-2.5 mb-2">
      <span className="w-9 h-9 rounded-xl bg-emerald-600/10 dark:bg-lime-spark/10 text-emerald-700 dark:text-lime-spark flex items-center justify-center">
        <Icon size={18} />
      </span>
      <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{children}</h3>
    </div>
    <p className="text-sm text-slate-600 dark:text-graphite-300 leading-relaxed max-w-sm">{sub}</p>
  </div>
);

/* ---------- Mini visuais ---------- */

const DONUT = [
  { len: 38, color: "#0d7a57", label: "Moradia" },
  { len: 27, color: "#34d399", label: "Alimentação" },
  { len: 20, color: "#b6ffe2", label: "Transporte" },
  { len: 15, color: "#94a3b8", label: "Lazer" },
];

function DashboardVisual() {
  const bars = [38, 62, 45, 78, 56, 92, 70, 100, 64, 48, 82, 58];
  let acc = 0;
  return (
    <div className="mt-6 flex-1 grid grid-cols-5 gap-5 items-end min-h-[180px]">
      <div className="col-span-2 flex flex-col items-center justify-center gap-4">
        <svg viewBox="0 0 100 100" className="w-full max-w-[150px] -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" strokeWidth="12" className="stroke-slate-900/10 dark:stroke-white/10" />
          {DONUT.map((d, i) => {
            const offset = -acc;
            acc += d.len;
            return (
              <motion.circle
                key={d.label}
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke={d.color}
                strokeWidth="12"
                pathLength={100}
                strokeDashoffset={offset}
                initial={{ strokeDasharray: "0 100" }}
                whileInView={{ strokeDasharray: `${d.len - 1.2} ${100 - d.len + 1.2}` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 + i * 0.18, ease: EASE_OUT }}
              />
            );
          })}
        </svg>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-graphite-300">
          {DONUT.map((d) => (
            <li key={d.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              {d.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="col-span-3 h-full flex items-end gap-1.5">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className={`flex-1 rounded-t-md origin-bottom ${
              i === 7 ? "bg-emerald-600 dark:bg-lime-spark" : "bg-slate-900/15 dark:bg-white/15"
            }`}
            style={{ height: `${h}%` }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 + i * 0.05, ease: EASE_OUT }}
          />
        ))}
      </div>
    </div>
  );
}

const FIXOS = [
  { nome: "Aluguel", dia: "dia 05", valor: "R$ 1.800,00" },
  { nome: "Internet", dia: "dia 10", valor: "R$ 119,90" },
  { nome: "Energia", dia: "dia 15", valor: "R$ 210,00" },
];

function FixosVisual() {
  return (
    <ul className="mt-5 space-y-2.5">
      {FIXOS.map((f, i) => (
        <motion.li
          key={f.nome}
          initial={{ opacity: 0, x: 28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 + i * 0.12, ease: EASE_OUT }}
          className="flex items-center justify-between rounded-xl bg-slate-900/[0.04] dark:bg-white/[0.04] border border-slate-900/5 dark:border-white/5 px-4 py-2.5"
        >
          <span className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-lime-spark" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{f.nome}</span>
            <span className="text-xs text-slate-500 dark:text-graphite-300">{f.dia}</span>
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{f.valor}</span>
        </motion.li>
      ))}
    </ul>
  );
}

function ParcelaVisual() {
  return (
    <div className="mt-4 flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-slate-900/10 dark:stroke-white/10" />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            className="stroke-emerald-600 dark:stroke-lime-spark"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 0.25 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3, ease: EASE_OUT }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-900 dark:text-white">
          3/12
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-graphite-300 leading-snug">
        Parcelas lançadas automaticamente nos próximos meses.
      </p>
    </div>
  );
}

const SWATCHES = ["#0d7a57", "#34d399", "#b6ffe2", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa", "#94a3b8"];

function CoresVisual() {
  return (
    <div className="mt-4 grid grid-cols-4 gap-2.5">
      {SWATCHES.map((c, i) => (
        <motion.span
          key={c}
          className="aspect-square rounded-xl border border-black/5 dark:border-white/10"
          style={{ background: c }}
          initial={{ scale: 0, rotate: -20 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 + i * 0.06 }}
        />
      ))}
    </div>
  );
}

function SegurancaVisual() {
  return (
    <div className="mt-auto pt-5 flex items-center gap-4">
      <div className="relative w-16 h-16 shrink-0 rounded-2xl bg-emerald-600/10 dark:bg-lime-spark/10 flex items-center justify-center text-emerald-700 dark:text-lime-spark">
        <ShieldCheck size={30} />
        <span className="absolute inset-0 rounded-2xl border border-emerald-600/30 dark:border-lime-spark/30 lp-pulse-ring" />
      </div>
      <ul className="text-xs text-slate-600 dark:text-graphite-300 space-y-1.5">
        <li className="flex items-center gap-2"><Lock size={12} /> Senhas criptografadas</li>
        <li className="flex items-center gap-2"><Lock size={12} /> Dados isolados por conta</li>
        <li className="flex items-center gap-2"><Lock size={12} /> Sem acesso ao seu banco</li>
      </ul>
    </div>
  );
}

function WebVisual() {
  const devices = [
    { Icon: Smartphone, cls: "lp-float" },
    { Icon: Tablet, cls: "lp-float-slow" },
    { Icon: Laptop, cls: "lp-float-fast" },
  ];
  return (
    <div className="mt-auto pt-5 flex items-end gap-4">
      {devices.map(({ Icon, cls }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 + i * 0.12, ease: EASE_OUT }}
        >
          <div className={`${cls} w-14 h-14 rounded-2xl lp-glass-strong flex items-center justify-center text-slate-700 dark:text-slate-100`}>
            <Icon size={26} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Seção ---------- */

export function Features() {
  return (
    <section id="recursos" className="relative max-w-7xl mx-auto px-6 py-28 md:py-36">
      <div className="mb-14 md:mb-20 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700 dark:text-lime-spark mb-4">
          Recursos
        </p>
        <SplitHeading
          inView
          className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          words={[{ t: "Poderoso" }, { t: "por" }, { t: "dentro," }, { br: true }, { t: "simples", accent: true }, { t: "por" }, { t: "fora." }]}
        />
        <p className="mt-5 text-lg text-slate-600 dark:text-graphite-300">
          Tudo foi pensado para reduzir a fricção e aumentar a sua clareza financeira.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 auto-rows-[minmax(250px,auto)]">
        <BentoCard className="md:col-span-2 md:row-span-2">
          <Title icon={Zap} sub="Informações processadas em tempo real. Identifique o maior ofensor do seu orçamento num piscar de olhos.">
            Dashboards vivos
          </Title>
          <DashboardVisual />
        </BentoCard>

        <BentoCard className="md:col-span-2" delay={0.05}>
          <Title icon={CalendarClock} sub="Contas recorrentes entram automaticamente na previsão. Nunca mais seja pego de surpresa.">
            Gastos fixos
          </Title>
          <FixosVisual />
        </BentoCard>

        <BentoCard className="md:col-span-1" delay={0.1}>
          <Title icon={Zap} sub="Compras parceladas sem planilha.">
            Parcelamentos
          </Title>
          <ParcelaVisual />
        </BentoCard>

        <BentoCard className="md:col-span-1" delay={0.15}>
          <Title icon={Zap} sub="Cores que facilitam a leitura.">
            Categorias
          </Title>
          <CoresVisual />
        </BentoCard>

        <BentoCard className="md:col-span-2" delay={0.05}>
          <Title icon={ShieldCheck} sub="Seus dados ficam só com você, em uma arquitetura isolada e criptografada.">
            Segurança total
          </Title>
          <SegurancaVisual />
        </BentoCard>

        <BentoCard className="md:col-span-2" delay={0.1}>
          <Title icon={Smartphone} sub="Acesse do celular, tablet ou PC. Onde você estiver, sem instalar nada.">
            100% web
          </Title>
          <WebVisual />
        </BentoCard>
      </div>
    </section>
  );
}
