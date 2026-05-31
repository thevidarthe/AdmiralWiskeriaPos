'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Search, Download, X } from 'lucide-react';
import { adminApi, apiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP, cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  basePrice: number;
  costPrice?: number;
  unit: string;
  available: boolean;
  trackInventory: boolean;
  imageUrl?: string;
  categoryId: string;
  category?: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, perPage: 200 };
      if (filter !== 'all') params.categoryId = filter;
      if (search) params.search = search;
      const [p, c] = await Promise.all([
        adminApi.products.list(params),
        adminApi.categories.list(),
      ]);
      setProducts(p.data.items);
      setCategories(c.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const save = async (data: Partial<Product>) => {
    try {
      if (data.id) {
        await adminApi.products.update(data.id, data);
        toast.success('Producto actualizado');
      } else {
        await adminApi.products.create(data);
        toast.success('Producto creado');
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const toggle = async (id: string) => {
    try {
      await adminApi.products.toggle(id);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este producto? Si tiene ventas se desactivará en su lugar.'))
      return;
    try {
      await adminApi.products.delete(id);
      toast.success('Eliminado');
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Productos"
        subtitle="Catálogo · Precios · Disponibilidad"
        actions={
          <>
            <a
              href={adminApi.import.templateURL}
              target="_blank"
              rel="noopener"
              className="btn-ghost flex items-center gap-2"
            >
              <Download size={14} /> Plantilla
            </a>
            <button onClick={() => setEditing({})} className="btn-gold flex items-center gap-2">
              <Plus size={16} /> Nuevo producto
            </button>
          </>
        }
      />

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-admiral-mist"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, SKU o código de barras…"
            className="input-field pl-9"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field w-56"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <div className="card-premium !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-admiral-gold/12 bg-admiral-navy/30">
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-admiral-gold/65 font-serif">
                <th className="px-5 py-3.5">Producto</th>
                <th className="px-5 py-3.5">Categoría</th>
                <th className="px-5 py-3.5 text-right">Precio</th>
                <th className="px-5 py-3.5 text-right">Costo</th>
                <th className="px-5 py-3.5 text-center">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {products.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.015 }}
                    className="border-b border-admiral-gold/5 last:border-0 hover:bg-admiral-navy-3/15 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="text-admiral-cream font-medium">{p.name}</div>
                      {p.sku && (
                        <div className="text-[10px] text-admiral-mist font-mono mt-0.5">
                          {p.sku}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-admiral-parch/80 text-xs">
                      {p.category?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-serif text-admiral-gold font-semibold">
                      {formatCOP(p.basePrice)}
                    </td>
                    <td className="px-5 py-3 text-right text-admiral-parch/60 text-xs">
                      {p.costPrice ? formatCOP(p.costPrice) : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => toggle(p.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-serif border transition-all',
                          p.available
                            ? 'bg-admiral-success/10 text-admiral-success border-admiral-success/30'
                            : 'bg-admiral-bronze/40 text-admiral-mist border-admiral-bronze',
                        )}
                      >
                        {p.available ? 'Disponible' : 'Oculto'}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setEditing(p)}
                        className="text-admiral-mist hover:text-admiral-gold text-xs mr-4 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="text-admiral-mist hover:text-admiral-danger text-xs transition-colors"
                      >
                        Borrar
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {!products.length && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-admiral-mist italic text-sm">
                    No hay productos. Crea el primero o importa desde Excel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {editing !== null && (
          <ProductFormModal
            product={editing}
            categories={categories}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductFormModal({
  product,
  categories,
  onSave,
  onCancel,
}: {
  product: Partial<Product>;
  categories: Category[];
  onSave: (d: Partial<Product>) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<any>({
    ...product,
    available: product.available ?? true,
    trackInventory: product.trackInventory ?? true,
    unit: product.unit ?? 'UNIT',
  });
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
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="card-premium w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl gold-text">
            {data.id ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 text-admiral-mist hover:text-admiral-gold transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nombre *">
            <input
              value={data.name || ''}
              onChange={(e) => set('name', e.target.value)}
              className="input-field"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría *">
              <select
                value={data.categoryId || ''}
                onChange={(e) => set('categoryId', e.target.value)}
                className="input-field"
              >
                <option value="">Seleccionar…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="SKU">
              <input
                value={data.sku || ''}
                onChange={(e) => set('sku', e.target.value)}
                className="input-field font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio venta *">
              <input
                type="number"
                value={data.basePrice || ''}
                onChange={(e) => set('basePrice', parseFloat(e.target.value))}
                className="input-field"
              />
            </Field>
            <Field label="Costo">
              <input
                type="number"
                value={data.costPrice || ''}
                onChange={(e) => set('costPrice', parseFloat(e.target.value))}
                className="input-field"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unidad">
              <select
                value={data.unit}
                onChange={(e) => set('unit', e.target.value)}
                className="input-field"
              >
                <option value="UNIT">Unidad</option>
                <option value="BOTTLE">Botella</option>
                <option value="GLASS">Copa</option>
                <option value="SHOT">Shot</option>
                <option value="ML">ML</option>
                <option value="OZ">Onza</option>
              </select>
            </Field>
            <Field label="Stock mínimo">
              <input
                type="number"
                value={data.minStock || ''}
                onChange={(e) => set('minStock', parseFloat(e.target.value))}
                className="input-field"
                placeholder="5"
              />
            </Field>
          </div>

          <Field label="Descripción">
            <textarea
              value={data.description || ''}
              onChange={(e) => set('description', e.target.value)}
              className="input-field min-h-[64px]"
              rows={3}
            />
          </Field>

          <div className="flex gap-5 pt-1">
            <label className="flex items-center gap-2 text-sm text-admiral-parch cursor-pointer">
              <input
                type="checkbox"
                checked={data.available}
                onChange={(e) => set('available', e.target.checked)}
                className="w-4 h-4 accent-admiral-gold"
              />
              Disponible
            </label>
            <label className="flex items-center gap-2 text-sm text-admiral-parch cursor-pointer">
              <input
                type="checkbox"
                checked={data.trackInventory}
                onChange={(e) => set('trackInventory', e.target.checked)}
                className="w-4 h-4 accent-admiral-gold"
              />
              Controlar inventario
            </label>
          </div>
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <button onClick={onCancel} className="btn-ghost">
            Cancelar
          </button>
          <button
            onClick={() => onSave(data)}
            disabled={!data.name || !data.basePrice || !data.categoryId}
            className="btn-gold"
          >
            Guardar producto
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-mono mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
