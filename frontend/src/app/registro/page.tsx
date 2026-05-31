'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  User, 
  Phone, 
  Mail, 
  Crown, 
  Sparkles, 
  Gem, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { apiBaseURL } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';

export default function PublicRegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseURL}/crm/public/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: 'admiral',
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Error en el registro');
      }

      setSuccessData(data);
      toast.success('¡Registro completado con éxito!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'No se pudo completar el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6 overflow-hidden bg-[#040814] text-admiral-cream perspective-1000">
      
      {/* ── Fondo de Orbes de Neón en Movimiento 3D ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-[#E8C96A]/10 rounded-full blur-[110px] neon-glow-gold"
        />
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-[#00F5D4]/10 rounded-full blur-[130px] neon-glow-cyan"
        />
      </div>

      <div className="w-full max-w-md z-10 flex flex-col items-center preserve-3d">
        
        {/* Logo Superior */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 preserve-3d"
        >
          <Logo size={128} glow={true} interactive={true} className="filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.65)]" />
        </motion.div>

        {/* Tarjeta de Formulario o Éxito */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full card-premium p-8 bg-[#0F1B33]/65 border border-admiral-gold/15 shadow-inner-deep card-3d preserve-3d rounded-2xl"
        >
          <AnimatePresence mode="wait">
            {!successData ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="preserve-3d"
              >
                <div className="text-center mb-6 preserve-3d">
                  <h1 className="font-serif text-2xl font-semibold bg-gradient-to-r from-admiral-ivory via-admiral-cream to-admiral-gold bg-clip-text text-transparent mb-1.5 translate-z-10">
                    Únete al Club VIP
                  </h1>
                  <p className="text-xs text-admiral-mist font-light translate-z-10">
                    Registra tus datos y acumula puntos de lealtad exclusivos en cada visita a Admiral.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 preserve-3d translate-z-10">
                  {/* Campo Nombre */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-admiral-gold flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Nombre Completo</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field bg-[#0B1428]/50 border-admiral-gold/15 focus:border-admiral-gold/45 text-admiral-cream placeholder-admiral-mist/50 rounded-xl px-4 py-3"
                    />
                  </div>

                  {/* Campo Teléfono */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-admiral-gold flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>Número de Teléfono</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. 3001234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input-field bg-[#0B1428]/50 border-admiral-gold/15 focus:border-admiral-gold/45 text-admiral-cream placeholder-admiral-mist/50 rounded-xl px-4 py-3"
                    />
                  </div>

                  {/* Campo Correo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-admiral-gold flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>Correo Electrónico (Opcional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Ej. juan@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field bg-[#0B1428]/50 border-admiral-gold/15 focus:border-admiral-gold/45 text-admiral-cream placeholder-admiral-mist/50 rounded-xl px-4 py-3"
                    />
                  </div>

                  {/* Botón Guardar */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 h-13 rounded-xl font-semibold text-sm uppercase tracking-wider text-admiral-night bg-gradient-to-r from-[#F5DC8E] via-[#E8C96A] to-[#D4A535] shadow-[0_4px_20px_-4px_rgba(232,201,106,0.4)] hover:brightness-110 active:scale-[0.98] transition-all duration-300 btn-3d-glow"
                  >
                    {loading ? (
                      <span>Registrando...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-admiral-night animate-spin" style={{ animationDuration: '4s' }} />
                        <span>Obtener Membresía VIP</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center py-4 preserve-3d"
              >
                <div className="flex justify-center mb-4 translate-z-20">
                  <motion.div
                    initial={{ scale: 0.5, rotate: -20 }}
                    animate={{ scale: [1, 1.15, 1], rotate: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#E8C96A]/20 to-[#0F1B33] border border-admiral-gold/30 filter drop-shadow-[0_0_15px_rgba(232,201,106,0.4)]"
                  >
                    <Crown className="w-8 h-8 text-admiral-gold" />
                  </motion.div>
                </div>

                <h2 className="font-serif text-2xl font-bold bg-gradient-to-r from-[#F5DC8E] to-[#D4A535] bg-clip-text text-transparent mb-1.5 translate-z-20">
                  ¡Ya eres Miembro VIP!
                </h2>
                
                <p className="text-xs text-admiral-cream font-medium tracking-wide translate-z-10 mb-6">
                  Felicidades, <span className="text-[#00F5D4] font-semibold">{successData.name}</span>. Tu membresía ha sido activada en Admiral Whisky Bar.
                </p>

                {/* Resumen de Lealtad */}
                <div className="p-4 rounded-xl border border-admiral-gold/10 bg-[#0B1428]/60 max-w-xs mx-auto space-y-3 mb-6 translate-z-10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-admiral-mist uppercase tracking-wider font-semibold">Nivel de Lealtad</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#00F5D4]/15 text-[#00F5D4] border border-[#00F5D4]/30 uppercase tracking-widest">
                      {successData.loyaltyLevel || 'CLASSIC'}
                    </span>
                  </div>
                  <div className="h-px bg-admiral-gold/10" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-admiral-mist uppercase tracking-wider font-semibold">Puntos Iniciales</span>
                    <span className="text-admiral-gold font-bold">{successData.pointsBalance || 0} pts</span>
                  </div>
                </div>

                <p className="text-[10px] text-admiral-mist max-w-xs mx-auto leading-relaxed translate-z-10 mb-6">
                  Presenta tu número de teléfono registrado al realizar tus órdenes para acumular 1 punto por cada $100 pesos de consumo y ascender a las categorías SILVER, GOLD y PLATINUM.
                </p>

                <button
                  onClick={() => {
                    setName('');
                    setPhone('');
                    setEmail('');
                    setSuccessData(null);
                  }}
                  className="inline-flex items-center space-x-1.5 text-[10px] uppercase font-bold tracking-widest text-[#00F5D4] hover:underline"
                >
                  <span>Registrar otro miembro</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <p className="text-[9px] text-admiral-mist font-medium tracking-wide mt-8 text-center max-w-sm z-10 select-none opacity-85">
        Admiral Whisky Bar · Membresías VIP de Lealtad y Club
      </p>
    </main>
  );
}
