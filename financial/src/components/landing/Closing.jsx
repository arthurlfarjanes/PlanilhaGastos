import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Plus } from "lucide-react";
import { AuthContext } from "../../App";
import { EASE_OUT, Magnetic, ScrubIn, SplitHeading, handleSpotlight } from "./primitives";

/* ---------- FAQ ---------- */

const FAQS = [
  {
    q: "O MeFinance conecta com o meu banco?",
    a: "Não. Por questões de segurança máxima, optamos por não pedir conexões bancárias. Você insere manualmente o que deseja rastrear, garantindo que nenhum sistema automatizado olhe sua conta bancária real.",
  },
  {
    q: "É gratuito mesmo?",
    a: "Sim! O uso individual da plataforma para registrar despesas e receitas e visualizar dashboards é completamente gratuito.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Absolutamente. Utilizamos criptografia e regras estritas de banco de dados para garantir que apenas a sua conta tenha acesso aos seus registros (proteção contra IDOR). Além disso, não guardamos seus dados de cartão de crédito.",
  },
  {
    q: "Posso usar pelo celular?",
    a: "O MeFinance é um web app altamente responsivo. Funciona perfeitamente em telas pequenas de forma nativa e rápida através do navegador do seu celular.",
  },
];

function FaqItem({ q, a, open, onToggle, id }) {
  return (
    <ScrubIn y={36} scale={0.98}>
      <div
        onPointerMove={handleSpotlight}
        className={`lp-glass lp-spotlight rounded-2xl overflow-hidden transition-colors ${
          open ? "border-emerald-600/30 dark:border-lime-spark/30" : ""
        }`}
      >
        <button
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`faq-${id}`}
          className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left font-bold text-slate-900 dark:text-white cursor-pointer"
        >
          {q}
          <motion.span
            animate={{ rotate: open ? 135 : 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="shrink-0 w-8 h-8 rounded-full bg-slate-900/5 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-200"
          >
            <Plus size={16} />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={`faq-${id}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <p className="px-6 pb-6 text-slate-600 dark:text-graphite-300 leading-relaxed">{a}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScrubIn>
  );
}

export function Faq() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section id="faq" className="relative max-w-3xl mx-auto px-6 py-28 md:py-36">
      <div className="text-center mb-12">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700 dark:text-lime-spark mb-4">
          FAQ
        </p>
        <SplitHeading
          inView
          className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          words={[{ t: "Dúvidas" }, { t: "frequentes" }]}
        />
        <p className="mt-4 text-slate-600 dark:text-graphite-300">Tudo o que você precisa saber antes de começar.</p>
      </div>
      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <FaqItem
            key={f.q}
            id={i}
            q={f.q}
            a={f.a}
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------- CTA final (moedas 3D atrás do vidro) ---------- */

export function FinalCta() {
  const { token } = useContext(AuthContext);
  return (
    <section className="relative max-w-6xl mx-auto px-6 pb-28 md:pb-36">
      <div className="grid lg:grid-cols-12 items-center gap-6 lg:gap-0">
        {/* Painel de vidro: sobrepõe parcialmente o palco 3D (objeto "atrás do vidro") */}
        <ScrubIn y={70} scale={0.95} className="lg:col-span-8 relative z-10">
          <div className="lp-glass-strong rounded-[2.5rem] p-8 sm:p-12 md:p-16">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700 dark:text-lime-spark mb-5">
              Comece hoje
            </p>
            <SplitHeading
              inView
              className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] text-slate-900 dark:text-white"
              words={[{ t: "Pronto" }, { t: "para" }, { br: true }, { t: "organizar" }, { t: "seu" }, { t: "dinheiro?", accent: true }]}
            />
            <p className="mt-6 text-lg text-slate-600 dark:text-graphite-300 max-w-xl leading-relaxed">
              Leva menos de 1 minuto para criar sua conta e começar a enxergar para onde cada real está indo.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-5">
              <Magnetic>
                <Link
                  to={token ? "/dashboard" : "/register"}
                  className="group inline-flex items-center gap-2 font-bold px-9 py-5 rounded-full bg-emerald-600 dark:bg-lime-spark text-white dark:text-graphite-900 text-lg shadow-lg shadow-emerald-900/10 hover:brightness-105 transition"
                >
                  {token ? "Ir para o painel" : "Criar conta gratuita"}
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <span className="text-sm text-slate-500 dark:text-graphite-300">Sem cartão de crédito · 100% gratuito</span>
            </div>
          </div>
        </ScrubIn>

        <div className="lg:col-span-4 relative lg:-ml-24">
          <div data-scene-anchor="cta" className="h-[320px] lg:h-[460px]" />
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

export function LandingFooter() {
  return (
    <footer className="relative border-t border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-6 h-6" />
          <span className="font-extrabold text-slate-900 dark:text-white">
            Me<span className="text-emerald-600 dark:text-lime-spark">Finance</span>
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-slate-500 dark:text-graphite-300">
          <a href="#funciona" className="hover:text-slate-900 dark:hover:text-white transition-colors">Como funciona</a>
          <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors">FAQ</a>
          <a href="/politica-de-privacidade.pdf" target="_blank" rel="noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Política de privacidade
          </a>
        </nav>
        <p className="text-sm text-slate-500 dark:text-graphite-400">
          &copy; {new Date().getFullYear()} MeFinance. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
