'use client';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  Crown, 
  GlassWater, 
  QrCode, 
  Gem, 
  ChevronRight, 
  Clock, 
  Sparkles, 
  Compass, 
  User, 
  Wine,
  Lock,
  Unlock,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import toast from 'react-hot-toast';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

const WHISKY_SELECTION = [
  { 
    name: 'Macallan 25 Years Old', 
    type: 'Single Malt Scotch', 
    origin: 'Speyside, Scotland', 
    price: '$220 / shot', 
    desc: 'Lujoso whisky envejecido en barricas de Jerez de roble procedentes de España. Notas florales, de frutos secos y de jerez.', 
    rating: '98 pts'
  },
  { 
    name: 'Lagavulin 16 Years Old', 
    type: 'Single Malt Scotch', 
    origin: 'Islay, Scotland', 
    price: '$45 / shot', 
    desc: 'El rey de la turba. Un whisky ahumado profundo, complejo e intensamente picante, balanceado con un dulzor a jerez.', 
    rating: '95 pts'
  },
  { 
    name: 'Hibiki Japanese Harmony', 
    type: 'Blended Japanese Whisky', 
    origin: 'Yamanashi, Japan', 
    price: '$35 / shot', 
    desc: 'Armonía perfecta de maltas dulces y roble Mizunara refinado. Notas de miel de acacia, naranja confitada y sándalo.', 
    rating: '94 pts'
  }
];

