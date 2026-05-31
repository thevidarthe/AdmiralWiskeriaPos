'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type Role } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { Logo } from './Logo';

export function AuthGuard({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: Role[];
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { currentId, load: loadBranches } = useBranchStore();

  // Validar sesión y permisos
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }
    if (allow && !allow.includes(user.role)) {
      router.replace('/');
    }
  }, [isAuthenticated, user, allow, router]);

  // Cargar sucursales del tenant si todavía no las tenemos
  useEffect(() => {
    if (isAuthenticated && !currentId) {
      loadBranches();
    }
    // Nota: no incluir loadBranches en dependencies para evitar loop infinito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentId]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Logo size={48} />
        <p className="text-admiral-mist text-xs animate-pulse-gold">Verificando sesión...</p>
      </div>
    );
  }
  if (allow && !allow.includes(user.role)) {
    return null;
  }
  if (!currentId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Logo size={48} />
        <p className="text-admiral-mist text-xs animate-pulse-gold">Cargando sucursal…</p>
      </div>
    );
  }
  return <>{children}</>;
}
