'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Ticket, Upload, BarChart3, Bell,
  Users, LogOut, Zap, ChevronRight, CreditCard, Sparkles, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearSession, getUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard Executivo', icon: LayoutDashboard },
  { href: '/operacional', label: 'Dashboard Operacional', icon: Zap },
  { href: '/chamados', label: 'Chamados', icon: Ticket },
  { href: '/importacao', label: 'Importação', icon: Upload },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
  { href: '/assinatura', label: 'Assinatura', icon: CreditCard, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const visibleItems = navItems.filter(item => {
    if (item.adminOnly && user?.role === 'ANALISTA') return false;
    return true;
  });

  return (
    <aside className="flex h-screen w-[292px] flex-col border-r border-slate-200/80 bg-slate-950/96 text-white shadow-[12px_0_40px_rgba(15,23,42,0.14)] backdrop-blur-xl">
      <div className="px-5 pt-5">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide text-white">InfraPulse</p>
              <p className="text-xs text-slate-400">Operação SaaS de TI</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200">Sessão ativa</p>
              <p className="truncate text-[11px] text-slate-400">{user?.companyId ? `Empresa ${user.companyId.slice(0, 8)}` : 'Ambiente multiempresa'}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <Sparkles className="h-3 w-3" />
              Live
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white text-slate-950 shadow-lg shadow-black/20 ring-1 ring-white/10'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-cyan-600' : 'text-slate-400')} />
              {item.label}
              {isActive && <ChevronRight className="ml-auto h-4 w-4 text-slate-500" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-[22px] border border-white/10 bg-white/10 p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
