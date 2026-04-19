import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
}

const colorMap = {
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-600 text-white', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', icon: 'bg-green-600 text-white', text: 'text-green-600' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-500 text-white', text: 'text-yellow-600' },
  red: { bg: 'bg-red-50', icon: 'bg-red-600 text-white', text: 'text-red-600' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-600 text-white', text: 'text-purple-600' },
};

export function KpiCard({ title, value, subtitle, icon: Icon, color = 'blue', loading }: KpiCardProps) {
  const colors = colorMap[color];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden border border-slate-200/80 bg-white/85 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur', colors.bg)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
            <p className={cn('text-3xl font-semibold tracking-tight text-slate-950', colors.text)}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn('rounded-2xl p-2.5 shadow-sm', colors.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
