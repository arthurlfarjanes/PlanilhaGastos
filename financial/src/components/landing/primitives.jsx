import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1];

/** Cor de destaque do site: esmeralda no tema claro, lime-spark no escuro. */
export const ACCENT_TEXT = "text-emerald-600 dark:text-lime-spark";

/** Handler do spotlight sutil que segue o cursor (usado com a classe `lp-spotlight`). */
export function handleSpotlight(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

/**
 * Título com revelação palavra por palavra (máscara + slide-up).
 * `words`: [{ t: "palavra", accent?: boolean, br?: boolean }]
 */
export function SplitHeading({
  words,
  as: Tag = "h2",
  className = "",
  delay = 0,
  stagger = 0.07,
  inView = false,
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[Tag];

  const variants = {
    hidden: { y: "118%" },
    show: (i) => ({
      y: "0%",
      transition: { duration: 0.85, ease: EASE_OUT, delay: delay + i * stagger },
    }),
  };

  const trigger = inView
    ? { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "-12% 0px" } }
    : { initial: "hidden", animate: "show" };

  let wordIndex = 0;

  return (
    <MotionTag className={className} {...(reduce ? {} : trigger)}>
      {words.map((w, idx) => {
        if (w.br) return <br key={`br-${idx}`} className="hidden md:block" />;
        const i = wordIndex++;
        return (
          <span key={`${w.t}-${idx}`}>
            <span className="inline-block overflow-hidden align-top py-[0.08em] -my-[0.08em]">
              <motion.span
                className={`inline-block will-change-transform ${w.accent ? ACCENT_TEXT : ""}`}
                variants={reduce ? undefined : variants}
                custom={i}
              >
                {w.t}
              </motion.span>
            </span>{" "}
          </span>
        );
      })}
    </MotionTag>
  );
}

/**
 * Entrada "scrubbed": opacidade / posição / escala acompanham o scroll continuamente
 * (e revertem quando o usuário volta), com mola para suavizar.
 */
export function ScrubIn({
  children,
  className = "",
  y = 56,
  scale = 0.96,
  start = "95%",
  end = "60%",
  style,
  ...rest
}) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`start ${start}`, `start ${end}`],
  });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const opacity = useTransform(p, [0, 1], [0, 1]);
  const yy = useTransform(p, [0, 1], [y, 0]);
  const sc = useTransform(p, [0, 1], [scale, 1]);

  if (reduce) {
    return (
      <div ref={ref} className={className} style={style} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ opacity, y: yy, scale: sc, ...style }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Deslocamento parallax contínuo conforme o elemento atravessa a viewport. */
export function Parallax({ children, speed = 0.5, className = "", style }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 80, speed * -80]);
  return (
    <motion.div ref={ref} className={className} style={{ y: reduce ? 0 : y, ...style }}>
      {children}
    </motion.div>
  );
}

/** Botão/elemento "magnético": se aproxima levemente do cursor. */
export function Magnetic({ children, strength = 0.28, className = "" }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 16, mass: 0.35 });
  const y = useSpring(my, { stiffness: 220, damping: 16, mass: 0.35 });

  const onMove = (e) => {
    if (e.pointerType === "touch" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * strength);
    my.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x, y }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

const brNumber = (v, decimals) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);

/** Contador animado que dispara ao entrar na viewport. */
export function CountUp({
  to,
  from = 0,
  duration = 1.8,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [val, setVal] = useState(reduce ? to : from);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(from, to, {
      duration,
      ease: EASE_OUT,
      onUpdate: setVal,
    });
    return () => controls.stop();
  }, [inView, reduce, from, to, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {brNumber(val, decimals)}
      {suffix}
    </span>
  );
}

const wrap = (min, max, v) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/** Faixa infinita cuja velocidade reage à velocidade do scroll. */
export function VelocityMarquee({ children, baseVelocity = -3, className = "" }) {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-25, 0, v)}%`);
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let move = direction.current * baseVelocity * (delta / 1000);
    const vf = velocityFactor.get();
    if (vf < 0) direction.current = -1;
    else if (vf > 0) direction.current = 1;
    move += direction.current * move * vf;
    baseX.set(baseX.get() + move);
  });

  return (
    <div className={`overflow-hidden whitespace-nowrap flex ${className}`}>
      <motion.div className="flex shrink-0 whitespace-nowrap" style={{ x }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex shrink-0 items-center" aria-hidden={i > 0}>
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
