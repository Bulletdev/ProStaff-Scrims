import { cn } from '@/lib/utils'

type Variant = 'gold' | 'teal' | 'success' | 'danger' | 'muted'

interface RetroBadgeProps {
  children: React.ReactNode
  variant?: Variant
  className?: string
}

const variants: Record<Variant, string> = {
  gold:    'border-gold/40 bg-gold/10 text-gold',
  teal:    'border-teal/40 bg-teal/10 text-teal',
  success: 'border-success/40 bg-success/10 text-success',
  danger:  'border-danger/40 bg-danger/10 text-danger',
  muted:   'border-text-dim/40 bg-text-dim/10 text-text-muted',
}

export function RetroBadge({ children, variant = 'gold', className }: RetroBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
