import { cn } from '@/lib/utils'

interface RetroPanelProps {
  children: React.ReactNode
  className?: string
  title?: string
  badge?: string
  noPadding?: boolean
}

export function RetroPanel({ children, className, title, badge, noPadding }: RetroPanelProps) {
  return (
    <div
      className={cn(
        'relative rounded-sm border border-gold/20 bg-navy-card scanlines',
        className
      )}
    >
      {/* Corner brackets */}
      <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-gold/50" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-gold/50" />

      {title && (
        <div className="flex items-center justify-between border-b border-gold/15 bg-gradient-to-r from-gold/10 to-transparent px-4 py-3">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-gold">
            {title}
          </span>
          {badge && (
            <span className="rounded-sm border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-xs text-gold">
              {badge}
            </span>
          )}
        </div>
      )}

      <div className={cn(!noPadding && 'p-4')}>{children}</div>
    </div>
  )
}
