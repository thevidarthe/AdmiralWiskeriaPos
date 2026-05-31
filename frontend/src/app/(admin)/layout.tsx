'use client';
import { AuthGuard } from '@/components/ui/AuthGuard';
import { Sidebar } from '@/components/ui/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allow={['ADMIN', 'MANAGER']}>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto page-enter">{children}</main>
      </div>
    </AuthGuard>
  );
}
