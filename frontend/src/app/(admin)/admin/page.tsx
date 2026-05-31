'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { reportsApi, apiError } from '@/lib/api';
import { useBranchId } from '@/store/branch.store';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP } from '@/lib/utils';

export default function DashboardPage() {
  const branchId = useBranchId();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) return;
    const today = new Date().toISOString().split('T')[0];
    reportsApi
      .dailyClose(branchId, today)
      .then((r) => setData(r.data))
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  }, [branchId]);

  const s = data?.summary || {};

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Dashboard" subtitle="Visión general · Hoy" />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Ventas del día"
            value={formatCOP(s.grossRevenue)}
            sub={`${s.totalSales || 0} tickets`}
            delay={0.05}
          />
          <KpiCard
            label="Ticket promedio"
            value={formatCOP(s.avgTicket)}
            sub="por venta"
            delay={0.1}
          />
          <KpiCard
            label="IVA recaudado"
            value={formatCOP(s.totalTax)}
            sub="incluido en ventas"
            delay={0.15}
          />
          <KpiCard
            label="Descuentos"
            value={formatCOP(s.totalDiscount)}
            sub="happy hour + cupones"
            delay={0.2}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="card-premium"
        >
          <header className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-base text-admiral-cream">
              Top productos del día
            </h3>
            <span className="label-mono">Por ingresos</span>
          </header>
          {data?.topProducts?.length ? (
            <div className="space-y-1">
              {data.topProducts.slice(0, 6).map((p: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 text-sm border-b border-admiral-gold/5 last:border-0"
                >
                  <span className="text-admiral-cream/85">
                    <span className="text-admiral-gold/55 mr-2 font-mono">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {p.name}
                  </span>
                  <div className="text-right">
                    <div className="font-serif font-semibold gold-text">
                      {formatCOP(p.revenue)}
                    </div>
                    <div className="text-[10px] text-admiral-mist">
                      {Number(p.units).toFixed(1)} ud
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-admiral-mist italic text-xs py-6 text-center">
              Sin ventas todavía hoy
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card-premium"
        >
          <header className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-base text-admiral-cream">Métodos de pago</h3>
            <span className="label-mono">Distribución</span>
          </header>
          {data?.paymentByMethod && Object.keys(data.paymentByMethod).length ? (
            <div className="space-y-1">
              {Object.entries(data.paymentByMethod).map(([method, d]: any) => (
                <div
                  key={method}
                  className="flex items-center justify-between py-2 text-sm border-b border-admiral-gold/5 last:border-0"
                >
                  <span className="text-admiral-cream/85">{method}</span>
                  <div className="text-right">
                    <div className="font-serif font-semibold gold-text">
                      {formatCOP(d.amount)}
                    </div>
                    <div className="text-[10px] text-admiral-mist">
                      {d.count} transacciones
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-admiral-mist italic text-xs py-6 text-center">
              Sin pagos procesados
            </p>
          )}
        </motion.div>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-xl border border-admiral-danger/30 bg-admiral-danger/5 text-sm text-admiral-danger">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
