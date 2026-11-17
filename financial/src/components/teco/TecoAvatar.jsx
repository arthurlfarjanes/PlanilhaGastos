import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Check, HelpCircle, MessageCircle } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";

const SIZE_MAP = {
  xs: "w-7 h-7",
  sm: "w-9 h-9",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

const MOOD_RING = {
  idle: "ring-emerald-500/35",
  greeting: "ring-emerald-500/60",
  explaining: "ring-sky-500/55",
  thinking: "ring-amber-500/55",
  success: "ring-emerald-500/75",
  celebrating: "ring-amber-400/80",
};

function usePrefersReducedMotion(propOverride) {
  const { prefs } = usePreferences();
  const [osReduced, setOsReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e) => setOsReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return Boolean(propOverride ?? (prefs?.appearance?.reduceMotion || osReduced));
}

function MoodBadge({ mood, size }) {
  if (size === "xs") return null;
  if (mood === "success" || mood === "celebrating") {
    return (
      <span
        aria-hidden="true"
        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
      >
        {mood === "celebrating" ? <Sparkles className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}
      </span>
    );
  }
  if (mood === "explaining") {
    return (
      <span
        aria-hidden="true"
        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
      >
        <MessageCircle className="h-2.5 w-2.5" />
      </span>
    );
  }
  if (mood === "thinking") {
    return (
      <span
        aria-hidden="true"
        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
      >
        <HelpCircle className="h-2.5 w-2.5" />
      </span>
    );
  }
  return null;
}

export default function TecoAvatar({
  mood = "idle",
  size = "md",
  className = "",
  reduceMotion: reduceMotionProp,
  alt = "Teco, mascote coruja do MeFinance",
}) {
  const reduced = usePrefersReducedMotion(reduceMotionProp);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const ringClass = MOOD_RING[mood] || MOOD_RING.idle;

  const animateConfig = (() => {
    if (reduced) return {};
    switch (mood) {
      case "greeting":
        return {
          rotate: [0, -6, 6, -4, 0],
          scale: [1, 1.05, 1],
          transition: { duration: 1.1, ease: "easeInOut" },
        };
      case "explaining":
        return {
          y: [0, -2, 0],
          transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
        };
      case "thinking":
        return {
          rotate: [0, 3, -3, 0],
          transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
        };
      case "success":
        return {
          scale: [0.95, 1.08, 1],
          transition: { duration: 0.45, ease: "easeOut" },
        };
      case "celebrating":
        return {
          y: [0, -5, 0, -3, 0],
          scale: [1, 1.08, 1],
          transition: { duration: 0.9, ease: "easeInOut" },
        };
      case "idle":
      default:
        return {
          y: [0, -1.5, 0],
          transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
        };
    }
  })();

  return (
    <motion.div
      animate={animateConfig}
      className={`relative inline-flex shrink-0 select-none items-center justify-center rounded-full ring-2 ${ringClass} ${sizeClass} ${className}`}
    >
      <img
        src="/teco-avatar.jpg"
        alt={alt}
        className="h-full w-full rounded-full object-cover"
        loading="lazy"
      />
      <MoodBadge mood={mood} size={size} />
    </motion.div>
  );
}
