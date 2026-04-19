'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Rocket, AlertCircle, ShieldCheck, Sparkles, ArrowRight, BadgeCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api';
import { setSession } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    companyName: '',
    cnpj: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...form,
        cnpj: form.cnpj.trim() || undefined,
      };

      const res = await authApi.signupCompany(payload);
      const { access_token, user } = res.data;
      setSession(access_token, user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível criar a conta SaaS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/80 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[0.94fr_1.06fr]">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 px-8 py-10 text-white md:px-10 lg:px-12 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.28),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.24),_transparent_32%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-lg shadow-cyan-500/20">
                  <Rocket className="h-6 w-6 text-cyan-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Onboarding SaaS</p>
                  <p className="text-sm text-slate-400">Crie uma operação pronta para uso em minutos</p>
                </div>
              </div>

              <div className="max-w-xl space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Trial com padrão de produção</p>
                <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                  Monte uma nova empresa e comece com governança, não com planilha.
                </h1>
                <p className="max-w-lg text-sm leading-6 text-slate-300 md:text-base">
                  O fluxo já cria administrador, sessão autenticada e acesso à operação com isolamento por empresa.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Trial', value: '14 dias', icon: ShieldCheck },
                { label: 'Setup', value: 'Automático', icon: BadgeCheck },
                { label: 'Acesso', value: 'Imediato', icon: Sparkles },
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
          <div className="w-full max-w-xl">
            <Card className="border-slate-200/80 bg-white/90 shadow-none">
              <CardHeader className="space-y-4">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                  <Sparkles className="h-3.5 w-3.5" />
                  Cadastro da organização
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl tracking-tight">
                    <Building2 className="h-5 w-5 text-cyan-700" />
                    Ativar operação SaaS
                  </CardTitle>
                  <CardDescription className="text-sm">Trial de 14 dias com estrutura pronta para uso real.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {error && (
                    <div className="md:col-span-2 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome da empresa</Label>
                    <Input
                      placeholder="Ex.: Suporte Alpha"
                      value={form.companyName}
                      onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>CNPJ (opcional)</Label>
                    <Input
                      placeholder="00.000.000/0001-00"
                      value={form.cnpj}
                      onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nome do administrador</Label>
                    <Input
                      placeholder="Seu nome"
                      value={form.adminName}
                      onChange={(e) => setForm((p) => ({ ...p, adminName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>E-mail do administrador</Label>
                    <Input
                      type="email"
                      placeholder="admin@empresa.com"
                      value={form.adminEmail}
                      onChange={(e) => setForm((p) => ({ ...p, adminEmail: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Senha inicial</Label>
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={form.adminPassword}
                      onChange={(e) => setForm((p) => ({ ...p, adminPassword: e.target.value }))}
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-3 pt-1 sm:flex-row">
                    <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {loading ? 'Criando ambiente...' : 'Criar empresa e entrar'}
                    </Button>
                    <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                      <Link href="/login">Já tenho conta <ArrowRight className="h-3 w-3" /></Link>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
