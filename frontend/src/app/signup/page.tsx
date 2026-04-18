'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Rocket, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center mb-4">
            <Rocket className="h-7 w-7 text-cyan-300" />
          </div>
          <h1 className="text-3xl font-bold text-white">Ativar sua operação SaaS</h1>
          <p className="text-cyan-200/90 mt-2 text-sm">Crie sua empresa, receba trial e comece a operar em minutos.</p>
        </div>

        <Card className="border-cyan-900/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Cadastro da Organização
            </CardTitle>
            <CardDescription>Trial de 14 dias com recursos de produção.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {error && (
                <div className="md:col-span-2 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
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

              <div className="md:col-span-2 flex gap-3 pt-1">
                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Criando ambiente...' : 'Criar empresa e entrar'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/login">Já tenho conta</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
