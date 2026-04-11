import { describe, expect, it, vi } from 'vitest';
import { cn, formatDateOnly, slaTimeRemaining, timeAgo } from './utils';

describe('utils', () => {
  it('cn deve mesclar classes com conflito tailwind', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('formatDateOnly deve retornar placeholder quando data não existir', () => {
    expect(formatDateOnly(null)).toBe('—');
  });

  it('timeAgo deve retornar minutos para datas recentes', () => {
    const now = new Date('2026-04-10T10:10:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const date = new Date('2026-04-10T10:00:00.000Z');
    expect(timeAgo(date)).toBe('10min atrás');

    vi.useRealTimers();
  });

  it('slaTimeRemaining deve indicar vencido quando prazo passar', () => {
    const now = new Date('2026-04-10T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const deadline = new Date('2026-04-10T09:30:00.000Z');
    expect(slaTimeRemaining(deadline)).toContain('Vencido há');

    vi.useRealTimers();
  });
});
