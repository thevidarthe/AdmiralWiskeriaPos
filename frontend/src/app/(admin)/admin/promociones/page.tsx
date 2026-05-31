'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import { api, apiError, promoApi } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface PromoRule {
  id: string;
  name: string;
  description?: string;
  type: string;
  discountValue: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek: number[];
  stackable: boolean;
  active: boolean;
}

const DAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export default function PromocionesPage() {
  const [promos, setPromos] = useState<PromoRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    promoApi
      .active()
      .then((r) => setPromos(r.data))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Promociones"
        subtitle="Happy hours · Combos · Descuentos · Niveles de lealtad"
      />

      {loading ? (
        <Skeleton className="h-32" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-premium"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-admiral-gold/10 flex items-center justify-center">
                  <Sparkles size={18} className="text-admiral-gold" />
                </div>
                <span
                  className={cn(
                    'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md',
                    p.active
                      ? 'bg-admiral-success/15 text-admiral-success'
                      : 'bg-admiral-bronze/40 text-admiral-mist',
                  )}
                >
                  {p.active ? 'Activa' : 'Pausada'}
                </span>
              </div>
              <h3 className="font-serif text-base text-admiral-cream mb-1">{p.name}</h3>
              <p className="text-xs text-admiral-mist mb-3">{p.description}</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-serif font-semibold gold-text">
                  {p.discountValue}%
                </span>
                <span className="text-[10px] text-admiral-mist uppercase tracking-wider">
                  descuento
                </span>
              </div>
              {p.startTime && p.endTime && (
                <div className="text-xs text-admiral-parch">
                  ⏱ {p.startTime} — {p.endTime}
                </div>
              )}
              {p.daysOfWeek?.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {DAYS.map((d, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        'w-6 h-6 rounded text-[10px] font-mono flex items-center justify-center',
                        p.daysOfWeek.includes(idx)
                          ? 'bg-admiral-gold/15 text-admiral-gold border border-admiral-gold/30'
                          : 'border border-admiral-gold/10 text-admiral-mist/50',
                      )}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
          {promos.length === 0 && (
            <p className="col-span-full text-center text-admiral-mist italic py-12">
              No hay promociones activas configuradas
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-admiral-mist mt-8">
        Las promociones se aplican automáticamente al calcular el carrito en el POS.
        El editor de reglas se agregará en la próxima versión; por ahora, gestiona vía API o seed.
      </p>
    </div>
  );
}
