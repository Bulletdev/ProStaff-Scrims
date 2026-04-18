'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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

const passwordSchema = z
  .string()
  .min(8, 'Must be at least 8 characters')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/\d/, 'Must contain at least one number')

const schema = z
  .object({
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
    { label: t('auth.resetPassword.strength.chars'), ok: value.length >= 8 },
    { label: t('auth.resetPassword.strength.upper'), ok: /[A-Z]/.test(value) },
    { label: t('auth.resetPassword.strength.lower'), ok: /[a-z]/.test(value) },
    { label: t('auth.resetPassword.strength.number'), ok: /\d/.test(value) },
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

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [error, setError] = useState<string | null>(null)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      router.replace('/forgot-password')
    }
  }, [token, router])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' })

  const onSubmit = async (data: FormData) => {
    if (!token) return
    try {
      setError(null)
      await api.post('/auth/reset-password', {
        token,
        password: data.password,
        password_confirmation: data.password_confirmation,
      })
      router.replace('/login')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    }
  }

  if (!token) return null

  return (
    <RetroPanel title={t('auth.resetPassword.title')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="font-mono text-xs text-text-muted">
            {t('auth.resetPassword.password')}
          </label>
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
          <label className="font-mono text-xs text-text-muted">
            {t('auth.resetPassword.passwordConfirmation')}
          </label>
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
          {t('auth.resetPassword.submit')}
        </Button>
      </form>
    </RetroPanel>
  )
}

export default function ResetPasswordPage() {
  const { t } = useLanguage()

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{
        backgroundImage: 'url(/backgrownd/login.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <header className="relative z-10 flex items-center justify-between border-b border-gold/15 px-6 py-3">
        <Link
          href="/login"
          className="flex items-center gap-2 text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-mono text-xs tracking-widest">{t('common.back')}</span>
        </Link>

        <div />

        <Link
          href="/login"
          className="font-mono text-xs tracking-widest text-gold hover:text-gold-light transition-colors"
        >
          {t('auth.resetPassword.headerLink')}
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/" className="flex justify-center">
              <Image
                src="/scrimlogo.png"
                alt="scrims.lol"
                width={180}
                height={194}
                quality={100}
                priority
              />
            </Link>
            <p className="mt-2 text-sm text-text-muted">{t('auth.resetPassword.subtitle')}</p>
          </div>

          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
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
