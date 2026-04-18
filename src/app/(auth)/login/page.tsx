'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useLanguage } from '@/contexts/LanguageContext'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const { t } = useLanguage()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError(null)
      const res = await fetch('/api/auth/login', {
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
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col" style={{ backgroundImage: 'url(/backgrownd/login.webp)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-gold/15 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-text-muted transition-colors hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-mono text-xs tracking-widest">{t('common.back')}</span>
        </Link>

        <div />

        <Link href="/register" className="font-mono text-xs tracking-widest text-gold hover:text-gold-light transition-colors">
          {t('auth.login.headerLink')}
        </Link>
      </header>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="flex justify-center">
            <Image src="/scrimlogo.png" alt="scrims.lol" width={180} height={194} quality={100} priority />
          </Link>
          <p className="mt-2 text-sm text-text-muted">{t('auth.login.subtitle')}</p>
        </div>

        <RetroPanel title={t('auth.login.title')}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <div className="space-y-1">
              <label className="font-mono text-xs text-text-muted">{t('auth.login.email')}</label>
              <input
                {...register('email')}
                type="email"
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                placeholder="team@org.gg"
              />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-text-muted">{t('auth.login.password')}</label>
              <input
                {...register('password')}
                type="password"
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              />
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              {t('auth.login.submit')}
            </Button>

            <p className="text-center">
              <Link href="/forgot-password" className="font-mono text-xs text-text-muted hover:text-gold transition-colors">
                {t('auth.login.forgotPassword')}
              </Link>
            </p>
          </form>

          <p className="mt-4 text-center text-xs text-text-muted">
            {t('auth.login.noAccount')}{' '}
            <Link href="/register" className="text-gold hover:text-gold-light transition-colors">
              {t('auth.login.registerLink')}
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
