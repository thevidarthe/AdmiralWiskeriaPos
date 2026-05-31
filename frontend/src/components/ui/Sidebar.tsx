'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Wine,
  FolderTree,
  Package,
  Sparkles,
  BarChart3,
  Users,
  UserCircle2,
  Settings,
  LogOut,
  QrCode,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin',                label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/productos',      label: 'Productos',     icon: Wine },
  { href: '/admin/categorias',     label: 'Categorías',    icon: FolderTree },
  { href: '/admin/inventario',     label: 'Inventario',    icon: Package },
  { href: '/admin/promociones',    label: 'Promociones',   icon: Sparkles },
  { href: '/admin/reportes',       label: 'Reportes',      icon: BarChart3 },
  { href: '/admin/clientes',       label: 'Clientes',      icon: UserCircle2 },
  { href: '/admin/usuarios',       label: 'Usuarios',      icon: Users },
  { href: '/admin/qr',             label: 'QR Mesas',      icon: QrCode },
  { href: '/admin/configuracion',  label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <aside className="w-64 h-screen flex flex-col glass-strong border-r border-admiral-gold/12 sticky top-0">
      <div className="p-5 border-b border-admiral-gold/10 flex items-center gap-3">
        <Logo size={40} />
        <div className="flex-1">
          <div className="font-serif text-sm font-semibold gold-text leading-none">
            ADMIRAL
          </div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-admiral-mist mt-1">
            Panel Admin · v2.0
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative',
                active
                  ? 'bg-admiral-gold/10 text-admiral-gold'
                  : 'text-admiral-cream/70 hover:text-admiral-gold hover:bg-admiral-navy-3/15',
              )}
            >
              {active && (
                <motion.span
                  layoutId="activeNav"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-admiral-gold rounded-r"
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
                />
              )}
              <Icon size={18} className="flex-shrink-0" />
              <span className="font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-admiral-gold/10 space-y-2">
        <div className="px-2 py-1.5">
          <div className="text-[10px] text-admiral-mist uppercase tracking-wider">
            Sesión activa
          </div>
          <div className="text-sm text-admiral-cream mt-0.5 font-medium truncate">
            {user?.name}
          </div>
          <div className="text-[10px] text-admiral-gold/60">{user?.role}</div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-xs text-admiral-mist hover:text-admiral-danger hover:bg-admiral-danger/10 transition-colors"
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
