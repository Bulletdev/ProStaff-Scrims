'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useLanguage } from '@/contexts/LanguageContext'

const REGIONS = ['br', 'na', 'euw', 'eune', 'las', 'lan', 'oce', 'kr', 'jp']

// Espelha exatamente a validação do User model da prostaff-api:
// length >= 8, /\A(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*\z/
const passwordSchema = z
  .string()
  .min(8, 'Must be at least 8 characters')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/\d/, 'Must contain at least one number')

const schema = z
  .object({
    organization_name: z.string().min(2, 'Team name must be at least 2 characters'),
    region: z.string().min(1, 'Region is required'),
    full_name: z.string().min(2, 'Your name is required'),
    email: z.string().email('Invalid email'),
    password: passwordSchema,
    password_confirmation: z.string(),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

type FormData = z.infer<typeof schema>

function PasswordStrength({ value, t }: { value: string; t: (key: string) => string }) {
  const checks = [
    { label: t('auth.register.strength.chars'),  ok: value.length >= 8 },
    { label: t('auth.register.strength.upper'),  ok: /[A-Z]/.test(value) },
    { label: t('auth.register.strength.lower'),  ok: /[a-z]/.test(value) },
    { label: t('auth.register.strength.number'), ok: /\d/.test(value) },
  ]
  const score = checks.filter((c) => c.ok).length

  const barColor =
    score <= 1 ? 'bg-danger' :
    score === 2 ? 'bg-gold' :
    score === 3 ? 'bg-gold-light' :
    'bg-success'

  if (!value) return null

  return (
    <div className="mt-2 space-y-2">
      {/* Barra de força */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? barColor : 'bg-navy-border'
            }`}
          />
        ))}
      </div>
      {/* Checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`font-mono text-[10px] transition-colors ${
              c.ok ? 'text-success' : 'text-text-dim'
            }`}
          >
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const { t } = useLanguage()
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' })

  const onSubmit = async (data: FormData) => {
    try {
      setError(null)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
      }
      window.location.href = '/dashboard'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col" style={{ backgroundImage: 'url(/backgrownd/register.webp)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-gold/15 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-text-muted transition-colors hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-mono text-xs tracking-widest">{t('common.back')}</span>
        </Link>

        <div />

        <Link href="/login" className="font-mono text-xs tracking-widest text-gold hover:text-gold-light transition-colors">
          {t('auth.register.headerLink')}
        </Link>
      </header>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="flex justify-center">
            <Image src="/scrimlogo.png" alt="scrims.lol" width={180} height={194} quality={100} priority />
          </Link>
          <p className="text-sm text-text-muted">{t('auth.register.subtitle')}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-gold/25 bg-gold/8 px-3 py-1.5">
            <span className="font-mono text-[10px] tracking-wide text-gold/80">
              {t('auth.register.prostaff')}
            </span>
          </div>
        </div>

        <RetroPanel title={t('auth.register.title')}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <div className="space-y-1">
              <label className="font-mono text-xs text-text-muted">{t('auth.register.orgName')}</label>
              <input
                {...register('organization_name')}
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                placeholder="Team Liquid"
              />
              {errors.organization_name && <p className="text-xs text-danger">{errors.organization_name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-text-muted">{t('auth.register.region')}</label>
              <select
                {...register('region')}
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              >
                <option value="">{t('auth.register.regionPlaceholder')}</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r.toUpperCase()}</option>
                ))}
              </select>
              {errors.region && <p className="text-xs text-danger">{errors.region.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-text-muted">{t('auth.register.fullName')}</label>
              <input
                {...register('full_name')}
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                placeholder={t('auth.register.fullNamePlaceholder')}
              />
              {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-text-muted">{t('auth.register.email')}</label>
              <input
                {...register('email')}
                type="email"
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                placeholder="team@org.gg"
              />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-text-muted">{t('auth.register.password')}</label>
              <input
                {...register('password')}
                type="password"
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              />
              <PasswordStrength value={passwordValue} t={t} />
              {errors.password && (
                <p className="text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-text-muted">{t('auth.register.confirmPassword')}</label>
              <input
                {...register('password_confirmation')}
                type="password"
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              />
              {errors.password_confirmation && (
                <p className="text-xs text-danger">{errors.password_confirmation.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              {t('auth.register.submit')}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-text-muted">
            {t('auth.register.hasAccount')}{' '}
            <Link href="/login" className="text-gold hover:text-gold-light transition-colors">
              {t('auth.register.loginLink')}
            </Link>
          </p>
        </RetroPanel>
      </div>
      </div>

      <footer className="relative z-10 border-t border-gold/15 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 flex-wrap">
          <span className="font-mono text-[11px] tracking-[2px] text-white/20">
            © 2025 scrims.lol
          </span>
          <a
            href="https://prostaff.gg"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 opacity-40 transition-opacity hover:opacity-90"
          >
            <span className="font-mono text-[11px] tracking-[2px] text-white/60 uppercase">
              {t('landing.footer.poweredBy')}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/PROSTAFFLOGO.png" alt="ProStaff" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/prostaffgg.png" alt="ProStaff.gg" style={{ height: 19, width: 'auto', objectFit: 'contain' }} />
          </a>
        </div>
      </footer>
    </div>
  )
}
