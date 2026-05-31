'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Minus, Trash2, X, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/Skeleton';
import { menuApi, posApi, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useBranchId } from '@/store/branch.store';
import { usePosStore, type CartLine } from '@/store/pos.store';
import { formatCOP, cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(
  () => import('@/components/ui/BarcodeScanner'),
  { ssr: false }
);


export default function PosPage() {
  return (
    <AuthGuard allow={['ADMIN', 'MANAGER', 'BARISTA', 'CASHIER']}>
      <PosScreen />
    </AuthGuard>
  );
}

function PosScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const branchId = useBranchId();
  const { cart, addToCart, setQuantity, removeFromCart, clearCart, cartTotal } =
    usePosStore();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleBarcodeScan = useCallback((code: string) => {
    const product = products.find(
      (p) =>
        p.barcode === code ||
        p.sku === code ||
        p.id === code ||
        p.sku?.toLowerCase() === code.toLowerCase()
    );

    if (product) {
      addToCart({
        productId: product.id,
        productName: product.name,
        unitPrice: Number(product.basePrice),
        quantity: 1,
      });
      toast.success(`Añadido: ${product.name}`);
      
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } catch (e) {
        // Fallback silencioso
      }
      setShowScanner(false);
    } else {
      toast.error(`Producto no encontrado: ${code}`);
    }
  }, [products, addToCart]);

  useEffect(() => {
    Promise.all([menuApi.categories(), menuApi.products({ branchId })])
      .then(([c, p]) => {
        setCategories(c.data);
        setProducts(p.data);
      })
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, [branchId]);

  const filtered = products.filter((p) => {
    if (activeCat !== 'all' && p.category?.slug !== activeCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return p.available;
  });

  const total = cartTotal();

  const handlePay = async (method: string, reference?: string) => {
    if (!cart.length) return;
    if (['TRANSFER', 'NEQUI', 'DAVIPLATA', 'PSE'].includes(method) && !reference?.trim()) {
      toast.error('Se requiere referencia para el método seleccionado');
      return;
    }
    try {
      // 1. Abrir venta
      const { data: sale } = await posApi.open({ branchId, source: 'POS' });

      // 2. Agregar items
      await posApi.addItems(sale.id, {
        lines: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      });

      // 3. Cobrar
      const { data: final } = await posApi.close(sale.id, {
        payments: [{ method, amount: total, reference }],
      });

      toast.success(`Venta cobrada: ${formatCOP(final.grandTotal)}`);
      clearCart();
      setPaying(false);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="flex h-screen bg-admiral-night">
      {/* ── Catálogo (izquierda) ── */}
      <section className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 px-5 flex items-center gap-3 border-b border-admiral-gold/12 glass-strong">
          <Logo size={36} />
          <div className="flex-1">
            <h1 className="font-serif text-base gold-text leading-none">Admiral POS</h1>
            <p className="text-[10px] text-admiral-mist">{user?.name} · {user?.role}</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            className="input-field !py-1.5 max-w-xs"
          />
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-1.5 rounded-xl border border-[#00F5D4]/20 hover:border-[#00F5D4]/60 bg-[#0B1428]/40 hover:bg-[#00F5D4]/10 text-[#00F5D4] transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Escanear Código de Barras / QR"
          >
            <span className="text-sm">📷</span> Escanear
          </button>
          <button
            onClick={() => { logout(); router.replace('/login'); }}
            className="btn-ghost !py-1.5"
          >
            Salir
          </button>
        </header>

        <div className="px-5 py-3 flex gap-2 overflow-x-auto border-b border-admiral-gold/8">
          <CatPill
            label="Todos"
            active={activeCat === 'all'}
            onClick={() => setActiveCat('all')}
          />
          {categories.map((c) => (
            <CatPill
              key={c.id}
              label={c.name}
              icon={c.icon}
              active={activeCat === c.slug}
              onClick={() => setActiveCat(c.slug)}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence>
                {filtered.map((p, i) => (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.015, duration: 0.3 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() =>
                      addToCart({
                        productId: p.id,
                        productName: p.name,
                        unitPrice: Number(p.basePrice),
                        quantity: 1,
                      })
                    }
                    className="card-premium !p-4 text-left hover:border-admiral-gold/40 transition-all group"
                  >
                    <div className="text-[10px] text-admiral-gold/55 uppercase tracking-wider mb-1 font-serif">
                      {p.category?.name}
                    </div>
                    <div className="text-admiral-cream font-medium leading-tight mb-2 group-hover:text-admiral-gold transition-colors">
                      {p.name}
                    </div>
                    <div className="font-serif text-lg font-semibold gold-text">
                      {formatCOP(p.basePrice)}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
              {!filtered.length && (
                <p className="col-span-full text-center text-admiral-mist italic py-12">
                  Sin productos
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Carrito (derecha) ── */}
      <aside className="w-96 flex flex-col glass-strong border-l border-admiral-gold/12">
        <header className="h-16 px-5 flex items-center justify-between border-b border-admiral-gold/12">
          <h2 className="font-serif text-base gold-text">Carrito</h2>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-admiral-mist hover:text-admiral-danger flex items-center gap-1.5"
            >
              <Trash2 size={12} /> Vaciar
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-admiral-mist italic mt-12 text-sm"
              >
                Selecciona productos del catálogo
              </motion.div>
            ) : (
              cart.map((line, i) => (
                <CartLineRow
                  key={line.productId}
                  line={line}
                  onIncrement={() => setQuantity(i, line.quantity + 1)}
                  onDecrement={() => setQuantity(i, line.quantity - 1)}
                  onRemove={() => removeFromCart(i)}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-admiral-gold/12 p-5 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="label-mono">Total</span>
            <span className="font-serif text-3xl font-bold gold-text">{formatCOP(total)}</span>
          </div>
          <button
            disabled={!cart.length}
            onClick={() => setPaying(true)}
            className="btn-gold w-full flex items-center justify-center gap-2 !py-3.5"
          >
            <CreditCard size={18} /> Cobrar
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {paying && (
          <PaymentModal
            total={total}
            onPay={handlePay}
            onCancel={() => setPaying(false)}
          />
        )}
        {showScanner && (
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CatPill({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all flex items-center gap-1.5',
        active
          ? 'bg-admiral-gold/15 text-admiral-gold border-admiral-gold/40'
          : 'border-admiral-gold/12 text-admiral-mist hover:border-admiral-gold/30 hover:text-admiral-gold',
      )}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}

function CartLineRow({
  line,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  line: CartLine;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 py-3 border-b border-admiral-gold/5 last:border-0"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm text-admiral-cream truncate">{line.productName}</div>
        <div className="text-[10px] text-admiral-mist mt-0.5">
          {formatCOP(line.unitPrice)} c/u
        </div>
      </div>
      <div className="flex items-center gap-1 bg-admiral-navy/40 rounded-lg px-1 py-1">
        <button onClick={onDecrement} className="w-6 h-6 rounded text-admiral-gold hover:bg-admiral-gold/15">
          <Minus size={12} className="mx-auto" />
        </button>
        <span className="w-6 text-center text-sm font-medium text-admiral-cream">
          {line.quantity}
        </span>
        <button onClick={onIncrement} className="w-6 h-6 rounded text-admiral-gold hover:bg-admiral-gold/15">
          <Plus size={12} className="mx-auto" />
        </button>
      </div>
      <div className="font-serif text-sm font-semibold gold-text w-20 text-right">
        {formatCOP(line.unitPrice * line.quantity)}
      </div>
      <button onClick={onRemove} className="text-admiral-mist hover:text-admiral-danger">
        <X size={14} />
      </button>
    </motion.div>
  );
}

const METHODS = [
  { id: 'CASH', label: 'Efectivo', icon: '💵' },
  { id: 'CARD', label: 'Tarjeta', icon: '💳' },
  { id: 'NEQUI', label: 'Nequi', icon: '📱' },
  { id: 'DAVIPLATA', label: 'Daviplata', icon: '📲' },
  { id: 'TRANSFER', label: 'Transferencia', icon: '🏦' },
  { id: 'PSE', label: 'PSE', icon: '🏧' },
] as const;

function PaymentModal({
  total,
  onPay,
  onCancel,
}: {
  total: number;
  onPay: (method: string, reference?: string) => void;
  onCancel: () => void;
}) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [reference, setReference] = useState('');

  const requiresReference = ['TRANSFER', 'NEQUI', 'DAVIPLATA', 'PSE'].includes(selectedMethod);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="card-premium w-full max-w-md text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="label-mono mb-2">Total a cobrar</p>
        <p className="font-serif text-5xl gold-text font-bold mb-6">{formatCOP(total)}</p>
        <p className="label-mono mb-3">Método de pago</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMethod(m.id)}
              className={cn(
                'p-4 rounded-xl border transition-all active:scale-95',
                selectedMethod === m.id
                  ? 'border-admiral-gold bg-admiral-gold/10'
                  : 'border-admiral-gold/15 bg-admiral-navy/40 hover:border-admiral-gold/40 hover:bg-admiral-gold/5',
              )}
            >
              <div className="text-2xl mb-1">{m.icon}</div>
              <div className="text-sm text-admiral-cream font-medium">{m.label}</div>
            </button>
          ))}
        </div>
        {requiresReference && (
          <div className="mb-4 text-left">
            <label className="label-mono block mb-2 text-sm text-admiral-cream">
              Referencia de pago
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Código o referencia"
              className="input-field w-full"
            />
            <p className="text-[10px] text-admiral-mist mt-2">
              Para transferencias/Mobile Money se requiere el número de operación o referencia.
            </p>
          </div>
        )}
        <button
          onClick={() => onPay(selectedMethod, reference)}
          disabled={!selectedMethod || (requiresReference && !reference.trim())}
          className="btn-gold w-full flex items-center justify-center gap-2 !py-3.5 disabled:opacity-50"
        >
          Pagar
        </button>
        <button onClick={onCancel} className="btn-ghost w-full mt-3">
          Cancelar
        </button>
      </motion.div>
    </motion.div>
  );
}
