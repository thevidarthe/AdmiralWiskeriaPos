'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { reportsApi, apiError } from '@/lib/api';
import { useBranchId } from '@/store/branch.store';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP } from '@/lib/utils';

export default function ReportesPage() {
  const branchId = useBranchId();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    reportsApi
      .dailyClose(branchId, date)
      .then((r) => setReport(r.data))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, [date, branchId]);

  const s = report?.summary || {};

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Reportes"
        subtitle="Cierre diario · Exportable a Excel"
        actions={
          <a
            href={reportsApi.exportDailyClose(branchId, date)}
            target="_blank"
            rel="noopener"
            className="btn-gold flex items-center gap-2"
          >
            <Download size={16} /> Exportar Excel
          </a>
        }
      />

      <div className="card-premium mb-6 flex items-center gap-4">
        <label className="label-mono">Fecha:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field max-w-xs"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Ingreso bruto" value={formatCOP(s.grossRevenue)} sub={`${s.totalSales} tickets`} />
            <KpiCard label="Ingreso neto" value={formatCOP(s.netRevenue)} sub="sin IVA" delay={0.05} />
            <KpiCard label="IVA recaudado" value={formatCOP(s.totalTax)} delay={0.1} />
            <KpiCard label="Ticket promedio" value={formatCOP(s.avgTicket)} delay={0.15} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-premium"
            >
              <h3 className="font-serif text-base text-admiral-cream mb-4">
                Top productos del día
              </h3>
              {report?.topProducts?.length ? (
                <div className="space-y-1.5">
                  {report.topProducts.map((p: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm border-b border-admiral-gold/5 last:border-0 py-2"
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
                <p className="text-admiral-mist italic text-xs py-6 text-center">Sin ventas</p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card-premium"
            >
              <h3 className="font-serif text-base text-admiral-cream mb-4">
                Pagos por método
              </h3>
              {report?.paymentByMethod && Object.keys(report.paymentByMethod).length ? (
                <div className="space-y-1.5">
                  {Object.entries(report.paymentByMethod).map(([m, d]: any) => (
                    <div
                      key={m}
                      className="flex justify-between text-sm border-b border-admiral-gold/5 last:border-0 py-2"
                    >
                      <span className="text-admiral-cream/85">{m}</span>
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
                <p className="text-admiral-mist italic text-xs py-6 text-center">Sin pagos</p>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
