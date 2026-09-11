import React, { useState, useEffect } from "react";

export default function CookieBanner() {
  const [aceito, setAceito] = useState(true); // Começa true para evitar flash, validamos no useEffect[cite: 16]

  // Função para injetar o Google Analytics dinamicamente
  const injetarAnalytics = () => {
    // Evita injetar o script mais de uma vez se já estiver na página
    if (window.dataLayer) return;

    const trackingId = "G-SEU_CODIGO_AQUI"; // Substitua pelo seu Measurement ID do GA4

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
    const consentimento = localStorage.getItem("lgpd-consent"); //[cite: 16]
    if (!consentimento) {
      setAceito(false); //[cite: 16]
    } else if (consentimento === "true") {
      // Se já tinha aceitado antes, injeta o script logo no carregamento
      injetarAnalytics();
    }
  }, []);

  const aceitarCookies = () => {
    localStorage.setItem("lgpd-consent", "true"); //[cite: 16]
    setAceito(true); //[cite: 16]

    // Injeta o script do Analytics imediatamente após o clique
    injetarAnalytics();
  };

  if (aceito) return null; //[cite: 16]

  return (
    <div className="fixed bottom-0 left-0 w-full bg-slate-900 text-white p-4 shadow-2xl z-50 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm">
        Usamos cookies para melhorar sua experiência e analisar nosso tráfego.
        Ao continuar, você concorda com nossa política de privacidade.
      </p>
      <button
        onClick={aceitarCookies}
        className="px-6 py-2 bg-lime-spark text-graphite-900 font-bold rounded-lg whitespace-nowrap hover:opacity-90"
      >
        Aceitar e Fechar
      </button>
    </div>
  );
}
