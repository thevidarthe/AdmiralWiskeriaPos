'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { qrApi, apiError } from '@/lib/api';
import { useBranchId } from '@/store/branch.store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

export default function QrAdminPage() {
  const branchId = useBranchId();
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(() => {
    if (!branchId) return;
    qrApi
      .list(branchId)
      .then((r) => setCodes(r.data))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerateAll = async () => {
    if (!branchId) return;
    setGenerating(true);
    try {
      await qrApi.generateAll(branchId);
      toast.success('Códigos QR de mesas generados con éxito');
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <PageHeader
          title="QR de Mesas"
          subtitle="Códigos para que los clientes accedan al menú desde el celular"
        />
        {branchId && codes.length > 0 && (
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-admiral-night bg-gradient-to-r from-[#F5DC8E] via-[#E8C96A] to-[#D4A535] shadow-[0_4px_15px_-3px_rgba(232,201,106,0.3)] hover:brightness-110 active:scale-95 transition-all btn-3d-glow"
          >
            {generating ? 'Generando...' : 'Regenerar Todos los QR'}
          </button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {codes.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card-premium text-center"
            >
              <div className="bg-white p-3 rounded-xl mb-3 flex items-center justify-center aspect-square overflow-hidden shadow-inner border border-admiral-gold/10">
                {c.svgData ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.svgData} alt="QR" className="w-full h-auto object-contain" />
                ) : (
                  <div className="aspect-square flex items-center justify-center text-admiral-mist text-xs">
                    Sin QR
                  </div>
                )}
              </div>
              <div className="font-serif text-base gold-text font-semibold">Mesa {c.table?.number}</div>
              <div className="text-[9px] text-admiral-mist font-semibold uppercase tracking-wider mt-1 truncate" title={c.token}>
                {c.table?.zone?.name || 'Zona'}
              </div>
              <div className="text-[8px] text-admiral-mist/50 font-mono mt-0.5 truncate" title={c.token}>
                Token: {c.token.slice(0, 8)}…
              </div>
            </motion.div>
          ))}
          {!codes.length && (
            <div className="col-span-full text-center py-16 card-premium bg-[#0F1B33]/40 border border-admiral-gold/10 flex flex-col items-center justify-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#E8C96A]/10 border border-[#E8C96A]/20 text-admiral-gold text-xl mb-4">
                📊
              </div>
              <h3 className="font-serif text-lg font-semibold text-admiral-ivory mb-2">No hay Códigos QR</h3>
              <p className="text-xs text-admiral-mist leading-relaxed mb-6">
                No se han generado códigos QR para las mesas de esta sucursal. Haz clic a continuación para crearlos automáticamente para todas las mesas activas.
              </p>
              <button
                onClick={handleGenerateAll}
                disabled={generating}
                className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-admiral-night bg-gradient-to-r from-[#F5DC8E] via-[#E8C96A] to-[#D4A535] shadow-lg hover:brightness-110 active:scale-[0.98] transition-all btn-3d-glow"
              >
                {generating ? 'Generando Códigos...' : 'Generar Códigos QR Ahora'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
