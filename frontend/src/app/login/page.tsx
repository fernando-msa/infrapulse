'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Loader2, AlertCircle, ShieldCheck, Gauge, Layers3, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import { setSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await authApi.login(email, password);
      const { access_token, user } = res.data;
      setSession(access_token, user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: string) => {
    const creds: Record<string, { email: string; password: string }> = {
      admin: { email: 'admin@infrapulse.com', password: 'admin123' },
      gestor: { email: 'gestor@infrapulse.com', password: 'gestor123' },
      analista: { email: 'analista@infrapulse.com', password: 'analista123' },
    };
    setEmail(creds[role].email);
    setPassword(creds[role].password);
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/80 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative overflow-hidden bg-slate-950 px-8 py-10 text-white md:px-10 lg:px-12 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.28),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.24),_transparent_32%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/30">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">InfraPulse</p>
                  <p className="text-sm text-slate-400">Operação SaaS para suporte de TI</p>
                </div>
              </div>

              <div className="max-w-xl space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Acesso seguro</p>
                <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                  Uma central de operação que parece produto pronto, não tela técnica.
                </h1>
                <p className="max-w-lg text-sm leading-6 text-slate-300 md:text-base">
                  Acompanhe SLA, fila, risco e assinatura em uma interface pensada para uso diário.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'SLA', value: 'Tempo real', icon: ShieldCheck },
                { label: 'Operação', value: 'Fila e risco', icon: Gauge },
                { label: 'Escala', value: 'Multiempresa', icon: Layers3 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <Icon className="h-5 w-5 text-cyan-300" />
                    <p className="mt-4 text-sm text-slate-400">{item.label}</p>
                    <p className="text-lg font-semibold text-white">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-8 md:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <Card className="border-slate-200/80 bg-white/90 shadow-none">
              <CardHeader className="space-y-4">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                  <Sparkles className="h-3.5 w-3.5" />
                  Acesso à operação
                </div>
                <div>
                  <CardTitle className="text-2xl tracking-tight">Entrar na plataforma</CardTitle>
                  <CardDescription className="text-sm">Use seu e-mail corporativo para acessar o ambiente.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>

                <div className="mt-6 border-t border-slate-200 pt-4">
                  <p className="text-xs text-muted-foreground text-center mb-3">Acesso demo rápido</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['admin', 'gestor', 'analista'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => fillDemo(role)}
                        className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-medium capitalize transition-colors hover:bg-slate-50"
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Nova empresa?{' '}
                    <Link href="/signup" className="inline-flex items-center gap-1 font-medium text-cyan-700 hover:underline">
                      Criar conta SaaS <ArrowRight className="h-3 w-3" />
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
