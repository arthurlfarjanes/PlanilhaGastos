import React, { useState, useEffect } from "react";

export default function CookieBanner() {
  const [aceito, setAceito] = useState(true);

  const injetarAnalytics = () => {
    // Evita injetar caso o gtag já esteja carregado na página
    if (typeof window.gtag === "function") return;

    const trackingId = "G-H87RWLRY0W";

    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${trackingId}');
    `;
    document.head.appendChild(script2);
  };

  useEffect(() => {
    const consentimento = localStorage.getItem("lgpd-consent");
    if (consentimento === null) {
      setAceito(false); // Mostra o banner se o usuário ainda não escolheu nada
    } else if (consentimento === "true") {
      injetarAnalytics(); // Injeta apenas se explicitamente aceito anteriormente
    }
    // Se consentimento === "false", o banner continua oculto e o Analytics não roda
  }, []);

  const aceitarCookies = () => {
    localStorage.setItem("lgpd-consent", "true");
    setAceito(true);
    injetarAnalytics();
  };

  const rejeitarCookies = () => {
    localStorage.setItem("lgpd-consent", "false");
    setAceito(true);
    // Nenhum script de rastreamento é injetado
  };

  if (aceito) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-slate-900 text-white p-4 shadow-2xl z-50 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm">
        Usamos cookies para melhorar sua experiência e analisar nosso tráfego.
        Ao continuar, você concorda com nossa{" "}
        <a
          href="/politica-de-privacidade.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-lime-spark"
        >
          política de privacidade
        </a>
        .
      </p>
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <button
          onClick={rejeitarCookies}
          className="px-4 py-2 bg-transparent border border-slate-600 text-slate-300 font-semibold rounded-lg hover:bg-slate-800 transition-colors text-sm cursor-pointer"
        >
          Rejeitar
        </button>
        <button
          onClick={aceitarCookies}
          className="px-6 py-2 bg-lime-spark text-graphite-900 font-bold rounded-lg whitespace-nowrap hover:opacity-90 text-sm cursor-pointer"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
