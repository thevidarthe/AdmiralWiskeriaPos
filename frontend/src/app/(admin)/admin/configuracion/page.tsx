'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ConfiguracionPage() {
  const { user, logout } = useAuthStore();
  const [pwd, setPwd] = useState({ current: '', next: '' });
  const [pin, setPin] = useState({ current: '', next: '' });

  const changePassword = async () => {
    try {
      await api.put('/auth/me/password', {
        currentPassword: pwd.current,
        newPassword: pwd.next,
      });
      toast.success('Contraseña actualizada. Por favor vuelve a iniciar sesión.');
      setTimeout(logout, 1500);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const changePin = async () => {
    try {
      await api.put('/auth/me/pin', {
        currentPassword: pin.current,
        newPin: pin.next,
      });
      toast.success('PIN actualizado');
      setPin({ current: '', next: '' });
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="Configuración" subtitle="Mi cuenta · Seguridad" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium mb-5"
      >
        <h2 className="font-serif text-lg text-admiral-cream mb-3">Mi perfil</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Nombre" value={user?.name || '—'} />
          <Field label="Email" value={user?.email || '—'} />
          <Field label="Rol" value={user?.role || '—'} />
          <Field label="ID" value={user?.id?.slice(0, 8) + '…'} mono />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card-premium mb-5"
      >
        <h2 className="font-serif text-lg text-admiral-cream mb-3">Cambiar contraseña</h2>
        <div className="space-y-3 max-w-md">
          <input
            type="password"
            placeholder="Contraseña actual"
            value={pwd.current}
            onChange={(e) => setPwd((s) => ({ ...s, current: e.target.value }))}
            className="input-field"
          />
          <input
            type="password"
            placeholder="Nueva contraseña (8+ chars)"
            value={pwd.next}
            onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))}
            className="input-field"
          />
          <button
            onClick={changePassword}
            disabled={pwd.current.length < 6 || pwd.next.length < 8}
            className="btn-gold"
          >
            Actualizar contraseña
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-premium"
      >
        <h2 className="font-serif text-lg text-admiral-cream mb-3">Cambiar PIN</h2>
        <div className="space-y-3 max-w-md">
          <input
            type="password"
            placeholder="Contraseña actual"
            value={pin.current}
            onChange={(e) => setPin((s) => ({ ...s, current: e.target.value }))}
            className="input-field"
          />
          <input
            inputMode="numeric"
            maxLength={4}
            placeholder="Nuevo PIN (4 dígitos)"
            value={pin.next}
            onChange={(e) =>
              setPin((s) => ({ ...s, next: e.target.value.replace(/\D/g, '').slice(0, 4) }))
            }
            className="input-field font-mono text-center text-xl tracking-[0.4em]"
          />
          <button
            onClick={changePin}
            disabled={pin.current.length < 6 || pin.next.length !== 4}
            className="btn-gold"
          >
            Actualizar PIN
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="label-mono mb-1">{label}</div>
      <div className={`text-admiral-cream ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
    </div>
  );
}
