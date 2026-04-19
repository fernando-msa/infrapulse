import { Badge } from '@/components/ui/badge';
import type { TicketStatus, TicketPriority, SlaStatus } from '@/types';

export function StatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, { label: string; variant: any }> = {
    ABERTO: { label: 'Aberto', variant: 'info' },
    EM_ANDAMENTO: { label: 'Em Andamento', variant: 'warning' },
    PENDENTE: { label: 'Pendente', variant: 'secondary' },
    CONCLUIDO: { label: 'Concluído', variant: 'success' },
    CANCELADO: { label: 'Cancelado', variant: 'outline' },
  };
  const { label, variant } = map[status] || { label: status, variant: 'outline' };
  return <Badge variant={variant} className="shadow-sm">{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const map: Record<TicketPriority, { label: string; variant: any }> = {
    BAIXA: { label: 'Baixa', variant: 'success' },
    MEDIA: { label: 'Média', variant: 'info' },
    ALTA: { label: 'Alta', variant: 'warning' },
    CRITICA: { label: 'Crítica', variant: 'danger' },
  };
  const { label, variant } = map[priority] || { label: priority, variant: 'outline' };
  return <Badge variant={variant} className="shadow-sm">{label}</Badge>;
}

export function SlaBadge({ slaStatus }: { slaStatus: SlaStatus }) {
  const map: Record<SlaStatus, { label: string; variant: any }> = {
    OK: { label: 'SLA OK', variant: 'success' },
    EM_RISCO: { label: 'Em Risco', variant: 'warning' },
    VIOLADO: { label: 'Violado', variant: 'danger' },
  };
  const { label, variant } = map[slaStatus] || { label: slaStatus, variant: 'outline' };
  return <Badge variant={variant} className="shadow-sm">{label}</Badge>;
}
