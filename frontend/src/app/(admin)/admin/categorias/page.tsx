'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, apiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  active: boolean;
}

export default function CategoriasPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const load = () =>
    adminApi.categories
      .list()
      .then((r) => setCats(r.data))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const save = async (data: Partial<Category>) => {
    try {
      if (data.id) await adminApi.categories.update(data.id, data);
      else await adminApi.categories.create(data);
      toast.success('Categoría guardada');
      setEditing(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar categoría? Si tiene productos no se podrá borrar.')) return;
    try {
      await adminApi.categories.delete(id);
      toast.success('Eliminada');
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Categorías"
        subtitle="Organización del catálogo"
        actions={
          <button onClick={() => setEditing({})} className="btn-gold flex items-center gap-2">
            <Plus size={16} /> Nueva categoría
          </button>
        }
      />

      {loading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cats.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card-premium flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-admiral-navy/60 border border-admiral-gold/15 flex items-center justify-center text-2xl">
                {c.icon || '○'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-admiral-cream font-medium truncate">{c.name}</div>
                <div className="text-[10px] text-admiral-mist font-mono">{c.slug}</div>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setEditing(c)}
                  className="text-admiral-mist hover:text-admiral-gold"
                >
                  Editar
                </button>
                <button
                  onClick={() => remove(c.id)}
                  className="text-admiral-mist hover:text-admiral-danger"
                >
                  Borrar
                </button>
              </div>
            </motion.div>
          ))}
          {!cats.length && (
            <p className="col-span-full text-center text-admiral-mist italic py-12">
              Sin categorías
            </p>
          )}
        </div>
      )}

      <AnimatePresence>
        {editing !== null && (
          <CategoryModal
            category={editing}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryModal({
  category,
  onSave,
  onCancel,
}: {
  category: Partial<Category>;
  onSave: (d: Partial<Category>) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<any>(category);
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
        exit={{ scale: 0.94 }}
        className="card-premium w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-serif text-xl gold-text">
            {data.id ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button onClick={onCancel}>
            <X size={18} className="text-admiral-mist hover:text-admiral-gold" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label-mono mb-1.5 block">Nombre *</label>
            <input
              value={data.name || ''}
              onChange={(e) => set('name', e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>
          <div>
            <label className="label-mono mb-1.5 block">Ícono (emoji)</label>
            <input
              value={data.icon || ''}
              onChange={(e) => set('icon', e.target.value)}
              className="input-field"
              placeholder="🍹"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onCancel} className="btn-ghost">Cancelar</button>
          <button onClick={() => onSave(data)} disabled={!data.name} className="btn-gold">
            Guardar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