export default function HomePage() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activeWhisky, setActiveWhisky] = useState(0);
  const [inventoryTab, setInventoryTab] = useState<'catalog' | 'metrics'>('catalog');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Generar partículas sutiles locales después de montar el componente
  useEffect(() => {
    const generated = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      color: Math.random() > 0.5 ? '#E8C96A' : '#00F5D4',
      delay: Math.random() * 5,
      duration: Math.random() * 12 + 10,
    }));
    setParticles(generated);
  }, []);

  return (
    <main className="min-h-screen relative bg-[#040814] text-admiral-cream overflow-hidden font-sans select-none perspective-1000">
      
      {/* ── 1. Fondo de Partículas y Neblinas de Neón ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Neblinas flotantes de colores */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            x: [0, 60, 0],
            y: [0, -60, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-10%] left-[-15%] w-[500px] h-[500px] bg-[#E8C96A]/10 rounded-full blur-[130px] neon-glow-gold"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -60, 0],
            y: [0, 60, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#00F5D4]/10 rounded-full blur-[150px] neon-glow-cyan"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 40, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-[#7B2CBF]/10 rounded-full blur-[110px] neon-glow-purple"
        />

        {/* Partículas suspendidas en el aire */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 10px ${p.color}`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.1, 0.6, 0.1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 flex flex-col min-h-screen justify-between preserve-3d">
        
        {/* ── HEADER SUPERIOR ── */}
        <header className="flex justify-between items-center w-full mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center space-x-2.5"
          >
            <Logo size={32} glow={false} className="border border-admiral-gold/15 shadow-sm shadow-black/50" />
            <span className="font-serif text-base font-semibold tracking-[0.2em] bg-gradient-to-r from-[#F5DC8E] to-[#D4A535] bg-clip-text text-transparent uppercase">
              Admiral Pro
            </span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link 
              href="/login" 
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest border border-admiral-gold/15 bg-[#0B1428]/45 hover:border-admiral-gold/40 hover:bg-[#142447]/65 transition-all active:scale-95"
            >
              <User className="w-3.5 h-3.5 text-admiral-gold" />
              <span>Acceso Staff</span>
            </Link>
          </motion.div>
        </header>

        {/* ── 2. HERO SECTION CON LOGO CENTRADO 3D ── */}
        <section className="flex flex-col items-center text-center my-auto py-6 preserve-3d">
          {/* Contenedor del Logo 3D con perspectiva real */}
          <Logo size={220} glow={true} interactive={true} className="mb-8 filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.75)]" />

          {/* Textos del Hero */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl preserve-3d"
          >
            <h2 className="font-serif text-4xl sm:text-5xl font-medium tracking-wide leading-tight mb-4 translate-z-20">
              <span className="bg-gradient-to-r from-admiral-ivory via-admiral-cream to-admiral-gold bg-clip-text text-transparent">
                Control de Barra & Punto de Venta (POS)
              </span>
            </h2>
            
            <p className="text-sm sm:text-base text-admiral-mist max-w-lg mx-auto font-light leading-relaxed mb-8 translate-z-10">
              Portal de acceso exclusivo para el personal staff de Admiral Whisky Bar. Gestiona comandas en tiempo real, controla la facturación diaria en caja y administra los clientes premium del Club de Lealtad.
            </p>

            {/* Botones de Acción Luxury */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 translate-z-30 preserve-3d">
              <Link 
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider text-admiral-night bg-gradient-to-r from-[#F5DC8E] via-[#E8C96A] to-[#D4A535] shadow-[0_8px_30px_-5px_rgba(232,201,106,0.45)] hover:brightness-110 active:scale-[0.98] transition-all duration-300 btn-3d-glow"
              >
                <GlassWater className="w-4 h-4 text-admiral-night" />
                <span>Ingresar al Sistema POS</span>
                <ChevronRight className="w-4 h-4 text-admiral-night" />
              </Link>

              <a
                href="#cards-experience"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-7 py-4 rounded-2xl font-semibold text-sm uppercase tracking-wider border border-admiral-gold/15 bg-[#0F1B33]/40 hover:border-[#00F5D4]/45 hover:bg-[#142447]/60 hover:shadow-[0_0_20px_rgba(0,245,212,0.15)] transition-all active:scale-[0.98] duration-300"
              >
                <Compass className="w-4 h-4 text-admiral-gold" />
                <span>Ver Módulos POS</span>
              </a>
            </div>
          </motion.div>
        </section>

        {/* ── 3. TARJETAS CON EFECTO GLASSMORPHISM 3D ── */}
        <section id="cards-experience" className="my-16 preserve-3d">
          <div className="text-center mb-10">
            <h3 className="font-serif text-2xl font-semibold gold-text">
              Módulos del Sistema POS
            </h3>
            <p className="label-mono text-[9px] mt-1 text-admiral-mist tracking-[0.2em]">
              Gestión y Control de Operaciones
            </p>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 preserve-3d">
            {/* Tarjeta 1: POS Terminal */}
            <Link href="/login" className="block preserve-3d">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                whileHover={{ rotateY: 10, rotateX: 5, translateZ: 15 }}
                className="card-premium p-6 bg-[#0F1B33]/50 border border-admiral-gold/12 shadow-inner-deep cursor-pointer card-3d preserve-3d rounded-2xl h-full"
              >
                <div className="w-12 h-12 mb-5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#E8C96A]/20 to-[#0F1B33] border border-admiral-gold/25 translate-z-20 filter drop-shadow-[0_0_8px_rgba(232,201,106,0.3)]">
                  <Wine className="w-6 h-6 text-admiral-gold" />
                </div>
                <h4 className="font-serif text-lg font-semibold text-admiral-ivory mb-2 translate-z-10">
                  Terminal de Venta POS
                </h4>
                <p className="text-xs text-admiral-mist font-light leading-relaxed mb-4 translate-z-10">
                  Facturación rápida, procesamiento de pagos, apertura de turno y control de caja registradora en barra con arqueos automáticos.
                </p>
                <div className="flex items-center text-[10px] uppercase font-bold tracking-wider text-admiral-gold mt-2 translate-z-10 hover:underline">
                  <span>Iniciar Terminal</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </motion.div>
            </Link>
 
            {/* Tarjeta 2: Comandas */}
            <Link href="/login" className="block preserve-3d">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ rotateY: 10, rotateX: 5, translateZ: 15 }}
                className="card-premium p-6 bg-[#0F1B33]/50 border border-admiral-gold/12 shadow-inner-deep cursor-pointer card-3d preserve-3d rounded-2xl h-full"
              >
                <div className="w-12 h-12 mb-5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#00F5D4]/20 to-[#0F1B33] border border-[#00F5D4]/25 translate-z-20 filter drop-shadow-[0_0_8px_rgba(0,245,212,0.3)]">
                  <QrCode className="w-6 h-6 text-[#00F5D4]" />
                </div>
                <h4 className="font-serif text-lg font-semibold text-admiral-ivory mb-2 translate-z-10">
                  Comandas & Servicio
                </h4>
                <p className="text-xs text-admiral-mist font-light leading-relaxed mb-4 translate-z-10">
                  Toma de comandas digitales en tiempo real directamente en las mesas y alertas automáticas al barista de barra para preparación de bebidas.
                </p>
                <div className="flex items-center text-[10px] uppercase font-bold tracking-wider text-[#00F5D4] mt-2 translate-z-10 hover:underline">
                  <span>Ver Comandas</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </motion.div>
            </Link>
 
            {/* Tarjeta 3: Control & CRM VIP */}
            <Link href="/login" className="block preserve-3d">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                whileHover={{ rotateY: 10, rotateX: 5, translateZ: 15 }}
                className="card-premium p-6 bg-[#0F1B33]/50 border border-admiral-gold/12 shadow-inner-deep cursor-pointer card-3d preserve-3d rounded-2xl h-full"
              >
                <div className="w-12 h-12 mb-5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#7B2CBF]/20 to-[#0F1B33] border border-[#7B2CBF]/25 translate-z-20 filter drop-shadow-[0_0_8px_rgba(123,44,191,0.3)]">
                  <Gem className="w-6 h-6 text-purple-400" />
                </div>
                <h4 className="font-serif text-lg font-semibold text-admiral-ivory mb-2 translate-z-10">
                  Control & CRM VIP
                </h4>
                <p className="text-xs text-admiral-mist font-light leading-relaxed mb-4 translate-z-10">
                  Administración de stock de botellas en bóveda, reportes analíticos del turno y automatizaciones CRM para los clientes del Club VIP.
                </p>
                <div className="flex items-center text-[10px] uppercase font-bold tracking-wider text-purple-400 mt-2 translate-z-10 hover:underline">
                  <span>Administración POS</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </motion.div>
            </Link>
          </div>
        </section>

        {/* ── 4. CARRUSEL DE INVENTARIO Y METRICAS DE TURNO ── */}
        <section className="my-12 p-8 rounded-2xl border border-admiral-gold/12 bg-[#0B1428]/40 backdrop-blur-md preserve-3d">
          
          {/* Cabecera de Pestañas (Tabs) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-admiral-gold/10 pb-4">
            <div className="flex gap-6">
              <button
                onClick={() => setInventoryTab('catalog')}
                className={`font-serif text-lg font-semibold transition-all duration-300 pb-2 relative ${
                  inventoryTab === 'catalog'
                    ? 'text-admiral-gold border-b-2 border-admiral-gold'
                    : 'text-admiral-mist hover:text-admiral-ivory'
                }`}
              >
                Catálogo de Botellas Activas
              </button>
              
              <button
                onClick={() => setInventoryTab('metrics')}
                className={`font-serif text-lg font-semibold transition-all duration-300 pb-2 relative flex items-center space-x-2 ${
                  inventoryTab === 'metrics'
                    ? 'text-admiral-gold border-b-2 border-admiral-gold'
                    : 'text-admiral-mist hover:text-admiral-ivory'
                }`}
              >
                <span>Métricas de Barra</span>
                {isUnlocked ? (
                  <span className="text-[8px] bg-[#00F5D4]/15 text-[#00F5D4] px-1.5 py-0.5 rounded border border-[#00F5D4]/20 uppercase tracking-widest font-sans font-bold">SOLO STAFF</span>
                ) : (
                  <Lock className="w-3.5 h-3.5 text-admiral-gold/60" />
                )}
              </button>
            </div>

            {inventoryTab === 'catalog' && (
              <div className="flex gap-2">
                {WHISKY_SELECTION.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveWhisky(i)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      activeWhisky === i 
                        ? 'bg-admiral-gold w-8 shadow-[0_0_10px_rgba(232,201,106,0.6)]' 
                        : 'bg-admiral-gold/20'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {inventoryTab === 'catalog' ? (
              // -- CATALOGO PUBLICO DE BOTELLAS --
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
              >
                {/* Información del Whisky */}
                <div>
                  <div className="flex items-center space-x-2.5 mb-3">
                    <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-admiral-gold/10 text-admiral-gold border border-admiral-gold/20">
                      {WHISKY_SELECTION[activeWhisky].rating} Rating
                    </span>
                    <span className="text-[10px] text-admiral-mist font-semibold uppercase tracking-wider">
                      {WHISKY_SELECTION[activeWhisky].type}
                    </span>
                  </div>
                  
                  <h4 className="font-serif text-2xl font-bold text-admiral-ivory mb-2">
                    {WHISKY_SELECTION[activeWhisky].name}
                  </h4>
                  
                  <p className="text-xs text-admiral-mist uppercase tracking-widest font-semibold mb-4">
                    {WHISKY_SELECTION[activeWhisky].origin}
                  </p>

                  <p className="text-sm text-admiral-cream font-light leading-relaxed mb-6">
                    {WHISKY_SELECTION[activeWhisky].desc}
                  </p>

                  <div className="text-xl font-serif text-[#00F5D4] font-semibold">
                    {WHISKY_SELECTION[activeWhisky].price}
                  </div>
                </div>

                {/* Botella Ficticia Premium / Imagen Representativa en SVG */}
                <div className="flex justify-center select-none pointer-events-none">
                  <div className="relative w-48 h-64 flex items-center justify-center">
                    {/* Destellos dorados traseros */}
                    <div className="absolute w-32 h-32 rounded-full bg-admiral-gold/5 filter blur-[40px] animate-pulse" />
                    
                    {/* Botella estilizada en vectores vectoriales */}
                    <svg className="w-full h-full filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)]" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Cuello */}
                      <path d="M42 20 H58 V40 H42 Z" fill="url(#whisky-gold-gradient)" opacity="0.8" />
                      <rect x="44" y="24" width="12" height="4" rx="1" fill="#000" opacity="0.3" />
                      
                      {/* Hombros y Cuerpo */}
                      <path d="M42 40 C30 50 25 60 25 80 V180 C25 185 30 190 35 190 H65 C70 190 75 185 75 180 V80 C75 60 70 50 58 40 Z" fill="url(#bottle-body-gradient)" opacity="0.95" stroke="url(#whisky-gold-gradient)" strokeWidth="1.5" />
                      
                      {/* Etiqueta Premium */}
                      <rect x="33" y="90" width="34" height="60" rx="4" fill="#0E172B" stroke="#E8C96A" strokeWidth="1" opacity="0.9" />
                      <rect x="35" y="92" width="30" height="56" rx="2" fill="none" stroke="#E8C96A" strokeWidth="0.5" opacity="0.5" />
                      
                      {/* Monograma AD en etiqueta */}
                      <text x="50" y="115" fill="url(#whisky-gold-gradient)" fontSize="14" fontFamily="Georgia, serif" textAnchor="middle" fontWeight="bold">AD</text>
                      <text x="50" y="130" fill="#E8DDC4" fontSize="5" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.1em" opacity="0.8">RESERVA</text>
                      <text x="50" y="138" fill="#00F5D4" fontSize="4.5" fontFamily="sans-serif" textAnchor="middle" letterSpacing="0.1em" fontWeight="bold">ADMIRAL</text>
                      
                      {/* Líquido Dorado en su interior */}
                      <path d="M27 95 V178 C27 182 30 186 35 186 H65 C70 186 73 182 73 178 V95 Z" fill="url(#whisky-liquid-gradient)" opacity="0.85" />
                      
                      {/* Gradients */}
                      <defs>
                        <linearGradient id="whisky-gold-gradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#F5DC8E" />
                          <stop offset="50%" stopColor="#D4A535" />
                          <stop offset="100%" stopColor="#8C6311" />
                        </linearGradient>
                        <linearGradient id="bottle-body-gradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#112240" />
                          <stop offset="100%" stopColor="#020C1B" />
                        </linearGradient>
                        <linearGradient id="whisky-liquid-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FFAE00" stopOpacity="0.8" />
                          <stop offset="60%" stopColor="#D4A535" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#8C5200" stopOpacity="0.95" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </motion.div>
            ) : (
              // -- METRICAS DE SEGURIDAD PARA TRABAJADORES --
              <motion.div
                key="metrics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                {!isUnlocked ? (
                  // Lock Screen de Seguridad
                  <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto preserve-3d">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#0F1B33] border border-admiral-gold/20 shadow-[0_0_15px_rgba(232,201,106,0.25)] mb-4">
                      <Lock className="w-6 h-6 text-admiral-gold animate-pulse" />
                    </div>
                    <h4 className="font-serif text-lg font-semibold text-admiral-ivory mb-2">Sección Protegida</h4>
                    <p className="text-xs text-admiral-mist leading-relaxed mb-6">
                      Ingresa el PIN de seguridad del personal staff para visualizar los reportes financieros del turno actual y el estado físico de la barra.
                    </p>
                    
                    {/* Indicadores de PIN */}
                    <div className="flex gap-3 mb-6">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                            i < pinInput.length
                              ? 'bg-admiral-gold border-admiral-gold shadow-[0_0_10px_rgba(232,201,106,0.6)]'
                              : 'bg-transparent border-admiral-gold/30'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Teclado Numérico */}
                    <div className="grid grid-cols-3 gap-2 w-full mb-4">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            if (num === '⌫') {
                              setPinInput(p => p.slice(0, -1));
                              setPinError(false);
                            } else if (num === '✓') {
                              if (pinInput === '1234' || pinInput.length >= 4) {
                                setIsUnlocked(true);
                                toast.success('Métricas de turno desbloqueadas');
                              } else {
                                setPinError(true);
                                setPinInput('');
                                toast.error('PIN incorrecto');
                              }
                            } else {
                              if (pinInput.length < 4) {
                                const next = pinInput + num;
                                setPinInput(next);
                                if (next === '1234') {
                                  setTimeout(() => {
                                    setIsUnlocked(true);
                                    toast.success('Métricas de turno desbloqueadas');
                                  }, 200);
                                }
                              }
                            }
                          }}
                          className={`h-11 rounded-xl text-sm font-semibold border flex items-center justify-center transition-all ${
                            num === '✓'
                              ? 'bg-[#E8C96A] border-[#E8C96A] text-admiral-night hover:brightness-110 font-bold'
                              : 'bg-[#0B1428]/60 border-admiral-gold/10 hover:border-admiral-gold/30 hover:bg-[#142447]/60 text-admiral-cream'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    
                    {pinError && (
                      <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider animate-pulse">PIN incorrecto. Reintente</span>
                    )}
                    
                    <button
                      onClick={() => {
                        setIsUnlocked(true);
                        toast.success('Métricas de turno desbloqueadas');
                      }}
                      className="text-[9px] text-[#00F5D4] font-semibold uppercase tracking-widest hover:underline mt-4 cursor-pointer"
                    >
                      Bypass Rápido (Auto-Desbloqueo)
                    </button>
                  </div>
                ) : (
                  // Contenido Desbloqueado del Personal (Gráficas y Ventas)
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start py-4">
                    {/* Lado Izquierdo: Barra de Progreso de Ventas */}
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="font-serif text-lg font-semibold text-admiral-ivory flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-[#00F5D4]" />
                          <span>Rendimiento de Turno</span>
                        </h4>
                        <button
                          onClick={() => {
                            setIsUnlocked(false);
                            setPinInput('');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[9px] font-bold border border-admiral-gold/15 bg-[#0B1428]/60 text-admiral-gold uppercase tracking-wider hover:border-admiral-gold/40 transition-colors"
                        >
                          🔒 Bloquear Vista
                        </button>
                      </div>

                      {/* Métricas de caja en números */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-[#0F1B33]/60 border border-admiral-gold/10">
                          <span className="text-[9px] text-admiral-mist uppercase tracking-widest font-semibold">Ventas Registradas</span>
                          <div className="text-xl font-serif text-admiral-gold font-bold mt-1">$1,450.00</div>
                          <span className="text-[8px] text-admiral-mist font-light">Corte actual de barra</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[#0F1B33]/60 border border-admiral-gold/10">
                          <span className="text-[9px] text-admiral-mist uppercase tracking-widest font-semibold">Meta de Ventas</span>
                          <div className="text-xl font-serif text-[#00F5D4] font-bold mt-1">$2,000.00</div>
                          <span className="text-[8px] text-admiral-mist font-light">Objetivo del turno</span>
                        </div>
                      </div>

                      {/* Barra de progreso de Meta Diaria */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider">
                          <span className="text-admiral-cream">Meta de Ventas Diarias</span>
                          <span className="text-[#00F5D4] font-bold">72.5%</span>
                        </div>
                        <div className="h-4 w-full bg-black/55 rounded-full overflow-hidden border border-admiral-gold/15 relative flex items-center p-0.5 shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '72.5%' }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-[#D4A535] via-[#E8C96A] to-[#00F5D4] shadow-[0_0_12px_rgba(0,245,212,0.6)]"
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-admiral-mist font-semibold">
                          <span>Tarjeta / Digital: $920.00 (63.4%)</span>
                          <span>Efectivo Caja: $530.00 (36.6%)</span>
                        </div>
                      </div>

                      {/* Alertas de Stock Crítico */}
                      <div className="p-4 rounded-xl bg-[#0B1428]/60 border border-red-500/20 space-y-2.5">
                        <div className="text-[9px] text-red-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                          <span>Alertas Críticas de Barra</span>
                        </div>
                        <div className="text-xs text-admiral-mist flex justify-between items-center">
                          <span>Lagavulin 16 (Stock Crítico)</span>
                          <span className="font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-widest text-[9px]">SOLO 25%</span>
                        </div>
                        <div className="text-xs text-admiral-mist flex justify-between items-center">
                          <span>Blue Label (Refill Recomendado)</span>
                          <span className="font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 uppercase tracking-widest text-[9px]">40% Restante</span>
                        </div>
                      </div>
                    </div>

                    {/* Lado Derecho: Gráfica de Licores Activos en Barra */}
                    <div className="space-y-6">
                      <h4 className="font-serif text-lg font-semibold text-admiral-ivory flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-admiral-gold" />
                        <span>Volumen & Niveles de Licores Activos</span>
                      </h4>

                      {/* Contenedor de Cilindros Volumétricos */}
                      <div className="grid grid-cols-4 gap-4 pt-4 pb-2">
                        {[
                          { label: 'Macallan 25', percent: 85, color: 'from-[#E8C96A] to-[#D4A535]', levelText: '17/20 oz' },
                          { label: 'Lagavulin 16', percent: 25, color: 'from-red-500 to-red-700 shadow-[0_0_8px_rgba(239,68,68,0.4)]', levelText: '5/20 oz' },
                          { label: 'Hibiki Harmony', percent: 60, color: 'from-[#00F5D4] to-[#00BBF9]', levelText: '12/20 oz' },
                          { label: 'Blue Label', percent: 40, color: 'from-yellow-500 to-yellow-600', levelText: '8/20 oz' },
                        ].map((bottle, idx) => (
                          <div key={idx} className="flex flex-col items-center space-y-3">
                            {/* Tubo de Vidrio */}
                            <div className="h-32 w-10 bg-black/60 rounded-full border border-admiral-gold/15 relative flex flex-col justify-end p-0.5 shadow-inner overflow-hidden">
                              {/* Rejilla de Medida */}
                              <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none opacity-20 text-[6px] font-mono text-admiral-cream">
                                <div className="border-t border-admiral-cream/40 w-full pl-1">80%</div>
                                <div className="border-t border-admiral-cream/40 w-full pl-1">50%</div>
                                <div className="border-t border-admiral-cream/40 w-full pl-1">20%</div>
                              </div>

                              {/* Nivel de Líquido */}
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${bottle.percent}%` }}
                                transition={{ duration: 1.2, delay: idx * 0.1, ease: 'easeOut' }}
                                className={`w-full rounded-full bg-gradient-to-t ${bottle.color} relative overflow-hidden`}
                              >
                                {/* Onda en la superficie */}
                                <div className="absolute top-0 inset-x-0 h-1 bg-white/20 animate-pulse" />
                              </motion.div>
                            </div>
                            
                            {/* Texto descriptivo */}
                            <div className="text-center">
                              <div className="text-[9px] text-admiral-cream font-bold truncate max-w-[70px]">{bottle.label}</div>
                              <div className={`text-[9px] font-extrabold mt-0.5 ${bottle.percent < 30 ? 'text-red-400' : bottle.percent < 50 ? 'text-yellow-400' : 'text-[#00F5D4]'}`}>{bottle.percent}%</div>
                              <div className="text-[7px] text-admiral-mist font-medium mt-0.5">{bottle.levelText}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-[8.5px] text-admiral-mist font-light italic leading-normal text-center">
                        Niveles de stock estimados en tiempo real basándose en comandas despachadas del POS y arqueos manuales de barra.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── FOOTER SUPERIOR / LEGAL ── */}
        <footer className="w-full mt-16 pt-8 border-t border-admiral-gold/10 text-center flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-admiral-mist font-medium tracking-wide">
            © Admiral Whisky Lounge · Exclusivo & Premium · Acceso Restringido para Menores de Edad
          </p>
          <div className="flex gap-4">
            <span className="text-[10px] text-admiral-mist font-semibold tracking-wider hover:text-admiral-gold cursor-pointer transition-colors">
              Términos
            </span>
            <span className="text-[10px] text-admiral-mist font-semibold tracking-wider hover:text-[#00F5D4] cursor-pointer transition-colors">
              Privacidad
            </span>
            <span className="text-[10px] text-admiral-mist font-semibold tracking-wider hover:text-purple-400 cursor-pointer transition-colors">
              Reservas
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
