'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ROLE_ROUTES, useAuthStore } from '@/store/auth.store';
import { authApi, apiError } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

interface LoginableUser {
  id: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'BARISTA' | 'WAITER' | 'CASHIER';
  avatarUrl?: string;
}

const ROLE_LABELS: Record<string, { icon: string; label: string; color: string; glow: string }> = {
  ADMIN:   { icon: '👑', label: 'Administrador', color: 'from-[#FFD700] to-[#FFA500]', glow: 'shadow-[#FFD700]/30' },
  MANAGER: { icon: '💼', label: 'Manager', color: 'from-[#00F5D4] to-[#00BBF9]', glow: 'shadow-[#00F5D4]/30' },
  BARISTA: { icon: '☕', label: 'Barista', color: 'from-[#FF007F] to-[#7B2CBF]', glow: 'shadow-[#FF007F]/30' },
  WAITER:  { icon: '🍽️', label: 'Mesero', color: 'from-[#38B000] to-[#007200]', glow: 'shadow-[#38B000]/30' },
  CASHIER: { icon: '💵', label: 'Cajero', color: 'from-[#FF9F1C] to-[#FF5400]', glow: 'shadow-[#FF9F1C]/30' },
};

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPin, isAuthenticated, user, loading } = useAuthStore();

  const [users, setUsers] = useState<LoginableUser[]>([]);
  const [selected, setSelected] = useState<LoginableUser | null>(null);
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'pick' | 'pin'>('pick');

  // Si ya está logueado, redirigir a su panel
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(ROLE_ROUTES[user.role] || '/admin');
    }
  }, [isAuthenticated, user, router]);

  // Cargar usuarios disponibles
  useEffect(() => {
    authApi
      .listUsers()
      .then((r) => setUsers(r.data))
      .catch((e) => toast.error(apiError(e)));
  }, []);

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4 || !selected) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) submit(next);
  };

  const submit = async (fullPin: string) => {
    if (!selected) return;
    try {
      const u = await loginWithPin(selected.id, fullPin);
      toast.success(`Bienvenido, ${u.name}`);
      router.replace(ROLE_ROUTES[u.role] || '/admin');
    } catch (e) {
      toast.error(apiError(e) || 'PIN incorrecto');
      setPin('');
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6 overflow-hidden bg-[#070D1C] perspective-1000">
      {/* ── Fondo de Malla de Luces de Neón en Movimiento 3D ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 40, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-[#E8C96A]/10 rounded-full blur-[120px] neon-glow-gold"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] bg-[#00F5D4]/10 rounded-full blur-[140px] neon-glow-cyan"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 30, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
          className="absolute top-[35%] right-[5%] w-[400px] h-[400px] bg-[#7B2CBF]/10 rounded-full blur-[110px] neon-glow-purple"
        />
      </div>

      {/* ── Encabezado Principal ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center z-10 select-none preserve-3d"
      >
        <motion.div
          whileHover={{ scale: 1.1, rotateY: 15 }}
          className="cursor-pointer mb-5 p-3 rounded-2xl bg-gradient-to-br from-[#0F1B33] to-[#142447] border border-admiral-gold/20 shadow-lg preserve-3d"
        >
          <Logo size={64} className="drop-shadow-[0_0_15px_rgba(232,201,106,0.5)] translate-z-20" />
        </motion.div>
        <h1 className="font-serif text-4xl text-center bg-gradient-to-r from-[#F5DC8E] via-[#E8C96A] to-[#D4A535] bg-clip-text text-transparent font-semibold mb-2 tracking-wide drop-shadow-[0_2px_10px_rgba(232,201,106,0.2)]">
          Admiral Whiskería
        </h1>
        <p className="label-mono mb-10 text-[11px] font-semibold text-admiral-mist tracking-[0.25em]">
          Sistema Premium de Automatización · v2.0
        </p>
      </motion.div>

      {/* ── Tarjeta de Login Principal con Movimiento 3D ── */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10 card-premium p-8 bg-[#0F1B33]/65 border border-admiral-gold/15 shadow-inner-deep card-3d preserve-3d"
      >
        <AnimatePresence mode="wait">
          {step === 'pick' && (
            <motion.div
              key="pick"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="preserve-3d"
            >
              <h2 className="label-mono mb-6 text-center text-xs tracking-wider translate-z-10">
                Selecciona tu usuario de acceso
              </h2>
              
              <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1 preserve-3d">
                {users.map((u) => {
                  const meta = ROLE_LABELS[u.role];
                  const active = selected?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelected(u);
                        setStep('pin');
                        setPin('');
                      }}
                      className={cn(
                        'p-4 rounded-2xl text-center select-none preserve-3d card-3d',
                        'border bg-[#0B1428]/60 backdrop-blur-md',
                        active
                          ? 'border-admiral-gold bg-admiral-gold/10'
                          : 'border-admiral-gold/10 hover:border-admiral-gold/45',
                      )}
                    >
                      {/* Icono Flotante en 3D */}
                      <div className="text-3xl mb-3 translate-z-20 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
                        {meta?.icon || '👤'}
                      </div>
                      
                      {/* Nombre y Rol */}
                      <div className="text-xs font-semibold text-admiral-cream truncate translate-z-10">
                        {u.name}
                      </div>
                      <div className="text-[10px] text-admiral-mist font-medium mt-1 uppercase tracking-wider translate-z-10">
                        {meta?.label || u.role}
                      </div>

                      {/* Pequeña barra brillante en la base */}
                      <div className={cn(
                        "w-8 h-1 mx-auto mt-3 rounded-full bg-gradient-to-r transition-all duration-300 opacity-60",
                        meta?.color || 'from-admiral-gold to-admiral-gold-2'
                      )} />
                    </button>
                  );
                })}

                {users.length === 0 && (
                  <p className="col-span-2 text-center text-admiral-mist italic text-xs py-10">
                    Cargando equipo de Admiral...
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {step === 'pin' && selected && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="preserve-3d"
            >
              {/* Encabezado del Usuario Seleccionado */}
              <div className="text-center mb-6 preserve-3d">
                <div className="text-4xl mb-2 translate-z-30 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)] animate-bounce">
                  {ROLE_LABELS[selected.role]?.icon}
                </div>
                <h3 className="text-base text-admiral-ivory font-semibold translate-z-20">
                  {selected.name}
                </h3>
                <button
                  onClick={() => {
                    setStep('pick');
                    setPin('');
                  }}
                  className="text-[10px] text-admiral-mist hover:text-admiral-gold font-semibold uppercase tracking-wider mt-2 transition-colors translate-z-10"
                >
                  ← Cambiar usuario
                </button>
              </div>

              {/* Indicadores de PIN */}
              <div className="flex justify-center gap-4 mb-6 translate-z-20">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: i < pin.length ? [1, 1.3, 1] : 1,
                      boxShadow: i < pin.length
                        ? '0 0 15px rgba(232, 201, 106, 0.7), 0 0 30px rgba(0, 245, 212, 0.4)'
                        : '0 0 0px rgba(0, 0, 0, 0)',
                    }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      'w-4 h-4 rounded-full transition-all duration-300',
                      i < pin.length
                        ? 'bg-gradient-to-r from-admiral-gold to-[#00F5D4] border border-admiral-gold'
                        : 'bg-transparent border border-admiral-bronze/70',
                    )}
                  />
                ))}
              </div>

              {/* Teclado Numérico Tactil 3D */}
              <div className="grid grid-cols-3 gap-3 preserve-3d translate-z-10">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '→'].map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      if (k === '⌫') setPin((p) => p.slice(0, -1));
                      else if (k === '→') {
                        if (pin.length === 4) submit(pin);
                      } else handlePinDigit(k);
                    }}
                    disabled={loading}
                    className={cn(
                      'h-14 rounded-2xl text-lg font-semibold transition-all preserve-3d btn-3d-glow select-none',
                      k === '→'
                        ? 'bg-gradient-to-r from-[#E8C96A] via-[#00F5D4] to-[#7B2CBF] text-admiral-night font-bold shadow-lg shadow-admiral-gold/15'
                        : k === '⌫'
                        ? 'border border-admiral-gold/15 text-admiral-mist hover:text-admiral-gold hover:border-admiral-gold/40 bg-[#0B1428]/40'
                        : 'border border-admiral-gold/10 bg-[#0B1428]/60 text-admiral-cream hover:border-admiral-gold/30 hover:bg-[#142447]/60',
                    )}
                  >
                    {loading && k === '→' ? (
                      <span className="flex items-center justify-center space-x-1">
                        <span className="w-1.5 h-1.5 bg-admiral-night rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-admiral-night rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-admiral-night rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    ) : k}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Pie de Página ── */}
      <p className="text-[10px] text-admiral-mist font-medium tracking-wide mt-8 text-center max-w-sm z-10 select-none opacity-80">
        © Admiral Whiskería 2026 · Personal Autorizado · Premium POS
      </p>
    </main>
  );
}
