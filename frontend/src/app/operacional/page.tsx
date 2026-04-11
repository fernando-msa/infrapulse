'use client';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { dashboardApi, ticketsApi } from '@/lib/api';
import { StatusBadge, PriorityBadge, SlaBadge } from '@/components/tickets/TicketBadges';
import { formatDate, slaTimeRemaining } from '@/lib/utils';
import { AlertTriangle, Zap, Users, Clock } from 'lucide-react';
import type { TechnicianQueue, Ticket } from '@/types';

export default function OperacionalPage() {
  const [operational, setOperational] = useState<any>(null);
  const [queue, setQueue] = useState<TechnicianQueue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.operational(),
      ticketsApi.queue(),
    ]).then(([opRes, queueRes]) => {
      setOperational(opRes.data);
      setQueue(queueRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Operacional</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão em tempo real das filas e riscos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Em Risco */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Chamados em Risco de SLA
                <Badge variant="warning" className="ml-auto">{operational?.emRisco?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
              ) : operational?.emRisco?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">✅ Nenhum chamado em risco</p>
              ) : (
                <div className="space-y-3">
                  {operational?.emRisco?.map((t: Ticket) => (
                    <div key={t.id} className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-1">{t.title}</p>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-yellow-700 font-medium">{slaTimeRemaining(t.slaDeadline)}</span>
                        {t.assignedTo && (
                          <span className="text-xs text-muted-foreground ml-auto">{t.assignedTo.name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Críticos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                Chamados Críticos Abertos
                <Badge variant="danger" className="ml-auto">{operational?.criticos?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
              ) : operational?.criticos?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">✅ Nenhum chamado crítico aberto</p>
              ) : (
                <div className="space-y-3">
                  {operational?.criticos?.map((t: Ticket) => (
                    <div key={t.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-1">{t.title}</p>
                        <SlaBadge slaStatus={t.slaStatus} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">{formatDate(t.openedAt)}</span>
                        {t.assignedTo && (
                          <span className="text-xs text-muted-foreground ml-auto">{t.assignedTo.name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fila por técnico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Fila por Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded" />)}</div>
            ) : queue.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum técnico com chamados ativos</p>
            ) : (
              <div className="space-y-4">
                {queue.map((item) => (
                  <div key={item.technician.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {item.technician.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.technician.name}</p>
                          <p className="text-xs text-muted-foreground">{item.technician.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.hasOverload ? 'danger' : item.ticketCount > 3 ? 'warning' : 'success'}>
                          {item.ticketCount} chamados
                        </Badge>
                        {item.hasOverload && <Badge variant="danger">Sobrecarga</Badge>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {item.tickets.slice(0, 3).map((t: Ticket) => (
                        <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                          <span className="truncate flex-1">{t.title}</span>
                          <PriorityBadge priority={t.priority} />
                          <SlaBadge slaStatus={t.slaStatus} />
                        </div>
                      ))}
                      {item.tickets.length > 3 && (
                        <p className="text-xs text-muted-foreground pl-2">+{item.tickets.length - 3} mais...</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
