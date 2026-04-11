'use client';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi } from '@/lib/api';
import {
  Ticket, CheckCircle, Clock, AlertTriangle, XCircle,
  TrendingUp, Activity, Timer,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  ABERTO: '#3b82f6',
  EM_ANDAMENTO: '#f59e0b',
  PENDENTE: '#8b5cf6',
  CONCLUIDO: '#22c55e',
  CANCELADO: '#6b7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  BAIXA: '#22c55e',
  MEDIA: '#3b82f6',
  ALTA: '#f59e0b',
  CRITICA: '#ef4444',
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.executive().then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const kpis = data?.kpis;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Executivo</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral dos chamados e SLA</p>
        </div>

        {/* KPIs Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Total de Chamados" value={kpis?.total ?? '—'} icon={Ticket} color="blue" loading={loading} />
          <KpiCard title="Chamados Abertos" value={kpis?.abertos ?? '—'} icon={Activity} color="yellow" loading={loading} />
          <KpiCard title="Concluídos" value={kpis?.concluidos ?? '—'} icon={CheckCircle} color="green" loading={loading} />
          <KpiCard title="Tempo Médio" value={kpis ? `${kpis.tempoMedioAtendimento}h` : '—'} icon={Timer} color="purple" loading={loading} subtitle="de atendimento" />
        </div>

        {/* KPIs Row 2 — SLA */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="SLA Cumprido" value={kpis ? `${kpis.percentualSlaOk}%` : '—'} icon={TrendingUp} color="green" loading={loading} />
          <KpiCard title="SLA em Risco" value={kpis ? `${kpis.percentualSlaRisco}%` : '—'} icon={AlertTriangle} color="yellow" loading={loading} />
          <KpiCard title="Chamados em Risco" value={kpis?.emRisco ?? '—'} icon={Clock} color="yellow" loading={loading} />
          <KpiCard title="SLA Violado" value={kpis?.violados ?? '—'} icon={XCircle} color="red" loading={loading} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chamados por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 bg-muted animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data?.byStatus?.map((s: any) => ({ name: s.status, value: s.count }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {data?.byStatus?.map((s: any, i: number) => (
                        <Cell key={i} fill={STATUS_COLORS[s.status] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend formatter={(v) => v.replace('_', ' ')} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Priority Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chamados por Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 bg-muted animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data?.byPriority?.map((p: any) => ({ name: p.priority, value: p.count }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {data?.byPriority?.map((p: any, i: number) => (
                        <Cell key={i} fill={PRIORITY_COLORS[p.priority] || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Ranking Setores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking por Setor</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-6 bg-muted animate-pulse rounded" />)}
                </div>
              ) : data?.rankingSetores?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado disponível</p>
              ) : (
                <div className="space-y-3">
                  {data?.rankingSetores?.slice(0, 7).map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium truncate">{s.name}</span>
                          <span className="text-muted-foreground ml-2 shrink-0">{s.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(s.count / (data?.rankingSetores[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ranking Categorias */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-6 bg-muted animate-pulse rounded" />)}
                </div>
              ) : data?.rankingCategorias?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado disponível</p>
              ) : (
                <div className="space-y-3">
                  {data?.rankingCategorias?.slice(0, 7).map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium truncate">{c.name}</span>
                          <span className="text-muted-foreground ml-2 shrink-0">{c.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${(c.count / (data?.rankingCategorias[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
