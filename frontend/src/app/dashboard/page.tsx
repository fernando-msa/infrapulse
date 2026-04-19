'use client';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi } from '@/lib/api';
import type { DashboardExecutiveData } from '@/types';
import {
  Ticket, CheckCircle, Clock, AlertTriangle, XCircle,
  TrendingUp, Activity, Timer,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
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

function progressWidthClass(percent: number) {
  if (percent >= 100) return 'w-full';
  if (percent >= 90) return 'w-11/12';
  if (percent >= 75) return 'w-3/4';
  if (percent >= 50) return 'w-1/2';
  if (percent >= 25) return 'w-1/4';
  if (percent > 0) return 'w-1/12';
  return 'w-0';
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.executive().then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const kpis = data?.kpis;
  const monthlyTrend = data?.monthlyTrend || [];
  const analystPerformance = data?.performanceByAnalyst || [];
  const latestTrend = monthlyTrend[monthlyTrend.length - 1];
  const previousTrend = monthlyTrend.length > 1 ? monthlyTrend[monthlyTrend.length - 2] : undefined;
  const trendDelta = latestTrend && previousTrend ? latestTrend.percentualSlaOk - previousTrend.percentualSlaOk : 0;
  const topAnalyst = analystPerformance[0];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Visão executiva"
          title="Dashboard Executivo"
          description="Resumo da operação com leitura de SLA, tempo de atendimento, carga fora do prazo e evolução mensal da TI."
          meta={[
            { label: 'Chamados', value: loading ? '—' : `${kpis?.total ?? 0}` },
            { label: 'SLA geral', value: loading ? '—' : `${kpis?.percentualSlaOk ?? 0}%` },
            { label: 'Fora do SLA', value: loading ? '—' : `${kpis?.violados ?? 0}` },
          ]}
        />

        <Card className="overflow-hidden border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
          <CardContent className="relative p-6 md:p-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.22),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18),_transparent_24%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div className="space-y-4">
                <span className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Leitura executiva
                </span>
                <div className="space-y-3">
                  <h2 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
                    Operação sob controle com {kpis?.percentualSlaOk ?? 0}% de SLA geral e {kpis?.violados ?? 0} chamados fora do prazo.
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-[15px]">
                    A visão consolida desempenho, tendência mensal e eficiência por analista para acelerar decisão de gestão em ambiente hospitalar.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">SLA geral</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{loading ? '—' : `${kpis?.percentualSlaOk ?? 0}%`}</p>
                    <p className="text-xs text-slate-300">{loading ? 'Carregando leitura' : 'cumprimento da meta operacional'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Tendência</p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {loading ? '—' : `${trendDelta >= 0 ? '+' : ''}${trendDelta}%`}
                    </p>
                    <p className="text-xs text-slate-300">vs. mês anterior no SLA geral</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Analista líder</p>
                    <p className="mt-1 truncate text-2xl font-semibold text-white">{loading ? '—' : topAnalyst?.name || 'Sem dados'}</p>
                    <p className="text-xs text-slate-300">{loading ? 'Carregando leitura' : `${topAnalyst?.percentualSlaOk ?? 0}% SLA OK`}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/7 p-4 backdrop-blur md:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Tempo médio de atendimento</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{loading ? '—' : `${kpis?.tempoMedioAtendimento ?? 0}h`}</p>
                  <p className="text-xs text-slate-300">Tempo médio de fechamento dos chamados concluídos</p>
                </div>
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Fora do SLA</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{loading ? '—' : `${kpis?.violados ?? 0}`}</p>
                  <p className="text-xs text-slate-300">Chamados que pedem intervenção imediata</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Total de Chamados" value={kpis?.total ?? '—'} icon={Ticket} color="blue" loading={loading} />
          <KpiCard title="SLA Geral" value={kpis ? `${kpis.percentualSlaOk}%` : '—'} icon={TrendingUp} color="green" loading={loading} subtitle="cumprido" />
          <KpiCard title="Tempo Médio" value={kpis ? `${kpis.tempoMedioAtendimento}h` : '—'} icon={Timer} color="purple" loading={loading} subtitle="de atendimento" />
          <KpiCard title="Fora do SLA" value={kpis?.violados ?? '—'} icon={XCircle} color="red" loading={loading} subtitle="chamados violados" />
        </div>

        {/* KPIs Row 2 — SLA */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Chamados Abertos" value={kpis?.abertos ?? '—'} icon={Activity} color="yellow" loading={loading} />
          <KpiCard title="Concluídos" value={kpis?.concluidos ?? '—'} icon={CheckCircle} color="green" loading={loading} />
          <KpiCard title="Em Risco" value={kpis?.emRisco ?? '—'} icon={Clock} color="yellow" loading={loading} />
          <KpiCard title="SLA em Risco" value={kpis ? `${kpis.percentualSlaRisco}%` : '—'} icon={AlertTriangle} color="yellow" loading={loading} />
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
                            className={`h-full bg-blue-500 rounded-full ${progressWidthClass((s.count / (data?.rankingSetores[0]?.count || 1)) * 100)}`}
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
                            className={`h-full bg-purple-500 rounded-full ${progressWidthClass((c.count / (data?.rankingCategorias[0]?.count || 1)) * 100)}`}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendência Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-72 bg-muted animate-pulse rounded" />
              ) : monthlyTrend.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado disponível</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="concluidos" name="Concluídos" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="violados" name="Fora do SLA" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance por Analista</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded" />)}
                </div>
              ) : analystPerformance.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado disponível</p>
              ) : (
                <div className="space-y-4">
                  {analystPerformance.map((analyst) => (
                    <div key={analyst.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{analyst.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {analyst.concluidos} concluídos • {analyst.tempoMedioAtendimento}h médio
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-950">{analyst.total} chamados</p>
                          <p className="text-xs text-muted-foreground">{analyst.percentualSlaOk}% SLA OK</p>
                        </div>
                      </div>

                      <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 ${progressWidthClass(Math.max(analyst.percentualSlaOk, 6))}`}
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <span className="rounded-lg bg-white px-2 py-1 border border-slate-200">Fora do SLA: {analyst.violados}</span>
                        <span className="rounded-lg bg-white px-2 py-1 border border-slate-200">Risco: {analyst.emRisco}</span>
                        <span className="rounded-lg bg-white px-2 py-1 border border-slate-200">Ativos: {analyst.total}</span>
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
