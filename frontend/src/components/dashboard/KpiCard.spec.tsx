import React from 'react';
import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { KpiCard } from './KpiCard';

describe('KpiCard', () => {
  it('deve renderizar título e valor', () => {
    render(<KpiCard title="SLA" value="95%" icon={Activity} />);

    expect(screen.getByText('SLA')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('deve renderizar skeleton quando loading for true', () => {
    const { container } = render(<KpiCard title="SLA" value="95%" icon={Activity} loading />);

    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });
});
