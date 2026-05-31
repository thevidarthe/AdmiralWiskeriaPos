'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Wine, Clock } from 'lucide-react';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/Skeleton';
import { posApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useBranchId } from '@/store/branch.store';
import { formatCOP, cn } from '@/lib/utils';

export default function MeseroPage() {
  return (
    <AuthGuard allow={['ADMIN', 'MANAGER', 'WAITER']}>
      <MeseroScreen />
    </AuthGuard>
  );
}

function MeseroScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const branchId = useBranchId();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!branchId) return;
    posApi
      .listOpen(branchId)
      .then((r) => setSales(r.data))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!branchId) return;
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [branchId]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 px-5 flex items-center gap-3 border-b border-admiral-gold/12 glass-strong sticky top-0 z-10">
        <Logo size={36} />
        <div className="flex-1">
          <h1 className="font-serif text-base gold-text leading-none">Panel Mesero</h1>
          <p className="text-[10px] text-admiral-mist">{user?.name}</p>
        </div>
        <button
          onClick={() => router.push('/mesero/asistencia')}
          className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-admiral-gold border border-admiral-gold/25 hover:bg-admiral-gold/10 transition-all flex items-center gap-1.5"
        >
          <Clock size={12} />
          <span>Asistencia</span>
        </button>
        <button
          onClick={() => { logout(); router.replace('/login'); }}
          className="btn-ghost !py-1.5"
        >
          Salir
        </button>
      </header>

      <main className="flex-1 p-5">
        <h2 className="font-serif text-xl gold-text mb-4">Mesas activas</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-16">
            <Wine size={48} className="text-admiral-gold/40 mx-auto mb-3" />
            <p className="text-admiral-mist">No hay ventas abiertas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sales.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-premium"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-serif text-lg gold-text">
                      {s.table ? `Mesa ${s.table.number}` : s.name || 'Para llevar'}
                    </div>
                    {s.table?.zone && (
                      <div className="text-[10px] text-admiral-mist uppercase tracking-wider mt-0.5">
                        {s.table.zone.name}
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded',
                      s.status === 'OPEN'
                        ? 'bg-admiral-success/15 text-admiral-success'
                        : 'bg-admiral-warn/15 text-admiral-warn',
                    )}
                  >
                    {s.status === 'OPEN' ? 'Abierta' : 'Por pagar'}
                  </span>
                </div>

                {s.customer && (
                  <div className="text-xs text-admiral-parch mb-2">👤 {s.customer.name}</div>
                )}

                <div className="text-sm text-admiral-cream/80 mb-3">
                  {s.items?.length || 0} ítems
                </div>

                <div className="flex justify-between items-baseline pt-3 border-t border-admiral-gold/10">
                  <span className="flex items-center gap-1 text-[11px] text-admiral-mist">
                    <Clock size={11} />
                    {new Date(s.openedAt).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="font-serif text-lg font-semibold gold-text">
                    {formatCOP(
                      s.items?.reduce((sum: number, it: any) => sum + Number(it.lineTotal), 0) ||
                        0,
                    )}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
