import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageMeta {
  label: string;
  value: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: PageMeta[];
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <section className={cn('relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur', className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(8,145,178,0.14),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.1),_transparent_30%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">{eyebrow}</p>}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{title}</h1>
            {description && <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-[15px]">{description}</p>}
          </div>
          {meta && meta.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {meta.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-slate-950">{item.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </section>
  );
}