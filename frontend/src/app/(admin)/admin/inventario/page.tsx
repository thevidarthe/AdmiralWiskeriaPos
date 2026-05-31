'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Upload, AlertTriangle, Search, Download } from 'lucide-react';
import { adminApi, apiError } from '@/lib/api';
import { useBranchId } from '@/store/branch.store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP, cn, formatDateTime } from '@/lib/utils';

type Tab = 'stock' | 'low' | 'value' | 'import';

export default function InventarioPage() {
  const branchId = useBranchId();
  const [tab, setTab] = useState<Tab>('stock');
  const [stock, setStock] = useState<any[]>([]);
  const [low, setLow] = useState<any[]>([]);
  const [value, setValue] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    const fetcher = {
      stock: () => adminApi.inventory.stock(branchId).then((r) => setStock(r.data)),
      low: () => adminApi.inventory.lowStock(branchId).then((r) => setLow(r.data)),
      value: () => adminApi.inventory.value(branchId).then((r) => setValue(r.data)),
      import: async () => {},
    };
    fetcher[tab]().catch((e) => toast.error(apiError(e))).finally(() => setLoading(false));
  }, [tab, branchId]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const r = await adminApi.import.products(file, branchId);
      setImportResult(r.data);
      toast.success(`${r.data.created} creados · ${r.data.updated} actualizados`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const tabs: { id: Tab; label: string; count?: number; alert?: boolean }[] = [
    { id: 'stock', label: 'Stock actual', count: stock.length },
    { id: 'low', label: 'Stock bajo', count: low.length, alert: low.length > 0 },
    { id: 'value', label: 'Valor inventario' },
    { id: 'import', label: 'Importar Excel' },
  ];

  const filtered = (arr: any[]) =>
    arr.filter((r) => !search || r.productName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Inventario" subtitle="Stock · Compras · Mermas · Ajustes" />

      <div className="flex gap-1 mb-6 border-b border-admiral-gold/12">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-sm transition-all flex items-center gap-2 relative',
              tab === t.id
                ? 'text-admiral-gold'
                : 'text-admiral-mist hover:text-admiral-gold',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full',
                  t.alert
                    ? 'bg-admiral-danger/20 text-admiral-danger'
                    : 'bg-admiral-navy-3/40 text-admiral-mist',
                )}
              >
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <motion.div
                layoutId="tabline"
                className="absolute -bottom-px inset-x-0 h-0.5 bg-admiral-gold"
              />
            )}
          </button>
        ))}
      </div>

      {(tab === 'stock' || tab === 'low') && (
        <div className="relative mb-4 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-admiral-mist" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            className="input-field pl-9"
          />
        </div>
      )}

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          {tab === 'stock' && <StockTable items={filtered(stock)} />}
          {tab === 'low' && (
            <>
              {low.length === 0 ? (
                <p className="text-center py-12 text-admiral-success">
                  ✓ Todos los productos están por encima del mínimo
                </p>
              ) : (
                <>
                  <div className="rounded-xl border border-admiral-danger/30 bg-admiral-danger/5 p-3 mb-4 text-admiral-danger text-sm flex items-center gap-2">
                    <AlertTriangle size={16} /> {low.length} producto(s) con stock bajo el mínimo
                  </div>
                  <StockTable items={filtered(low)} lowMode />
                </>
              )}
            </>
          )}
          {tab === 'value' && <ValueTable rows={value} />}
          {tab === 'import' && (
            <div className="max-w-2xl card-premium">
              <h3 className="font-serif text-lg gold-text mb-2">Importar productos desde Excel</h3>
              <p className="text-sm text-admiral-parch mb-4 leading-relaxed">
                Sube un Excel con tus productos. Las categorías se crean automáticamente si no
                existen. Si un producto ya existe (mismo SKU o nombre), se actualiza.
              </p>
              <a
                href={adminApi.import.templateURL}
                target="_blank"
                rel="noopener"
                className="btn-ghost inline-flex items-center gap-2 mb-4"
              >
                <Download size={14} /> Descargar plantilla
              </a>
              <label
                htmlFor="file-import"
                className="block border-2 border-dashed border-admiral-gold/25 rounded-xl p-8 text-center hover:border-admiral-gold/50 transition-colors cursor-pointer"
              >
                <Upload size={32} className="mx-auto text-admiral-gold mb-2" />
                <div className="text-admiral-gold font-medium mb-1">Arrastra tu Excel aquí</div>
                <div className="text-xs text-admiral-mist">o haz clic para seleccionar</div>
                <input
                  ref={fileRef}
                  id="file-import"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              {importResult && (
                <div className="mt-4 p-4 rounded-xl bg-admiral-navy/60 border border-admiral-gold/20 text-sm space-y-1">
                  <div className="font-semibold text-admiral-gold mb-2">Resultado:</div>
                  <div className="text-admiral-parch">✓ {importResult.created} creados</div>
                  <div className="text-admiral-parch">↻ {importResult.updated} actualizados</div>
                  <div className="text-admiral-parch">
                    📁 {importResult.categoriesCreated} categorías nuevas
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="text-admiral-danger pt-2">
                      ⚠ {importResult.errors.length} errores
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StockTable({ items, lowMode }: { items: any[]; lowMode?: boolean }) {
  return (
    <div className="card-premium !p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-admiral-gold/12 bg-admiral-navy/30">
          <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-admiral-gold/65 font-serif">
            <th className="px-5 py-3">Producto</th>
            <th className="px-5 py-3">Categoría</th>
            <th className="px-5 py-3 text-right">Stock</th>
            <th className="px-5 py-3 text-right">Mínimo</th>
            <th className="px-5 py-3">Último movimiento</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => (
            <tr
              key={i}
              className={cn(
                'border-b border-admiral-gold/5 last:border-0',
                s.lowStock && 'bg-admiral-danger/5',
              )}
            >
              <td className="px-5 py-3">
                <div className="text-admiral-cream font-medium">{s.productName}</div>
                {s.sku && (
                  <div className="text-[10px] text-admiral-mist font-mono mt-0.5">{s.sku}</div>
                )}
              </td>
              <td className="px-5 py-3 text-admiral-parch/80 text-xs">{s.categoryName}</td>
              <td
                className={cn(
                  'px-5 py-3 text-right font-serif font-semibold text-base',
                  s.lowStock ? 'text-admiral-danger' : 'text-admiral-gold',
                )}
              >
                {Number(s.quantity).toLocaleString('es-CO')}
              </td>
              <td className="px-5 py-3 text-right text-admiral-parch/60 text-xs">
                {s.minStock || '—'}
              </td>
              <td className="px-5 py-3 text-admiral-parch/60 text-xs">
                {s.updatedAt ? formatDateTime(s.updatedAt) : '—'}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-12 text-admiral-mist italic">
                Sin movimientos de inventario
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ValueTable({ rows }: { rows: any[] }) {
  return (
    <div className="card-premium !p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-admiral-gold/12 bg-admiral-navy/30">
          <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-admiral-gold/65 font-serif">
            <th className="px-5 py-3">Categoría</th>
            <th className="px-5 py-3 text-right">Productos</th>
            <th className="px-5 py-3 text-right">Valor en costo</th>
            <th className="px-5 py-3 text-right">Valor en venta</th>
            <th className="px-5 py-3 text-right">Margen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-admiral-gold/5 last:border-0">
              <td className="px-5 py-3 text-admiral-cream">{r.category}</td>
              <td className="px-5 py-3 text-right text-admiral-parch">{r.productCount}</td>
              <td className="px-5 py-3 text-right text-admiral-parch font-serif">
                {formatCOP(r.totalCostValue)}
              </td>
              <td className="px-5 py-3 text-right font-serif font-semibold gold-text">
                {formatCOP(r.totalSaleValue)}
              </td>
              <td className="px-5 py-3 text-right font-serif text-admiral-success">
                {formatCOP(r.totalSaleValue - r.totalCostValue)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-12 text-admiral-mist italic">
                Sin datos
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
