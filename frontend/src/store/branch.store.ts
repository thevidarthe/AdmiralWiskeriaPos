'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, apiError } from '@/lib/api';

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  timezone: string;
  active: boolean;
}

interface BranchState {
  branches: Branch[];
  currentId: string | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  setCurrent: (id: string) => void;
  reset: () => void;
}

/**
 * Carga la lista de sucursales del tenant tras login y guarda el id activo.
 * Reemplaza el antiguo BRANCH_ID = 'branch-main' hardcodeado.
 */
export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [],
      currentId: null,
      loading: false,
      error: null,

      load: async () => {
        if (get().loading) return;
        set({ loading: true, error: null });
        try {
          const res = await api.get<Branch[]>('/branches/');
          const list = res.data || [];
          set({
            branches: list,
            // Si todavía no hay sucursal seleccionada, escoger la primera
            currentId: get().currentId || (list[0]?.id ?? null),
            loading: false,
          });
        } catch (e) {
          set({ loading: false, error: apiError(e) });
        }
      },

      setCurrent: (id) => set({ currentId: id }),

      reset: () => set({ branches: [], currentId: null, error: null }),
    }),
    {
      name: 'admiral-branch',
      partialize: (s) => ({ branches: s.branches, currentId: s.currentId }),
    },
  ),
);

/**
 * Hook conveniente para obtener el branchId activo, lanzando si no existe.
 * Úsalo en páginas que NO pueden funcionar sin sucursal.
 */
export function useBranchId(): string {
  const id = useBranchStore((s) => s.currentId);
  if (!id) {
    // Si esto pasa, es porque la página renderizó antes de que load() terminara.
    // El AuthGuard debería garantizar que branchId existe; si no, devolvemos
    // string vacío y dejamos que el backend rechace con un error claro.
    return '';
  }
  return id;
}
