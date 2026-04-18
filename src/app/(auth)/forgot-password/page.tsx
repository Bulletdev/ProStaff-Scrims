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
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const { t } = useLanguage()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError(null)
      await api.post('/auth/forgot-password', { email: data.email })
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    }
  }

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
          {t('auth.forgotPassword.headerLink')}
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
            <p className="mt-2 text-sm text-text-muted">{t('auth.forgotPassword.subtitle')}</p>
          </div>

          <RetroPanel title={t('auth.forgotPassword.title')}>
            {sent ? (
              <div className="space-y-4">
                <div className="rounded-sm border border-gold/30 bg-gold/8 px-4 py-4">
                  <p className="font-mono text-xs font-semibold uppercase tracking-widest text-gold">
                    {t('auth.forgotPassword.successTitle')}
                  </p>
                  <p className="mt-2 text-sm text-text-muted leading-relaxed">
                    {t('auth.forgotPassword.successBody')}
                  </p>
                </div>
                <Link
                  href="/login"
                  className="block text-center font-mono text-xs text-gold hover:text-gold-light transition-colors"
                >
                  {t('auth.forgotPassword.backToLogin')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                    {error}
                  </p>
                )}

                <div className="space-y-1">
                  <label className="font-mono text-xs text-text-muted">
                    {t('auth.forgotPassword.email')}
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                    placeholder="team@org.gg"
                  />
                  {errors.email && (
                    <p className="text-xs text-danger">{errors.email.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" loading={isSubmitting}>
                  {t('auth.forgotPassword.submit')}
                </Button>

                <p className="text-center text-xs text-text-muted">
                  <Link
                    href="/login"
                    className="text-gold hover:text-gold-light transition-colors"
                  >
                    {t('auth.forgotPassword.backToLogin')}
                  </Link>
                </p>
              </form>
            )}
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
