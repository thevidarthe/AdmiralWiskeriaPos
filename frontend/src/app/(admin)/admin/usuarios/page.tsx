'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, X, KeyRound } from 'lucide-react';
import { adminApi, apiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'ADMIN' | 'MANAGER' | 'BARISTA' | 'WAITER' | 'CASHIER';
  active: boolean;
  lastLoginAt?: string;
}

const ROLES = ['ADMIN', 'MANAGER', 'BARISTA', 'WAITER', 'CASHIER'] as const;

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<User> & { password?: string; pin?: string } | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);

  const load = () =>
    adminApi.users
      .list()
      .then((r) => setUsers(r.data.data || []))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const save = async (data: any) => {
    try {
      if (data.id) await adminApi.users.update(data.id, data);
      else await adminApi.users.create(data);
      toast.success(data.id ? 'Usuario actualizado' : 'Usuario creado');
      setEditing(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const resetPin = async (id: string, pin: string) => {
    try {
      await adminApi.users.resetPin(id, pin);
      toast.success('PIN restablecido');
      setResetting(null);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const deactivate = async (id: string) => {
    if (!confirm('¿Desactivar este usuario?')) return;
    try {
      await adminApi.users.deactivate(id);
      toast.success('Desactivado');
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Usuarios"
        subtitle="Staff · Roles · Acceso"
        actions={
          <button
            onClick={() => setEditing({ role: 'WAITER' })}
            className="btn-gold flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo usuario
          </button>
        }
      />

      {loading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="card-premium !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-admiral-gold/12 bg-admiral-navy/30">
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-admiral-gold/65 font-serif">
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-admiral-gold/5 last:border-0 hover:bg-admiral-navy-3/15"
                >
                  <td className="px-5 py-3 text-admiral-cream font-medium">{u.name}</td>
                  <td className="px-5 py-3 text-admiral-parch/80 text-xs font-mono">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="text-[10px] uppercase tracking-wider font-serif px-2 py-0.5 rounded border border-admiral-gold/25 text-admiral-gold/85">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded',
                        u.active
                          ? 'bg-admiral-success/15 text-admiral-success'
                          : 'bg-admiral-bronze/40 text-admiral-mist',
                      )}
                    >
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-3 text-xs">
                    <button
                      onClick={() => setResetting(u)}
                      className="text-admiral-mist hover:text-admiral-gold inline-flex items-center gap-1"
                    >
                      <KeyRound size={12} /> PIN
                    </button>
                    <button
                      onClick={() => setEditing(u)}
                      className="text-admiral-mist hover:text-admiral-gold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deactivate(u.id)}
                      className="text-admiral-mist hover:text-admiral-danger"
                    >
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {editing !== null && (
          <UserModal user={editing} onSave={save} onCancel={() => setEditing(null)} />
        )}
        {resetting && (
          <ResetPinModal
            user={resetting}
            onSave={(pin) => resetPin(resetting.id, pin)}
            onCancel={() => setResetting(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UserModal({
  user,
  onSave,
  onCancel,
}: {
  user: any;
  onSave: (d: any) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<any>(user);
  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.94 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.94 }}
        className="card-premium w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-serif text-xl gold-text">
            {data.id ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onCancel}>
            <X size={18} className="text-admiral-mist hover:text-admiral-gold" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label-mono mb-1.5 block">Nombre</label>
            <input value={data.name || ''} onChange={(e) => set('name', e.target.value)} className="input-field" autoFocus />
          </div>
          <div>
            <label className="label-mono mb-1.5 block">Email</label>
            <input
              value={data.email || ''}
              onChange={(e) => set('email', e.target.value)}
              className="input-field font-mono text-sm"
              disabled={!!data.id}
            />
          </div>
          <div>
            <label className="label-mono mb-1.5 block">Rol</label>
            <select value={data.role} onChange={(e) => set('role', e.target.value)} className="input-field">
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {!data.id && (
            <>
              <div>
                <label className="label-mono mb-1.5 block">Contraseña</label>
                <input
                  type="password"
                  value={data.password || ''}
                  onChange={(e) => set('password', e.target.value)}
                  className="input-field"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <label className="label-mono mb-1.5 block">PIN (4 dígitos)</label>
                <input
                  value={data.pin || ''}
                  onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="input-field font-mono"
                  maxLength={4}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="btn-ghost">Cancelar</button>
          <button onClick={() => onSave(data)} className="btn-gold">Guardar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ResetPinModal({
  user,
  onSave,
  onCancel,
}: {
  user: User;
  onSave: (pin: string) => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState('');
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.94 }}
        animate={{ scale: 1 }}
        className="card-premium w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-xl gold-text mb-1">Restablecer PIN</h2>
        <p className="text-xs text-admiral-mist mb-4">{user.name} · {user.email}</p>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="input-field text-center text-2xl font-mono tracking-[0.4em]"
          maxLength={4}
          placeholder="• • • •"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="btn-ghost">Cancelar</button>
          <button
            onClick={() => onSave(pin)}
            disabled={pin.length !== 4}
            className="btn-gold"
          >
            Aplicar nuevo PIN
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
