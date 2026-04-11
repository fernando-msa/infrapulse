'use client';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { alertsApi } from '@/lib/api';
import { PriorityBadge, SlaBadge } from '@/components/tickets/TicketBadges';
import { slaTimeRemaining, formatDate } from '@/lib/utils';
import { AlertTriangle, Zap, Clock, Users, RefreshCw, Bell } from 'lucide-react';
import type { Ticket } from '@/types';

export default function AlertasPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    alertsApi.get().then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const sections = [
    {
      title: 'Próximos do Vencimento (30min)',
      icon: Clock,
      color: 'yellow',
      items: data?.proximosDoVencimento || [],
      emptyMsg: '✅ Nenhum chamado próximo do vencimento',
      badge: 'warning',
    },
    {
      title: 'Chamados Críticos Abertos',
      icon: Zap,
      color: 'red',
      items: data?.criticosAbertos || [],
      emptyMsg: '✅ Nenhum chamado crítico aberto',
      badge: 'danger',
    },
    {
      title: 'SLA Violado',
      icon: AlertTriangle,
      color: 'red',
      items: data?.slaViolados || [],
      emptyMsg: '✅ Nenhum SLA violado',
      badge: 'danger',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Alertas</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {data?.summary?.totalAlertas ?? '—'} alertas ativos no momento
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${section.color === 'red' ? 'text-red-500' : 'text-yellow-500'}`} />
                    {section.title}
                    <Badge variant={section.badge as any} className="ml-auto">{section.items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
                  ) : section.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{section.emptyMsg}</p>
                  ) : (
                    <div className="space-y-3">
                      {section.items.map((t: Ticket) => (
                        <div key={t.id} className={`rounded-lg border p-3 ${section.color === 'red' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium line-clamp-1">{t.title}</p>
                            <PriorityBadge priority={t.priority} />
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{t.sector || 'Sem setor'}</span>
                            {t.slaDeadline && (
                              <span className={section.color === 'red' ? 'text-red-600 font-medium' : 'text-yellow-700 font-medium'}>
                                {slaTimeRemaining(t.slaDeadline)}
                              </span>
                            )}
                            {t.assignedTo && <span className="ml-auto">{t.assignedTo.name}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Técnicos sobrecarregados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-500" />
                Técnicos Sobrecarregados (+5 chamados)
                <Badge variant="warning" className="ml-auto">{data?.tecnicosOverloaded?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
              ) : data?.tecnicosOverloaded?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">✅ Nenhum técnico sobrecarregado</p>
              ) : (
                <div className="space-y-3">
                  {data?.tecnicosOverloaded?.map((item: any) => (
                    <div key={item.technician.id} className="rounded-lg border border-orange-200 bg-orange-50 p-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {item.technician.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.technician.name}</p>
                        <p className="text-xs text-orange-700">{item.ticketCount} chamados ativos</p>
                      </div>
                      <Badge variant="danger">{item.ticketCount} chamados</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Empty state geral */}
        {!loading && data?.summary?.totalAlertas === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <h2 className="text-xl font-bold text-green-700">Tudo certo!</h2>
              <p className="text-muted-foreground mt-1">Nenhum alerta ativo no momento.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
