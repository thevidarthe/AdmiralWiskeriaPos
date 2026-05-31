'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { crmApi, apiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP, cn } from '@/lib/utils';

const LEVEL_COLORS: Record<string, string> = {
  CLASSIC:  'bg-admiral-bronze/40 text-admiral-mist border-admiral-bronze',
  SILVER:   'bg-admiral-parch/15 text-admiral-parch border-admiral-parch/40',
  GOLD:     'bg-admiral-gold/15 text-admiral-gold border-admiral-gold/40',
  PLATINUM: 'bg-admiral-success/15 text-admiral-success border-admiral-success/40',
};

export default function ClientesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      crmApi
        .list({ search, level, perPage: 100 })
        .then((r) => setItems(r.data.items))
        .catch((e) => toast.error(apiError(e)))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [search, level]);

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Clientes" subtitle="CRM · Niveles · Puntos · Historial" />

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-admiral-mist" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email…"
            className="input-field pl-9"
          />
        </div>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-field w-48">
          <option value="">Todos los niveles</option>
          <option value="CLASSIC">Classic</option>
          <option value="SILVER">Silver</option>
          <option value="GOLD">Gold</option>
          <option value="PLATINUM">Platinum</option>
        </select>
      </div>

      {loading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="card-premium !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-admiral-gold/12 bg-admiral-navy/30">
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-admiral-gold/65 font-serif">
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Teléfono</th>
                <th className="px-5 py-3 text-center">Nivel</th>
                <th className="px-5 py-3 text-right">Puntos</th>
                <th className="px-5 py-3 text-right">Total gastado</th>
                <th className="px-5 py-3 text-right">Visitas</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-admiral-gold/5 last:border-0 hover:bg-admiral-navy-3/15"
                >
                  <td className="px-5 py-3 text-admiral-cream font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-admiral-parch/80 font-mono text-xs">{c.phone}</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-wider font-serif px-2 py-0.5 rounded-md border',
                        LEVEL_COLORS[c.loyaltyLevel] || LEVEL_COLORS.CLASSIC,
                      )}
                    >
                      {c.loyaltyLevel}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-admiral-gold font-serif font-semibold">
                    {c.pointsBalance.toLocaleString('es-CO')}
                  </td>
                  <td className="px-5 py-3 text-right text-admiral-parch font-serif">
                    {formatCOP(c.totalSpent)}
                  </td>
                  <td className="px-5 py-3 text-right text-admiral-mist text-xs">{c.visitCount}</td>
                </motion.tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-admiral-mist italic">
                    Sin clientes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
