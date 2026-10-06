import React, { Suspense, lazy, useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { Navbar, ScrollProgressBar } from "./landing/Navbar";
import { Hero } from "./landing/Hero";
import { Marquee, Steps } from "./landing/Steps";
import { Features } from "./landing/Features";
import { Showcase, Stats } from "./landing/Showcase";
import { Faq, FinalCta, LandingFooter } from "./landing/Closing";
import "./landing/landing.css";

// Three.js só é baixado após o primeiro paint (code-splitting)
const Scene3D = lazy(() => import("./landing/Scene3D"));

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Se a cena 3D falhar, a página continua funcionando normalmente. */
class SceneBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function LandingPage() {
  const [webgl] = useState(hasWebGL);

  // Scroll suave para âncoras apenas enquanto a landing está montada
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("lp-smooth");
    return () => root.classList.remove("lp-smooth");
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-x-clip bg-slate-50 dark:bg-graphite-900 text-slate-900 dark:text-slate-100 font-sans selection:bg-lime-spark selection:text-graphite-900">
        <ScrollProgressBar />
        <Navbar />

        {/* Grid de fundo sutil */}
        <div aria-hidden="true" className="lp-grid fixed inset-0 z-0 pointer-events-none" />

        {/* Cena 3D fixa (atrás do conteúdo) */}
        {webgl && (
          <SceneBoundary>
            <Suspense fallback={null}>
              <Scene3D />
            </Suspense>
          </SceneBoundary>
        )}

        <div className="relative z-10">
          <main>
            <Hero />
            <Marquee />
            <Steps />
            <Features />
            <Showcase />
            <Stats />
            <Faq />
            <FinalCta />
          </main>
          <LandingFooter />
        </div>
      </div>
    </MotionConfig>
  );
}

export default LandingPage;
