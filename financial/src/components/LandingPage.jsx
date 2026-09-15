import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { 
  ArrowRight, Zap, LineChart, ShieldCheck, 
  Smartphone, Wallet, Lock, PlusCircle, 
  PieChart, CreditCard, ChevronDown, CheckCircle2,
  Menu, X
} from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

// Componente utilitário para Reveal on Scroll
function RevealOnScroll({ children, className = "", delay = 0 }) {
  const [ref, isVisible] = useScrollAnimation({ threshold: 0.1, triggerOnce: true });
  return (
    <div 
      ref={ref} 
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function LandingPage() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Efeito de sticky navbar no scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-graphite-900 text-slate-900 dark:text-slate-100 font-sans selection:bg-lime-spark selection:text-graphite-900 flex flex-col relative overflow-hidden">
      
      {/* Background Decorativo Superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-emerald-400/15 dark:bg-lime-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      
      {/* Sticky Header */}
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-graphite-900/80 backdrop-blur-md border-b border-slate-200 dark:border-graphite-800 shadow-sm py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-graphite-700 bg-white dark:bg-graphite-800 flex items-center justify-center shadow-sm">
              <img src="/logo.png" alt="MeFinance Logo" className="w-6 h-6 object-scale-down" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">
              Me<span className="text-emerald-600 dark:text-lime-spark">Finance</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600 dark:text-slate-300">
            <a href="#funciona" className="hover:text-emerald-600 dark:hover:text-lime-spark transition-colors">Como Funciona</a>
            <a href="#recursos" className="hover:text-emerald-600 dark:hover:text-lime-spark transition-colors">Recursos</a>
            <a href="#faq" className="hover:text-emerald-600 dark:hover:text-lime-spark transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {token ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 font-bold px-6 py-2 rounded-full bg-emerald-600 dark:bg-lime-spark text-white dark:text-graphite-900 shadow-[0_4px_14px_rgba(182,255,226,0.3)] hover:-translate-y-0.5 transition-all cursor-pointer text-sm"
              >
                Ir para o App <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <Link to="/login" className="font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-lime-spark transition-colors px-4 py-2 text-sm">
                  Entrar
                </Link>
                <Link to="/register" className="flex items-center gap-2 font-bold px-5 py-2.5 rounded-full bg-slate-900 dark:bg-lime-spark text-white dark:text-graphite-900 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm border border-transparent dark:border-lime-300">
                  Criar Conta
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-slate-700 dark:text-slate-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
             {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-graphite-900 border-b border-slate-200 dark:border-graphite-800 shadow-lg p-6 flex flex-col gap-4 animate-fade-in">
             <a href="#funciona" onClick={() => setMobileMenuOpen(false)} className="font-medium text-slate-600 dark:text-slate-300 py-2">Como Funciona</a>
             <a href="#recursos" onClick={() => setMobileMenuOpen(false)} className="font-medium text-slate-600 dark:text-slate-300 py-2">Recursos</a>
             <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="font-medium text-slate-600 dark:text-slate-300 py-2">FAQ</a>
             <div className="h-px bg-slate-100 dark:bg-graphite-800 my-2"></div>
             {token ? (
                <button onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-full bg-emerald-600 dark:bg-lime-spark text-white dark:text-graphite-900">
                  Ir para o App
                </button>
             ) : (
                <div className="flex flex-col gap-3">
                  <Link to="/login" className="w-full text-center font-semibold text-slate-700 dark:text-slate-200 py-2 border border-slate-200 dark:border-graphite-700 rounded-full">Entrar</Link>
                  <Link to="/register" className="w-full text-center font-bold px-6 py-3 rounded-full bg-slate-900 dark:bg-lime-spark text-white dark:text-graphite-900">Criar Conta</Link>
                </div>
             )}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 z-10 relative mt-10">
        <RevealOnScroll delay={0}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 dark:bg-lime-500/10 dark:text-lime-400 font-semibold text-xs tracking-wider uppercase mb-8 border border-emerald-100 dark:border-lime-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 dark:bg-lime-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 dark:bg-lime-500"></span>
            </span>
            Nova Versão 2.0 Lançada
          </div>
        </RevealOnScroll>
        
        <RevealOnScroll delay={100}>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-5xl leading-tight md:leading-[1.1] mb-6">
            Inteligência financeira para <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-lime-400 dark:to-emerald-400">quem quer ir mais longe</span>
          </h1>
        </RevealOnScroll>
        
        <RevealOnScroll delay={200}>
          <p className="text-lg md:text-xl text-slate-500 dark:text-graphite-300 max-w-2xl mb-10">
            Assuma o controle total do seu dinheiro. Organize gastos, preveja despesas fixas e tome decisões baseadas em gráficos interativos automáticos.
          </p>
        </RevealOnScroll>
        
        <RevealOnScroll delay={300}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
            <Link 
              to={token ? "/dashboard" : "/register"} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-full bg-emerald-600 dark:bg-lime-spark text-white dark:text-graphite-900 shadow-[0_8px_30px_rgba(5,150,105,0.3)] dark:shadow-[0_8px_30px_rgba(182,255,226,0.2)] hover:scale-105 transition-transform text-base"
            >
              Começar Gratuitamente <ArrowRight size={18} />
            </Link>
            <a href="#funciona" className="w-full sm:w-auto flex items-center justify-center gap-2 font-semibold px-8 py-4 rounded-full bg-white dark:bg-graphite-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-graphite-700 hover:bg-slate-50 dark:hover:bg-graphite-700 transition-colors text-base shadow-sm">
              Entender como funciona
            </a>
          </div>
        </RevealOnScroll>

        {/* Hero Image / Mockup Complexo */}
        <RevealOnScroll delay={400} className="mt-20 w-full max-w-5xl relative">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent dark:from-graphite-900 dark:via-transparent z-20 bottom-0 h-1/2"></div>
          <div className="relative rounded-t-2xl md:rounded-3xl border border-slate-200 dark:border-graphite-700 bg-white/50 dark:bg-graphite-800/50 backdrop-blur-xl p-2 md:p-4 shadow-2xl overflow-hidden z-10">
            <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-graphite-700 bg-slate-50 dark:bg-graphite-900 relative">
               
               {/* Header Falso */}
               <div className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-graphite-800/80 border-b border-slate-200 dark:border-graphite-700">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <div className="hidden sm:flex gap-4">
                     <div className="w-20 h-2 rounded-full bg-slate-200 dark:bg-graphite-700"></div>
                     <div className="w-20 h-2 rounded-full bg-slate-200 dark:bg-graphite-700"></div>
                  </div>
               </div>

               {/* Dashboard Falso */}
               <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-4 gap-6 opacity-90">
                  
                  {/* Menu Lateral Falso */}
                  <div className="hidden md:flex col-span-1 flex-col gap-4">
                     <div className="w-full h-10 rounded-xl bg-white dark:bg-graphite-800 border border-slate-200 dark:border-graphite-700"></div>
                     <div className="w-full h-10 rounded-xl bg-emerald-50 dark:bg-lime-500/10 border border-emerald-100 dark:border-lime-500/20"></div>
                     <div className="w-full h-10 rounded-xl bg-white dark:bg-graphite-800 border border-slate-200 dark:border-graphite-700"></div>
                  </div>
                  
                  <div className="col-span-1 md:col-span-3 space-y-6">
                    {/* Resumo Falso */}
                    <div className="grid grid-cols-3 gap-4">
                       <div className="h-24 bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200 dark:border-graphite-700 p-4 flex flex-col justify-between">
                         <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-lime-500/20"></div>
                         <div className="w-1/2 h-3 rounded-full bg-slate-200 dark:bg-graphite-600"></div>
                       </div>
                       <div className="h-24 bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200 dark:border-graphite-700 p-4 flex flex-col justify-between">
                         <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20"></div>
                         <div className="w-1/2 h-3 rounded-full bg-slate-200 dark:bg-graphite-600"></div>
                       </div>
                       <div className="h-24 bg-white dark:bg-graphite-800 rounded-2xl border border-slate-200 dark:border-graphite-700 p-4 flex flex-col justify-between">
                         <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20"></div>
                         <div className="w-1/2 h-3 rounded-full bg-slate-200 dark:bg-graphite-600"></div>
                       </div>
                    </div>
                    {/* Gráfico Falso */}
                    <div className="h-48 bg-emerald-50 dark:bg-lime-500/5 rounded-2xl border border-emerald-100 dark:border-lime-500/20 p-6 flex items-end">
                       <div className="w-full flex items-end justify-between gap-3 h-32">
                          {[30, 50, 40, 70, 55, 90, 80, 100, 60, 40].map((h, i) => (
                            <div key={i} className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 dark:from-lime-500 dark:to-emerald-400 rounded-t-sm" style={{ height: `${h}%` }}></div>
                          ))}
                       </div>
                    </div>
                  </div>

               </div>
            </div>
            
            {/* Elemento flutuante (Card Suspenso) */}
            <div className="hidden lg:flex absolute -right-12 top-1/3 bg-white dark:bg-graphite-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-graphite-700 animate-float items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-lime-100 dark:bg-lime-500/20 flex items-center justify-center text-emerald-600 dark:text-lime-400">
                <CheckCircle2 size={24} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-500 dark:text-graphite-400 uppercase">Economia</p>
                <p className="text-lg font-black text-slate-800 dark:text-white">+ R$ 1.250,00</p>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </main>

      {/* Como Funciona Section */}
      <section id="funciona" className="w-full max-w-7xl mx-auto px-6 py-24 z-10 relative">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Três passos para a liberdade</h2>
            <p className="text-slate-500 dark:text-graphite-400 max-w-2xl mx-auto text-lg">
              É tão simples quanto deveria ser. Não exigimos conexão com bancos ou dados sensíveis. Você no controle.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Linha conectora desktop */}
          <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-slate-200 dark:bg-graphite-700 -z-10"></div>

          <RevealOnScroll delay={0}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-900 dark:bg-lime-spark text-white dark:text-graphite-900 font-black text-2xl flex items-center justify-center mb-6 shadow-xl ring-8 ring-slate-50 dark:ring-graphite-900">1</div>
              <h3 className="text-xl font-bold mb-3">Crie sua Conta</h3>
              <p className="text-slate-500 dark:text-graphite-400">Em menos de 1 minuto, sem cartão de crédito. Você pode usar sua conta Google.</p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={200}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white font-black text-2xl flex items-center justify-center mb-6 shadow-xl ring-8 ring-slate-50 dark:ring-graphite-900">2</div>
              <h3 className="text-xl font-bold mb-3">Registre Seus Gastos</h3>
              <p className="text-slate-500 dark:text-graphite-400">Adicione receitas, despesas e defina seus gastos fixos mensais com categorização simples.</p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={400}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500 text-white font-black text-2xl flex items-center justify-center mb-6 shadow-xl ring-8 ring-slate-50 dark:ring-graphite-900">3</div>
              <h3 className="text-xl font-bold mb-3">Analise e Melhore</h3>
              <p className="text-slate-500 dark:text-graphite-400">Veja a mágica acontecer. Nossos gráficos detalham para onde seu dinheiro foge.</p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="recursos" className="w-full max-w-7xl mx-auto px-6 py-24 z-10 relative">
        <RevealOnScroll>
          <div className="mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Poderoso por dentro, <br className="hidden md:block"/>simples por fora.</h2>
            <p className="text-slate-500 dark:text-graphite-400 max-w-xl text-lg">
              Tudo foi pensado para reduzir a fricção e aumentar sua clareza financeira.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[280px]">
          
          {/* Card 1 - Grande */}
          <RevealOnScroll delay={0} className="col-span-1 md:col-span-2 row-span-1 md:row-span-2 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-graphite-800 dark:to-graphite-900 p-8 rounded-3xl border border-slate-200 dark:border-graphite-700 overflow-hidden relative group">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-graphite-700 flex items-center justify-center mb-4 shadow-sm text-emerald-600 dark:text-lime-400">
                <LineChart size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Dashboards Vivos</h3>
                <p className="text-slate-500 dark:text-graphite-300 max-w-sm">Informações processadas em tempo real. Identifique o maior ofensor do seu orçamento num piscar de olhos.</p>
              </div>
            </div>
            {/* Decoração visual interna */}
            <div className="absolute right-0 bottom-0 w-64 h-64 bg-emerald-500/10 dark:bg-lime-500/10 rounded-tl-full blur-3xl transform group-hover:scale-110 transition-transform duration-700"></div>
          </RevealOnScroll>

          {/* Card 2 */}
          <RevealOnScroll delay={150} className="col-span-1 md:col-span-2 bg-white dark:bg-graphite-800 p-8 rounded-3xl border border-slate-200 dark:border-graphite-700 flex flex-col justify-center relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Zap size={20} />
                </div>
                <h3 className="text-xl font-bold">Gastos Fixos</h3>
              </div>
              <p className="text-slate-500 dark:text-graphite-400 text-sm">Contas recorrentes entram automaticamente na previsão. Nunca mais seja pego de surpresa pelo aluguel ou luz.</p>
            </div>
          </RevealOnScroll>

          {/* Card 3 */}
          <RevealOnScroll delay={300} className="col-span-1 md:col-span-1 bg-white dark:bg-graphite-800 p-8 rounded-3xl border border-slate-200 dark:border-graphite-700 flex flex-col justify-center items-center text-center relative overflow-hidden group">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2">Segurança Total</h3>
            <p className="text-slate-500 dark:text-graphite-400 text-xs">Dados criptografados e arquitetura isolada.</p>
          </RevealOnScroll>

          {/* Card 4 */}
          <RevealOnScroll delay={450} className="col-span-1 md:col-span-1 bg-slate-900 dark:bg-lime-spark p-8 rounded-3xl border border-slate-800 dark:border-lime-400 flex flex-col justify-between relative overflow-hidden group">
            <div className="text-white dark:text-graphite-900 relative z-10">
              <Smartphone size={32} className="mb-4 opacity-80" />
              <h3 className="text-xl font-bold mb-2">100% Web</h3>
              <p className="text-slate-300 dark:text-graphite-700 text-sm">Acesse do celular, tablet ou PC. Onde você estiver.</p>
            </div>
          </RevealOnScroll>

        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="w-full max-w-4xl mx-auto px-6 py-24 z-10 relative">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Dúvidas Frequentes</h2>
            <p className="text-slate-500 dark:text-graphite-400">Tudo o que você precisa saber antes de começar.</p>
          </div>
        </RevealOnScroll>

        <div className="space-y-4">
          <FaqItem 
            question="O MeFinance conecta com o meu banco?" 
            answer="Não. Por questões de segurança máxima, optamos por não pedir conexões bancárias. Você insere manualmente o que deseja rastrear, garantindo que nenhum sistema automatizado olhe sua conta bancária real."
          />
          <FaqItem 
            question="É gratuito mesmo?" 
            answer="Sim! O uso individual da plataforma para registrar despesas e receitas e visualizar dashboards é completamente gratuito."
          />
          <FaqItem 
            question="Meus dados estão seguros?" 
            answer="Absolutamente. Utilizamos criptografia e regras estritas de banco de dados para garantir que apenas a sua conta tenha acesso aos seus registros (proteção contra IDOR). Além disso, não guardamos seus dados de cartão de crédito."
          />
          <FaqItem 
            question="Posso usar pelo celular?" 
            answer="O MeFinance é um web app altamente responsivo. Funciona perfeitamente em telas pequenas de forma nativa e rápida através do navegador do seu celular."
          />
        </div>
      </section>

      {/* Super CTA Final */}
      <section className="w-full px-4 sm:px-6 py-12 z-10">
        <RevealOnScroll>
          <div className="max-w-5xl mx-auto bg-slate-900 dark:bg-emerald-900 rounded-[2.5rem] p-10 md:p-16 text-center relative overflow-hidden border border-slate-800 dark:border-emerald-700">
            {/* Elementos visuais */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/30 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/30 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                Pronto para transformar <br className="hidden md:block"/> sua vida financeira?
              </h2>
              <p className="text-slate-300 dark:text-emerald-100/80 mb-10 max-w-xl mx-auto text-lg">
                Junte-se ao MeFinance hoje. Leva menos de 1 minuto para criar sua conta e começar a lucrar com a organização.
              </p>
              
              <Link 
                to={token ? "/dashboard" : "/register"} 
                className="inline-flex items-center gap-2 font-bold px-10 py-5 rounded-full bg-lime-spark text-graphite-900 shadow-[0_4px_20px_rgba(182,255,226,0.4)] hover:scale-105 transition-transform text-lg"
              >
                Criar Conta Gratuita <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Footer minimalista */}
      <footer className="w-full border-t border-slate-200 dark:border-graphite-800 py-10 text-center z-10 bg-white/50 dark:bg-graphite-900/50 backdrop-blur-md">
         <div className="flex items-center justify-center gap-2 mb-4 opacity-50 grayscale">
            <img src="/logo.png" alt="Logo" className="w-6 h-6" />
            <span className="font-bold">MeFinance</span>
         </div>
         <p className="text-slate-500 dark:text-graphite-500 text-sm font-medium">
           &copy; {new Date().getFullYear()} MeFinance. Todos os direitos reservados.
         </p>
      </footer>
    </div>
  );
}

// Componente para o FAQ
function FaqItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <RevealOnScroll>
      <div className="border border-slate-200 dark:border-graphite-700 rounded-2xl bg-white dark:bg-graphite-800 overflow-hidden transition-all duration-300 hover:border-emerald-200 dark:hover:border-lime-500/50">
        <button 
          className="w-full px-6 py-5 text-left flex items-center justify-between font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          {question}
          <ChevronDown className={`transition-transform duration-300 text-slate-400 ${isOpen ? 'rotate-180' : ''}`} size={20} />
        </button>
        <div className={`px-6 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
          <p className="text-slate-500 dark:text-graphite-400 leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </RevealOnScroll>
  );
}

export default LandingPage;
