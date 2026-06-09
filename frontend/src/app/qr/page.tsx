'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, Plus, Minus, MessageCircle, Users, CreditCard, PlusCircle, Trash2, Crown, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { qrApi, apiError } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP, cn } from '@/lib/utils';

export default function QrCustomerPage() {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const t = searchParams.get('token') || '';
      setToken(t);
    }
  }, []);
  const [info, setInfo] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeCat, setActiveCat] = useState<string>('all');
  const [calling, setCalling] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cuenta Dividida
  const [split, setSplit] = useState<any>(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedShare, setSelectedShare] = useState<any>(null);
  const [payMethod, setPayMethod] = useState('NEQUI');
  const [payRef, setPayRef] = useState('');
  const [splitShares, setSplitShares] = useState<any[]>([
    { name: '', phone: '', amount: 0 },
    { name: '', phone: '', amount: 0 },
  ]);

  const loadSplit = useCallback(() => {
    if (!token) return;
    qrApi
      .getSplit(token)
      .then((r) => setSplit(r.data))
      .catch(() => { /* mesa sin cuenta o error */ });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    qrApi
      .menu(token)
      .then((r) => {
        setInfo({ table: r.data.table, zone: r.data.zone });
        setCategories(r.data.categories);
        setProducts(r.data.products);
      })
      .catch((e) => toast.error(apiError(e)));

    loadSplit();
  }, [token, loadSplit]);

  const callWaiter = async () => {
    setCalling(true);
    try {
      await qrApi.callWaiter(token);
      toast.success('Mesero notificado');
      setTimeout(() => setCalling(false), 3000);
    } catch (e) {
      toast.error(apiError(e));
      setCalling(false);
    }
  };

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) =>
    setCart((c) => {
      const n = (c[id] || 0) - 1;
      if (n <= 0) {
        const { [id]: _, ...rest } = c;
        return rest;
      }
      return { ...c, [id]: n };
    });

  const filtered = products.filter((p) => activeCat === 'all' || p.category?.slug === activeCat);
  const cartLines = Object.entries(cart).map(([id, qty]) => {
    const p = products.find((x) => x.id === id);
    return { id, qty, name: p?.name, price: Number(p?.basePrice || 0) };
  });
  const total = cartLines.reduce((s, l) => s + l.price * l.qty, 0);

  const narinoMediaProduct = products.find((p) => p.sku === 'SHO-NAR-AZU-M');
  const isRainPromoActive = narinoMediaProduct && Number(narinoMediaProduct.basePrice) === 30000;

  if (!info) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Logo size={56} className="mx-auto mb-3" />
          <p className="text-admiral-mist text-sm animate-pulse-gold">Cargando menú…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-md mx-auto pb-32">
      {/* Header sticky */}
      <header className="sticky top-0 z-20 glass-strong border-b border-admiral-gold/12 px-4 py-3 flex items-center gap-3">
        <Logo size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-serif gold-text leading-none">Admiral Whiskería</div>
          <div className="text-[10px] text-admiral-mist mt-0.5">
            {info.zone?.name || 'Sucursal'} · Mesa {info.table?.number}
          </div>
        </div>
        <button
          onClick={callWaiter}
          disabled={calling}
          className={cn(
            'px-3 py-1.5 rounded-full text-[11px] border transition-all flex items-center gap-1.5',
            calling
              ? 'border-admiral-success/40 text-admiral-success bg-admiral-success/10'
              : 'border-admiral-warn/40 text-admiral-warn hover:bg-admiral-warn/10',
          )}
        >
          {calling ? <CheckCircle2 size={12} /> : <Bell size={12} />}
          {calling ? 'En camino' : 'Llamar'}
        </button>
      </header>

      {isRainPromoActive ? (
        <div className="mx-3 mt-3 p-3.5 rounded-xl bg-gradient-to-r from-admiral-navy to-[#0F1B33] border border-[#00b0ff]/40 text-xs text-admiral-cream flex items-center gap-3 relative overflow-hidden shadow-lg animate-pulse-gold">
          <span className="text-lg">☔</span>
          <div>
            <div className="font-bold text-[#00b0ff] uppercase tracking-wide text-[10px]">Alerta de Clima: Lluvia en Sandoná</div>
            <div className="text-admiral-mist text-[11px] mt-0.5">¡Media de Aguardiente Nariño Azul con descuento especial! Hoy a solo $30,000 COP.</div>
          </div>
        </div>
      ) : (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-gold-soft border border-admiral-gold/20 text-xs text-admiral-gold flex items-center gap-2">
          ⚡ Happy hour: 2×1 en cocteles lun-vie 6 a 8 PM
        </div>
      )}

      {/* Recomendación de IA en caliente */}
      <div className="mx-3 mt-3 p-4 rounded-2xl bg-[#0F1B33]/65 border border-admiral-gold/15 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 text-admiral-gold/5">
          <Sparkles size={64} />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#E8C96A]/10 text-admiral-gold border border-admiral-gold/20 text-xs">
            ✨
          </div>
          <h3 className="font-serif text-[10px] font-bold uppercase tracking-wider gold-text flex items-center gap-1">
            <span>Recomendado por IA Admiral</span>
            <span className="px-1.5 py-0.5 rounded text-[8px] bg-admiral-gold/20 text-admiral-gold font-sans font-extrabold ml-1 uppercase">Clima en Sandoná</span>
          </h3>
        </div>

        {isRainPromoActive ? (
          <div className="flex items-center gap-3 bg-admiral-navy-2/30 p-2.5 rounded-xl border border-admiral-gold/10">
            <div className="text-2xl">💙</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-admiral-cream">Media de Aguardiente Nariño Azul (375ml)</div>
              <p className="text-[10px] text-admiral-mist mt-0.5 leading-relaxed">
                {'"¡Está lloviendo afuera! Te sugerimos disfrutar con amigos de una tradicional Media de Aguardiente Nariño Azul, hoy en descuento a solo $30,000 COP."'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-admiral-navy-2/30 p-2.5 rounded-xl border border-admiral-gold/10">
            <div className="text-2xl">💛</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-admiral-cream">Aguardiente Amarillo de Manzanares</div>
              <p className="text-[10px] text-admiral-mist mt-0.5 leading-relaxed">
                {'"La noche en Sandoná está excelente. Recomendamos compartir una Botella de Aguardiente Amarillo de Manzanares con un toque anisado único."'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* --- Sección de Cuenta Dividida Premium --- */}
      {split && split.status === 'PENDING' && (
        <div className="mx-3 mt-3 card-premium bg-[#0F1B33]/65 border border-admiral-gold/25 p-4 rounded-2xl relative overflow-hidden shadow-gold">
          <div className="absolute top-0 right-0 p-2 text-admiral-gold/15">
            <Users size={48} />
          </div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-serif text-sm font-semibold gold-text flex items-center gap-1.5">
              <Users size={14} className="text-admiral-gold" />
              <span>Cuenta Dividida Activa</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E8C96A]/10 text-admiral-gold border border-admiral-gold/20 uppercase tracking-widest">
              En Progreso
            </span>
          </div>

          {/* Barra de progreso de la cuenta */}
          {(() => {
            const paidAmount = split.shares
              .filter((s: any) => s.status === 'PAID')
              .reduce((sum: number, s: any) => sum + Number(s.shareAmount), 0);
            const totalAmount = split.shares.reduce((sum: number, s: any) => sum + Number(s.shareAmount), 0);
            const pct = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
            return (
              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-admiral-mist font-semibold mb-1">
                  <span>Pagado: {formatCOP(paidAmount)}</span>
                  <span>Total: {formatCOP(totalAmount)}</span>
                </div>
                <div className="h-1.5 bg-admiral-navy/55 border border-admiral-gold/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#F5DC8E] via-[#E8C96A] to-[#D4A535] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Lista de comensales y cuotas */}
          <div className="space-y-2 mb-2 max-h-48 overflow-y-auto pr-1">
            {split.shares.map((sh: any) => (
              <div
                key={sh.id}
                className={cn(
                  "flex justify-between items-center p-2 rounded-xl border text-xs",
                  sh.status === 'PAID'
                    ? 'border-[#00F5D4]/20 bg-[#00F5D4]/5'
                    : 'border-admiral-gold/12 bg-admiral-navy-2/30'
                )}
              >
                <div>
                  <div className="font-medium text-admiral-cream">{sh.name}</div>
                  <div className="text-[9px] text-admiral-mist/70 font-mono">{sh.phone}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-serif gold-text font-semibold">{formatCOP(sh.shareAmount)}</div>
                    <span className={cn(
                      "text-[8px] font-extrabold uppercase tracking-widest block",
                      sh.status === 'PAID' ? 'text-[#00F5D4]' : 'text-admiral-warn'
                    )}>
                      {sh.status === 'PAID' ? 'PAGADO' : 'PENDIENTE'}
                    </span>
                  </div>
                  {sh.status !== 'PAID' && (
                    <button
                      onClick={() => {
                        setSelectedShare(sh);
                        setIsPayModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-admiral-night bg-gradient-to-r from-[#F5DC8E] to-[#E8C96A] hover:brightness-105 active:scale-95 transition-all shadow-md"
                    >
                      <CreditCard size={10} />
                      <span>Pagar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {split && split.status === 'COMPLETED' && (
        <div className="mx-3 mt-3 card-premium bg-gradient-to-br from-[#0B1428] via-[#0F1B33] to-[#0A1224] border border-[#00F5D4]/30 p-5 rounded-2xl text-center relative overflow-hidden shadow-gold">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#00F5D4]/10 border border-[#00F5D4]/30 text-[#00F5D4] text-xl animate-pulse">
              👑
            </div>
          </div>
          <h3 className="font-serif text-base font-bold text-[#00F5D4] mb-1">¡Mesa Totalmente Pagada!</h3>
          <p className="text-[10px] text-admiral-mist leading-relaxed max-w-xs mx-auto mb-1">
            Toda la cuenta ha sido cubierta con éxito. Tu membresía VIP y puntos de lealtad han sido actualizados en nuestro CRM.
          </p>
          <span className="inline-block mt-3 px-3 py-1 rounded-full text-[8px] font-extrabold tracking-widest bg-[#00F5D4]/15 text-[#00F5D4] border border-[#00F5D4]/20 uppercase">
            Mesa Liberada
          </span>
        </div>
      )}

      {(!split || split.status === 'NOT_SPLIT') && (
        <div className="mx-3 mt-3">
          <button
            onClick={() => {
              // Inicializar montos de cuota iguales
              const totalShares = splitShares.length;
              const portion = totalShares > 0 ? Number((split?.grandTotal || 120000) / totalShares) : 0;
              setSplitShares(splitShares.map(s => ({ ...s, amount: portion })));
              setIsSplitModalOpen(true);
            }}
            className="w-full flex items-center justify-center space-x-2 px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-admiral-gold border border-admiral-gold/30 bg-[#0F1B33]/40 hover:bg-admiral-gold/10 hover:border-admiral-gold/50 active:scale-[0.98] transition-all shadow-md"
          >
            <Users size={14} className="animate-pulse" />
            <span>Dividir Cuenta con Amigos</span>
          </button>
        </div>
      )}

      {/* Categorías */}
      <div className="px-3 py-3 flex gap-2 overflow-x-auto sticky top-[60px] z-10 bg-admiral-night/85 backdrop-blur">
        <CatPill label="Todos" active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
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

      {/* Productos */}
      <div className="px-3 space-y-2">
        {filtered.map((p, i) => {
          const qty = cart[p.id] || 0;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025 }}
              className="card-premium !p-3 flex items-center gap-3"
            >
              {p.imageUrl && (
                <div className="w-12 h-12 rounded-lg bg-admiral-navy/40 border border-admiral-gold/15 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-admiral-cream font-medium leading-tight">
                  {p.name}
                </div>
                {p.description && (
                  <div className="text-[10px] text-admiral-mist line-clamp-1 mt-0.5">
                    {p.description}
                  </div>
                )}
                <div className="font-serif text-sm gold-text font-semibold mt-1">
                  {formatCOP(p.basePrice)}
                </div>
              </div>
              {qty === 0 ? (
                <button
                  onClick={() => inc(p.id)}
                  className="btn-gold !px-4 !py-2 !text-xs"
                >
                  + Pedir
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-admiral-navy/50 rounded-lg p-1">
                  <button
                    onClick={() => dec(p.id)}
                    className="w-7 h-7 rounded text-admiral-gold hover:bg-admiral-gold/15"
                  >
                    <Minus size={14} className="mx-auto" />
                  </button>
                  <span className="w-7 text-center text-sm font-medium text-admiral-cream">
                    {qty}
                  </span>
                  <button
                    onClick={() => inc(p.id)}
                    className="w-7 h-7 rounded text-admiral-gold hover:bg-admiral-gold/15"
                  >
                    <Plus size={14} className="mx-auto" />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Carrito flotante */}
      <AnimatePresence>
        {cartLines.length > 0 && !sent && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-3"
          >
            <div className="glass-strong border border-admiral-gold/30 rounded-2xl p-4 shadow-gold">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-admiral-mist">
                  {cartLines.length} producto{cartLines.length > 1 ? 's' : ''}
                </span>
                <span className="font-serif text-lg gold-text font-bold">{formatCOP(total)}</span>
              </div>
              <button
                disabled={submitting}
                onClick={async () => {
                  if (!token || submitting) return;
                  setSubmitting(true);
                  try {
                    const lines = cartLines.map((l) => ({
                      productId: l.id,
                      quantity: l.qty,
                    }));
                    await qrApi.submitOrder(token, lines);
                    setSent(true);
                    setCart({});
                    toast.success('Pedido enviado al mesero');
                  } catch (e) {
                    toast.error(apiError(e));
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="btn-gold w-full !py-3"
              >
                {submitting ? 'Enviando…' : 'Enviar pedido al mesero'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Dividir Cuenta (IFTTT / Split Form) */}
      <AnimatePresence>
        {isSplitModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-30 flex items-center justify-center p-4"
            onClick={() => setIsSplitModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 15 }}
              className="card-premium max-w-sm w-full p-6 bg-[#0F1B33]/85 border border-admiral-gold/25 rounded-2xl relative preserve-3d"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <h3 className="font-serif text-lg font-bold bg-gradient-to-r from-admiral-ivory to-admiral-gold bg-clip-text text-transparent mb-1">
                  Dividir Cuenta Activa
                </h3>
                <p className="text-[10px] text-admiral-mist">
                  Mesa {info.table?.number} · Cuenta Total: <span className="font-bold text-admiral-gold">{formatCOP(split?.grandTotal || 120000)}</span>
                </p>
              </div>

              {/* Lista de comensales a configurar */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 mb-4">
                {splitShares.map((sh, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-admiral-gold/10 bg-admiral-navy-2/30 space-y-2 relative">
                    {splitShares.length > 2 && (
                      <button
                        onClick={() => {
                          const filtered = splitShares.filter((_, i) => i !== idx);
                          // Recalcular montos iguales
                          const portion = filtered.length > 0 ? Number((split?.grandTotal || 120000) / filtered.length) : 0;
                          setSplitShares(filtered.map(s => ({ ...s, amount: portion })));
                        }}
                        className="absolute top-2 right-2 text-admiral-warn/60 hover:text-admiral-warn"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-admiral-gold">
                      Persona {idx + 1}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Nombre"
                        value={sh.name}
                        onChange={(e) => {
                          const copy = [...splitShares];
                          copy[idx].name = e.target.value;
                          setSplitShares(copy);
                        }}
                        className="input-field !py-2 text-[11px] bg-[#0B1428]/60 border-admiral-gold/15"
                      />
                      <input
                        placeholder="Celular"
                        value={sh.phone}
                        onChange={(e) => {
                          const copy = [...splitShares];
                          copy[idx].phone = e.target.value;
                          setSplitShares(copy);
                        }}
                        className="input-field !py-2 text-[11px] bg-[#0B1428]/60 border-admiral-gold/15"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-admiral-mist">Porción Calculada:</span>
                      <span className="font-serif gold-text font-bold">{formatCOP(sh.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-between mb-4">
                <button
                  onClick={() => {
                    const nextShares = [...splitShares, { name: '', phone: '', amount: 0 }];
                    const portion = nextShares.length > 0 ? Number((split?.grandTotal || 120000) / nextShares.length) : 0;
                    setSplitShares(nextShares.map(s => ({ ...s, amount: portion })));
                  }}
                  className="flex items-center justify-center space-x-1.5 px-4 py-2 border border-[#00F5D4]/30 rounded-xl text-[10px] font-bold uppercase tracking-wider text-[#00F5D4] hover:bg-[#00F5D4]/10 transition-all"
                >
                  <PlusCircle size={12} />
                  <span>Agregar Amigo</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsSplitModalOpen(false)}
                  className="btn-ghost !py-2.5 text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    // Validar campos
                    for (const s of splitShares) {
                      if (!s.name.trim() || !s.phone.trim()) {
                        toast.error('Todos los comensales deben tener nombre y celular');
                        return;
                      }
                    }
                    try {
                      const res = await qrApi.initiateSplit(token, splitShares);
                      setSplit(res.data);
                      setIsSplitModalOpen(false);
                      toast.success('¡Cuenta dividida con éxito! Compartan este enlace.');
                    } catch (err: any) {
                      toast.error(apiError(err));
                    }
                  }}
                  className="btn-gold !py-2.5 text-xs flex justify-center items-center gap-1.5"
                >
                  <Sparkles size={12} />
                  <span>Confirmar División</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Simulación de Pago de Cuota */}
      <AnimatePresence>
        {isPayModalOpen && selectedShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-30 flex items-center justify-center p-4"
            onClick={() => setIsPayModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 15 }}
              className="card-premium max-w-sm w-full p-6 bg-[#0F1B33]/85 border border-[#00F5D4]/25 rounded-2xl relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#00F5D4]/10 border border-[#00F5D4]/30 text-[#00F5D4]">
                  <CreditCard size={20} />
                </div>
              </div>

              <h3 className="font-serif text-lg font-bold text-admiral-cream mb-1">
                Pagar Cuota de {selectedShare.name}
              </h3>
              <p className="text-xs text-admiral-mist mb-4">
                Monto a pagar: <span className="font-serif font-bold gold-text text-sm">{formatCOP(selectedShare.shareAmount)}</span>
              </p>

              {/* Selección de Método de Pago */}
              <div className="space-y-3 text-left mb-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-admiral-gold">
                    Método de Pago
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="input-field py-2 text-xs bg-[#0B1428]/60 border-admiral-gold/15 text-admiral-cream"
                  >
                    <option value="NEQUI">Nequi (LATAM)</option>
                    <option value="DAVIPLATA">Daviplata (LATAM)</option>
                    <option value="PSE">PSE / Banco (LATAM)</option>
                    <option value="CARD">Tarjeta de Crédito</option>
                    <option value="CASH">Efectivo en Caja</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-admiral-gold">
                    Referencia o Comprobante (Opcional)
                  </label>
                  <input
                    placeholder="Ej: Número de transacción"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="input-field py-2 text-xs bg-[#0B1428]/60 border-admiral-gold/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsPayModalOpen(false)}
                  className="btn-ghost !py-2.5 text-xs"
                >
                  Cerrar
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await qrApi.payShare(token, selectedShare.id, payMethod, payRef);
                      toast.success(`¡Cuota de ${selectedShare.name} pagada correctamente!`);
                      setIsPayModalOpen(false);
                      setPayRef('');
                      loadSplit(); // Recargar estado completo del split
                    } catch (err: any) {
                      toast.error(apiError(err));
                    }
                  }}
                  className="btn-gold !py-2.5 text-xs flex justify-center items-center gap-1.5 bg-gradient-to-r from-[#00F5D4] to-[#00b0ff] text-admiral-night font-bold tracking-wide"
                >
                  <Sparkles size={12} />
                  <span>Realizar Pago</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmación */}
      <AnimatePresence>
        {sent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-30 flex items-center justify-center p-4"
            onClick={() => {
              setSent(false);
              setCart({});
            }}
          >
            <div className="card-premium max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="w-16 h-16 rounded-full bg-admiral-success/15 mx-auto mb-4 flex items-center justify-center"
              >
                <CheckCircle2 size={32} className="text-admiral-success" />
              </motion.div>
              <h3 className="font-serif text-lg text-admiral-success mb-1">Pedido enviado</h3>
              <p className="text-xs text-admiral-mist mb-4">
                El mesero lo confirmará en un momento
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setCart({});
                }}
                className="btn-ghost"
              >
                Seguir pidiendo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
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
        'px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all flex items-center gap-1.5',
        active
          ? 'bg-admiral-gold/15 text-admiral-gold border-admiral-gold/40'
          : 'border-admiral-gold/12 text-admiral-mist',
      )}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}
