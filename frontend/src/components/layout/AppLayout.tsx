'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  if (!ready) {
    return null;
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,1))] text-slate-950">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-6 p-4 md:p-6 xl:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
