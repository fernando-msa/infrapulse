'use client';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { companiesApi } from '@/lib/api';
import type { CompanyPlan, CompanyUsage } from '@/types';
import { Loader2, Users, Ticket, Crown } from 'lucide-react';

const planLabel: Record<CompanyPlan, string> = {
  TRIAL: 'Trial',
  STARTER: 'Starter',
  GROWTH: 'Growth',
  ENTERPRISE: 'Enterprise',
};

const planOrder: CompanyPlan[] = ['TRIAL', 'STARTER', 'GROWTH', 'ENTERPRISE'];

function progressWidthClass(percent: number) {
  if (percent >= 100) return 'w-full';
  if (percent >= 90) return 'w-11/12';
  if (percent >= 75) return 'w-3/4';
  if (percent >= 50) return 'w-1/2';
  if (percent >= 25) return 'w-1/4';
  if (percent > 0) return 'w-1/12';
  return 'w-0';
}

export default function AssinaturaPage() {
  const [data, setData] = useState<CompanyUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<CompanyPlan | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await companiesApi.current();
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changePlan = async (plan: CompanyPlan) => {
    setSavingPlan(plan);
    try {
      await companiesApi.updatePlan({ plan, subscriptionStatus: 'ACTIVE' });
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Não foi possível atualizar o plano');
    } finally {
      setSavingPlan(null);
    }
  };

  const userPercent = data ? Math.min((data.usage.usersCount / Math.max(data.usage.usersLimit, 1)) * 100, 100) : 0;
  const ticketPercent = data ? Math.min((data.usage.ticketsThisMonth / Math.max(data.usage.ticketsLimit, 1)) * 100, 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Assinatura SaaS</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão de plano, capacidade e consumo mensal.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              {loading ? 'Carregando...' : data?.company.name}
            </CardTitle>
            <CardDescription>
              {loading ? 'Aguarde' : `Plano atual: ${planLabel[data!.company.plan]} | Status: ${data!.company.subscriptionStatus}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Usuários ativos</span>
                <Badge variant={userPercent >= 90 ? 'warning' : 'info'}>
                  {loading ? '...' : `${data?.usage.usersCount}/${data?.usage.usersLimit}`}
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full bg-cyan-500 ${progressWidthClass(userPercent)}`} />
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Ticket className="h-4 w-4" /> Chamados no mês</span>
                <Badge variant={ticketPercent >= 90 ? 'warning' : 'success'}>
                  {loading ? '...' : `${data?.usage.ticketsThisMonth}/${data?.usage.ticketsLimit}`}
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full bg-emerald-500 ${progressWidthClass(ticketPercent)}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {planOrder.map((plan) => {
            const isCurrent = data?.company.plan === plan;
            const saving = savingPlan === plan;

            return (
              <Card key={plan} className={isCurrent ? 'border-cyan-500 ring-2 ring-cyan-500/20' : ''}>
                <CardHeader>
                  <CardTitle className="text-base">{planLabel[plan]}</CardTitle>
                  <CardDescription>
                    {plan === 'TRIAL' && '5 usuários, 200 chamados/mês'}
                    {plan === 'STARTER' && '15 usuários, 2.000 chamados/mês'}
                    {plan === 'GROWTH' && '50 usuários, 10.000 chamados/mês'}
                    {plan === 'ENTERPRISE' && '500 usuários, 100.000 chamados/mês'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    disabled={loading || saving || isCurrent}
                    variant={isCurrent ? 'secondary' : 'default'}
                    onClick={() => changePlan(plan)}
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isCurrent ? 'Plano atual' : saving ? 'Atualizando...' : 'Selecionar plano'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
