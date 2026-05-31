'use client';
import { create } from 'zustand';
import { posApi } from '@/lib/api';

export interface CartLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface PosState {
  cart: CartLine[];
  activeSaleId: string | null;
  addToCart: (line: CartLine) => void;
  removeFromCart: (idx: number) => void;
  setQuantity: (idx: number, qty: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
  selectSale: (id: string | null) => void;
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  activeSaleId: null,

  addToCart: (line) =>
    set((s) => {
      const idx = s.cart.findIndex((l) => l.productId === line.productId);
      if (idx >= 0) {
        const next = [...s.cart];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + line.quantity };
        return { cart: next };
      }
      return { cart: [...s.cart, line] };
    }),

  removeFromCart: (idx) =>
    set((s) => ({ cart: s.cart.filter((_, i) => i !== idx) })),

  setQuantity: (idx, qty) =>
    set((s) => {
      if (qty <= 0) return { cart: s.cart.filter((_, i) => i !== idx) };
      const next = [...s.cart];
      next[idx] = { ...next[idx], quantity: qty };
      return { cart: next };
    }),

  clearCart: () => set({ cart: [] }),

  cartTotal: () =>
    get().cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),

  selectSale: (id) => set({ activeSaleId: id }),
}));
