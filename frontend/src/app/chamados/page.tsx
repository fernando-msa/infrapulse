'use client';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge, SlaBadge } from '@/components/tickets/TicketBadges';
import { ticketsApi } from '@/lib/api';
import { formatDate, slaTimeRemaining } from '@/lib/utils';
import { Search, Filter, RefreshCw, Clock } from 'lucide-react';
import type { Ticket, TicketStatus, TicketPriority } from '@/types';

export default function ChamadosPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await ticketsApi.list(filters);
      setTickets(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, [filters]);

  const filtered = tickets.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.sector?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  const setFilter = (key: string, value: string) => {
    if (!value || value === 'TODOS') {
      const f = { ...filters };
      delete f[key];
      setFilters(f);
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Gestão de fila"
          title="Chamados"
          description="Consulta, filtro e acompanhamento do backlog com foco em prioridade, SLA e técnico responsável."
          meta={[
            { label: 'Encontrados', value: loading ? '—' : `${filtered.length}` },
            { label: 'Filtros', value: `${Object.keys(filters).length}` },
          ]}
          actions={(
            <Button variant="outline" size="sm" onClick={loadTickets}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          )}
        />

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, setor, categoria..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select onValueChange={(v) => setFilter('status', v)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  <SelectItem value="ABERTO">Aberto</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(v) => setFilter('priority', v)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas as prioridades</SelectItem>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                  <SelectItem value="MEDIA">Média</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="CRITICA">Crítica</SelectItem>
                </SelectContent>
              </Select>

              <Select onValueChange={(v) => setFilter('slaStatus', v)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="SLA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos SLA</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="EM_RISCO">Em Risco</SelectItem>
                  <SelectItem value="VIOLADO">Violado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Nenhum chamado encontrado</p>
                <p className="text-sm">Tente ajustar os filtros</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chamado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Aberto em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground">{ticket.sector} {ticket.category && `· ${ticket.category}`}</p>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={ticket.status} /></TableCell>
                      <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                      <TableCell><SlaBadge slaStatus={ticket.slaStatus} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className={ticket.slaStatus === 'VIOLADO' ? 'text-red-600 font-medium' : ticket.slaStatus === 'EM_RISCO' ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}>
                            {slaTimeRemaining(ticket.slaDeadline)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{ticket.assignedTo?.name || <span className="text-muted-foreground">—</span>}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{formatDate(ticket.openedAt)}</span>
                      </TableCell>
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
