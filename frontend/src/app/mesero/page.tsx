'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Wine, 
  Clock, 
  PlusCircle, 
  X, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Search, 
  User, 
  Utensils, 
  ChevronRight 
} from 'lucide-react';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/Skeleton';
import { posApi, menuApi, qrApi, apiError } from '@/lib/api';
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

  // Estados principales
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Catálogo cargado para agregar items
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [qrs, setQrs] = useState<any[]>([]);

  // Estados de modales
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'consumption' | 'add'>('consumption');

  // Estados del modal de Nueva Mesa
  const [selectedTableId, setSelectedTableId] = useState('');
  const [clientName, setClientName] = useState('');
  const [creating, setCreating] = useState(false);

  // Estados del modal de agregar items
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{ productId: string; productName: string; unitPrice: number; quantity: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Carga de ventas activas
  const loadSales = useCallback(() => {
    if (!branchId) return;
    posApi
      .listOpen(branchId)
      .then((r) => setSales(r.data))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, [branchId]);

  // Carga datos complementarios para los modales
  const loadData = useCallback(() => {
    if (!branchId) return;
    Promise.all([
      menuApi.categories(),
      menuApi.products({ branchId }),
      qrApi.list(branchId)
    ])
      .then(([c, p, q]) => {
        setCategories(c.data);
        setProducts(p.data);
        setQrs(q.data);
      })
      .catch((e) => console.error('Error cargando catálogo:', e));
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    loadSales();
    loadData();
    const interval = setInterval(loadSales, 8000);
    return () => clearInterval(interval);
  }, [branchId, loadSales, loadData]);

  // Filtrar mesas vacías/disponibles (mesas creadas en QR que no tienen venta OPEN o PENDING)
  const occupiedTableIds = sales
    .filter((s) => s.status === 'OPEN' || s.status === 'PENDING_PAYMENT')
    .map((s) => s.tableId)
    .filter(Boolean);

  const availableTables = qrs
    .map((q) => q.table)
    .filter((t) => t && !occupiedTableIds.includes(t.id));

  // Abrir nueva mesa/comanda
  const handleOpenTable = async () => {
    if (!branchId) return;
    if (!selectedTableId && !clientName.trim()) {
      toast.error('Selecciona una mesa o escribe el nombre del cliente');
      return;
    }
    setCreating(true);
    try {
      const data = {
        branchId,
        tableId: selectedTableId || undefined,
        name: clientName.trim() || undefined,
        source: 'WAITER'
      };
      const res = await posApi.open(data);
      toast.success('Mesa abierta correctamente');
      setIsNewOrderOpen(false);
      setSelectedTableId('');
      setClientName('');
      loadSales();
      // Abrir inmediatamente modal de edición para esta venta recién creada
      setSelectedSale(res.data);
      setActiveTab('add');
      setCart([]);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setCreating(false);
    }
  };

  // Modificar cantidades del carrito local
  const addToLocalCart = (prod: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === prod.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: prod.id, productName: prod.name, unitPrice: Number(prod.basePrice), quantity: 1 }];
    });
    toast.success(`${prod.name} añadido`);
  };

  const changeLocalQuantity = (productId: string, diff: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.quantity + diff;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  // Enviar pedido al backend
  const handleSubmitOrder = async () => {
    if (!selectedSale || cart.length === 0) return;
    setSubmitting(true);
    try {
      const lines = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
      await posApi.addItems(selectedSale.id, { lines });
      toast.success('Pedido enviado correctamente');
      setCart([]);
      setSelectedSale(null);
      loadSales();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrar catálogo de productos
  const filteredProducts = products.filter((p) => {
    if (activeCategory !== 'all' && p.category?.slug !== activeCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return p.available;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#040814] text-admiral-cream">
      {/* HEADER */}
      <header className="h-16 px-5 flex items-center gap-3 border-b border-admiral-gold/12 glass-strong sticky top-0 z-10">
        <Logo size={36} />
        <div className="flex-1">
          <h1 className="font-serif text-base gold-text leading-none font-semibold">Panel Mesero</h1>
          <p className="text-[10px] text-admiral-mist font-mono mt-0.5 tracking-wider uppercase">{user?.name}</p>
        </div>

        <button
          onClick={() => setIsNewOrderOpen(true)}
          className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-admiral-night bg-gradient-to-r from-[#F5DC8E] to-[#D4A535] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
        >
          <PlusCircle size={12} />
          <span>Abrir Mesa</span>
        </button>

        <button
          onClick={() => router.push('/mesero/asistencia')}
          className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-admiral-gold border border-admiral-gold/25 hover:bg-admiral-gold/10 transition-all flex items-center gap-1"
        >
          <Clock size={12} />
          <span>Asistencia</span>
        </button>
        <button
          onClick={() => {
            logout();
            router.replace('/login');
          }}
          className="btn-ghost !py-1.5 !px-3 text-xs"
        >
          Salir
        </button>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-5 max-w-7xl mx-auto w-full">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-serif text-2xl gold-text font-bold">Comandas Activas</h2>
            <p className="text-[10px] text-admiral-mist uppercase tracking-widest mt-0.5">Control de barra y mesas en vivo</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-admiral-gold/5 border border-admiral-gold/10 text-admiral-gold">
            {sales.length} activas
          </span>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-24 card-premium border border-admiral-gold/10 max-w-md mx-auto">
            <Wine size={48} className="text-admiral-gold/40 mx-auto mb-4 animate-bounce" />
            <h3 className="font-serif text-lg text-admiral-cream mb-2 font-medium">No hay mesas abiertas</h3>
            <p className="text-xs text-admiral-mist max-w-xs mx-auto leading-relaxed mb-6">
              {"Todos los clientes están atendidos o no se han registrado órdenes aún. Haz clic en \"Abrir Mesa\" arriba para comenzar una."}
            </p>
            <button
              onClick={() => setIsNewOrderOpen(true)}
              className="btn-gold !py-2.5 !px-6 text-xs"
            >
              Abrir Primera Mesa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sales.map((s, i) => {
              const totalItems = s.items?.reduce((sum: number, it: any) => sum + Number(it.quantity), 0) || 0;
              const totalCost = s.items?.reduce((sum: number, it: any) => sum + Number(it.lineTotal), 0) || 0;

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => {
                    setSelectedSale(s);
                    setActiveTab('consumption');
                    setCart([]);
                  }}
                  className="card-premium cursor-pointer hover:border-admiral-gold/40 hover:scale-[1.01] transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={16} className="text-admiral-gold" />
                  </div>

                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-serif text-lg gold-text font-semibold">
                        {s.table ? `Mesa ${s.table.number}` : s.name || 'Para llevar'}
                      </div>
                      {s.table?.zone && (
                        <div className="text-[10px] text-admiral-mist uppercase tracking-widest mt-0.5">
                          {s.table.zone.name}
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md',
                        s.status === 'OPEN'
                          ? 'bg-admiral-success/15 text-admiral-success border border-admiral-success/20'
                          : 'bg-admiral-warn/15 text-admiral-warn border border-admiral-warn/20',
                      )}
                    >
                      {s.status === 'OPEN' ? 'Abierta' : 'Por pagar'}
                    </span>
                  </div>

                  {s.customer && (
                    <div className="text-xs text-admiral-parch mb-3 flex items-center gap-1">
                      <span className="text-admiral-gold/60">👤</span> {s.customer.name}
                    </div>
                  )}

                  <div className="text-xs text-admiral-parch mb-4">
                    {totalItems === 0 ? 'Sin consumos cargados' : `${totalItems} productos en comanda`}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-admiral-gold/10">
                    <span className="flex items-center gap-1 text-[10px] text-admiral-mist font-mono">
                      <Clock size={11} />
                      {new Date(s.openedAt).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="font-serif text-base font-bold gold-text">
                      {formatCOP(totalCost)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: ABRIR NUEVA MESA */}
      <AnimatePresence>
        {isNewOrderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card-premium max-w-md w-full p-6 relative overflow-hidden"
            >
              <header className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="font-serif text-lg gold-text font-bold">Abrir Mesa / Comanda</h3>
                  <p className="text-[9px] text-admiral-mist uppercase tracking-widest mt-0.5">Asignar mesa o registrar barra</p>
                </div>
                <button
                  onClick={() => setIsNewOrderOpen(false)}
                  className="p-1 rounded-lg border border-admiral-gold/10 hover:border-admiral-gold/30 text-admiral-mist"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="space-y-4">
                {/* Seleccionar Mesa */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-admiral-gold">
                    Seleccionar Mesa Física
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => {
                      setSelectedTableId(e.target.value);
                      if (e.target.value) setClientName(''); // borrar nombre si es mesa física
                    }}
                    className="input-field bg-[#0B1428]/60 border-admiral-gold/15"
                  >
                    <option value="">-- Sin mesa (Barra / Para llevar) --</option>
                    {availableTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Mesa {t.number} ({t.zone?.name || 'Salón'}) - Cap: {t.capacity}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Opcional: Nombre del cliente o Barra */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-admiral-gold">
                    Opcional: Nombre del Cliente / Barra
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cliente Barra 3, Carlos Medina..."
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (e.target.value) setSelectedTableId(''); // borrar mesa si escribe nombre manual
                    }}
                    className="input-field bg-[#0B1428]/60 border-admiral-gold/15"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-4">
                  <button
                    onClick={() => setIsNewOrderOpen(false)}
                    className="btn-ghost !py-3 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleOpenTable}
                    disabled={creating || (!selectedTableId && !clientName.trim())}
                    className="btn-gold !py-3 text-xs font-semibold"
                  >
                    {creating ? 'Abriendo...' : 'Abrir Comanda'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADMINISTRAR PEDIDO / DETALLES DE MESA */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="card-premium max-w-4xl w-full h-[90vh] flex flex-col p-6 relative overflow-hidden"
            >
              <header className="flex justify-between items-start mb-4 border-b border-admiral-gold/10 pb-4">
                <div>
                  <h3 className="font-serif text-xl gold-text font-bold">
                    {selectedSale.table ? `Mesa ${selectedSale.table.number}` : selectedSale.name || 'Comanda Barra'}
                  </h3>
                  <div className="flex gap-2 items-center text-[10px] text-admiral-mist uppercase mt-0.5 tracking-wider font-mono">
                    <span>{selectedSale.table?.zone?.name || 'Barra'}</span>
                    <span>•</span>
                    <span>Apertura: {new Date(selectedSale.openedAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-1 rounded-lg border border-admiral-gold/10 hover:border-admiral-gold/30 text-admiral-mist"
                >
                  <X size={18} />
                </button>
              </header>

              {/* TABS SELECTOR */}
              <div className="flex gap-1 border-b border-admiral-gold/10 mb-4">
                <button
                  onClick={() => setActiveTab('consumption')}
                  className={cn(
                    'px-4 py-2 text-xs font-bold uppercase tracking-wider relative',
                    activeTab === 'consumption' ? 'text-admiral-gold' : 'text-admiral-mist hover:text-admiral-gold'
                  )}
                >
                  Consumo Actual ({selectedSale.items?.length || 0})
                  {activeTab === 'consumption' && (
                    <motion.div layoutId="tab-line" className="absolute -bottom-px inset-x-0 h-0.5 bg-admiral-gold" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('add')}
                  className={cn(
                    'px-4 py-2 text-xs font-bold uppercase tracking-wider relative flex items-center gap-1.5',
                    activeTab === 'add' ? 'text-admiral-gold' : 'text-admiral-mist hover:text-admiral-gold'
                  )}
                >
                  Agregar Productos
                  {cart.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-admiral-gold text-admiral-night font-mono font-bold text-[9px] flex items-center justify-center animate-pulse">
                      {cart.reduce((s, c) => s + c.quantity, 0)}
                    </span>
                  )}
                  {activeTab === 'add' && (
                    <motion.div layoutId="tab-line" className="absolute -bottom-px inset-x-0 h-0.5 bg-admiral-gold" />
                  )}
                </button>
              </div>

              {/* CONTENIDO TAB 1: CONSUMO ACTUAL */}
              {activeTab === 'consumption' && (
                <div className="flex-1 overflow-y-auto pr-1">
                  {selectedSale.items && selectedSale.items.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 text-[9px] uppercase tracking-wider font-mono text-admiral-gold/70 py-1.5 border-b border-admiral-gold/10 mb-1 px-3">
                        <span className="col-span-2">Producto</span>
                        <span className="text-center">Cant.</span>
                        <span className="text-right">Total</span>
                      </div>
                      {selectedSale.items.map((it: any) => (
                        <div
                          key={it.id}
                          className="grid grid-cols-4 items-center text-sm py-2 px-3 bg-[#0B1428]/45 border border-admiral-gold/5 rounded-xl hover:border-admiral-gold/15 transition-all"
                        >
                          <div className="col-span-2">
                            <div className="text-admiral-cream font-medium">{it.productName}</div>
                            <div className="text-[10px] text-admiral-mist font-mono mt-0.5">
                              {formatCOP(Number(it.unitPrice))} ud
                            </div>
                          </div>
                          <div className="text-center font-mono font-semibold text-admiral-gold">
                            {Number(it.quantity).toFixed(0)}
                          </div>
                          <div className="text-right font-serif font-bold text-admiral-cream">
                            {formatCOP(Number(it.lineTotal))}
                          </div>
                        </div>
                      ))}

                      {/* RESUMEN DETALLADO */}
                      <div className="mt-6 pt-4 border-t border-admiral-gold/15 space-y-2 max-w-sm ml-auto text-xs px-3">
                        <div className="flex justify-between">
                          <span className="text-admiral-mist">Subtotal:</span>
                          <span className="font-mono">{formatCOP(Number(selectedSale.subtotal))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-admiral-mist">Impuestos (IVA 19%):</span>
                          <span className="font-mono">{formatCOP(Number(selectedSale.taxTotal))}</span>
                        </div>
                        {Number(selectedSale.discountTotal) > 0 && (
                          <div className="flex justify-between text-admiral-success">
                            <span>Descuentos aplicados:</span>
                            <span className="font-mono">-{formatCOP(Number(selectedSale.discountTotal))}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-2 border-t border-admiral-gold/10 text-sm font-semibold">
                          <span className="gold-text">Gran Total:</span>
                          <span className="font-serif text-lg gold-text font-bold">
                            {formatCOP(Number(selectedSale.grandTotal))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 flex flex-col items-center justify-center">
                      <Utensils size={36} className="text-admiral-gold/30 mb-3" />
                      <p className="text-sm text-admiral-mist italic">Sin productos registrados en la comanda aún</p>
                      <button
                        onClick={() => setActiveTab('add')}
                        className="btn-gold !py-2 !px-4 text-[10px] font-bold uppercase tracking-wider mt-4"
                      >
                        Añadir primer producto
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CONTENIDO TAB 2: AGREGAR PRODUCTOS */}
              {activeTab === 'add' && (
                <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
                  {/* Izquierda: Catálogo de productos */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex gap-2 mb-3">
                      {/* Búsqueda */}
                      <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-admiral-mist" />
                        <input
                          type="text"
                          placeholder="Buscar producto..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="input-field !py-2 pl-8 text-xs bg-[#0B1428]/60 border-admiral-gold/15"
                        />
                      </div>
                    </div>

                    {/* Selector de Categorías (Pills) */}
                    <div className="flex gap-1 overflow-x-auto pb-2 mb-3 scrollbar-thin">
                      <button
                        onClick={() => setActiveCategory('all')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border',
                          activeCategory === 'all'
                            ? 'bg-admiral-gold text-admiral-night border-admiral-gold'
                            : 'bg-admiral-gold/5 text-admiral-mist border-admiral-gold/15 hover:border-admiral-gold/40'
                        )}
                      >
                        Todos
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveCategory(c.slug)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1',
                            activeCategory === c.slug
                              ? 'bg-admiral-gold text-admiral-night border-admiral-gold'
                              : 'bg-admiral-gold/5 text-admiral-mist border-admiral-gold/15 hover:border-admiral-gold/40'
                          )}
                        >
                          <span>{c.icon}</span>
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Grid de productos */}
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pr-1">
                      {filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => addToLocalCart(p)}
                          className="p-3 bg-[#0B1428]/45 border border-admiral-gold/10 hover:border-admiral-gold/40 rounded-xl transition-all cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="font-medium text-xs text-admiral-cream truncate" title={p.name}>
                              {p.name}
                            </div>
                            <div className="text-[9px] text-admiral-mist font-mono mt-0.5">{p.sku}</div>
                          </div>
                          <div className="flex justify-between items-baseline mt-2">
                            <span className="text-[10px] text-admiral-mist font-mono">Cost:</span>
                            <span className="font-serif text-xs font-semibold gold-text">
                              {formatCOP(Number(p.basePrice))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Derecha: Carrito local de la orden */}
                  <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-admiral-gold/10 pt-4 lg:pt-0 lg:pl-4 flex flex-col overflow-hidden">
                    <h4 className="font-serif text-sm font-bold text-admiral-gold mb-3 flex items-center gap-1.5">
                      <ShoppingCart size={14} />
                      <span>Pedido Pendiente</span>
                      {cart.length > 0 && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#00F5D4]/10 border border-[#00F5D4]/20 text-[#00F5D4]">
                          {cart.length} líneas
                        </span>
                      )}
                    </h4>

                    {/* Lista del Carrito */}
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                      {cart.map((item) => (
                        <div
                          key={item.productId}
                          className="p-2.5 bg-[#0B1428]/60 border border-admiral-gold/5 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="flex-1 pr-2 truncate">
                            <div className="font-medium text-admiral-cream truncate">{item.productName}</div>
                            <div className="text-[10px] text-admiral-mist font-mono mt-0.5">
                              {formatCOP(item.unitPrice * item.quantity)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => changeLocalQuantity(item.productId, -1)}
                              className="p-1 rounded bg-[#E8C96A]/10 text-admiral-gold border border-[#E8C96A]/20 hover:bg-[#E8C96A]/25"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="font-mono font-bold text-xs w-4 text-center">{item.quantity}</span>
                            <button
                              onClick={() => changeLocalQuantity(item.productId, 1)}
                              className="p-1 rounded bg-[#E8C96A]/10 text-admiral-gold border border-[#E8C96A]/20 hover:bg-[#E8C96A]/25"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {cart.length === 0 && (
                        <div className="text-center py-16 text-admiral-mist italic text-xs">
                          Carrito vacío. Toca un producto de la izquierda para agregarlo.
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    {cart.length > 0 && (
                      <div className="pt-3 border-t border-admiral-gold/10 space-y-3">
                        <div className="flex justify-between items-baseline text-sm font-semibold">
                          <span className="text-admiral-mist">Total Pedido:</span>
                          <span className="font-serif gold-text text-base font-bold">
                            {formatCOP(cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0))}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setCart([])}
                            className="btn-ghost !py-2.5 text-xs font-semibold"
                          >
                            Limpiar
                          </button>
                          <button
                            onClick={handleSubmitOrder}
                            disabled={submitting}
                            className="btn-gold !py-2.5 text-xs font-semibold"
                          >
                            {submitting ? 'Enviando...' : 'Enviar Pedido'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
