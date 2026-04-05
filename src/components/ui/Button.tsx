import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:   'bg-gold text-navy font-semibold hover:bg-gold-light shadow-gold hover:shadow-gold-lg',
  secondary: 'bg-navy-deep text-text-primary border border-gold/30 hover:border-gold/60 hover:bg-gold/5',
  outline:   'border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold',
  ghost:     'text-text-muted hover:text-text-primary hover:bg-navy-deep',
  danger:    'bg-danger/10 text-danger border border-danger/40 hover:bg-danger/20',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-sm',
  md: 'px-4 py-2 text-sm rounded-sm',
  lg: 'px-6 py-3 text-base rounded-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-mono transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
