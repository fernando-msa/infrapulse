'use client';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge, SlaBadge } from '@/components/tickets/TicketBadges';
import { reportsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Download, Filter, BarChart3 } from 'lucide-react';
import type { Ticket } from '@/types';

export default function RelatoriosPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.tickets(filters);
      setTickets(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setFilter = (key: string, value: string) => {
    if (!value || value === 'TODOS') {
      const f = { ...filters };
      delete f[key];
      setFilters(f);
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleExport = () => {
    const token = localStorage.getItem('infrapulse_token');
    const url = reportsApi.exportCsv(filters);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'infrapulse-chamados.csv';
    a.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Inteligência operacional"
          title="Relatórios"
          description="Exportação e análise histórica para auditoria, revisão de SLA e acompanhamento da operação."
          meta={[
            { label: 'Chamados no período', value: loading ? '—' : `${tickets.length}` },
            { label: 'Filtros ativos', value: `${Object.keys(filters).length}` },
          ]}
          actions={(
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          )}
        />

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select onValueChange={(v) => setFilter('status', v)}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="ABERTO">Aberto</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                    <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <Select onValueChange={(v) => setFilter('priority', v)}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todas</SelectItem>
                    <SelectItem value="BAIXA">Baixa</SelectItem>
                    <SelectItem value="MEDIA">Média</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="CRITICA">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Data Início</Label>
                <Input type="date" onChange={(e) => setFilter('startDate', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Data Fim</Label>
                <Input type="date" onChange={(e) => setFilter('endDate', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={load} size="sm">Aplicar Filtros</Button>
              <Button variant="outline" size="sm" onClick={() => { setFilters({}); }}>Limpar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Nenhum chamado para o período</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Aberto em</TableHead>
                    <TableHead>Resolvido em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-48">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                      <TableCell><SlaBadge slaStatus={t.slaStatus} /></TableCell>
                      <TableCell><span className="text-sm">{t.sector || '—'}</span></TableCell>
                      <TableCell><span className="text-sm">{t.category || '—'}</span></TableCell>
                      <TableCell><span className="text-sm">{t.assignedTo?.name || '—'}</span></TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{formatDate(t.openedAt)}</span></TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{formatDate(t.resolvedAt)}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
