import React, { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollUpButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-2xl bg-lime-spark text-graphite-900 shadow-[0_4px_16px_rgba(182,255,226,0.35)] hover:bg-lime-spark-hover hover:-translate-y-1 transition-all duration-200 cursor-pointer flex items-center justify-center border border-lime-spark/40"
      aria-label="Voltar ao topo"
    >
      <ChevronUp size={20} strokeWidth={2.5} />
    </button>
  );
}
