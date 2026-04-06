'use client'

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { useAuth } from '@/hooks/useAuth'
import { tierLabel } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

const REGIONS = ['BR', 'NA', 'EUW', 'EUNE', 'LAN', 'LAS', 'OCE', 'KR', 'JP', 'TR', 'RU']

interface OrgForm {
  name: string
  region: string
  public_tagline: string
}

interface AccountForm {
  discord_user_id: string
}

export default function SettingsPage() {
  const token = useToken()
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { organization, user, isLoading } = useAuth()

  const [form, setForm] = useState<OrgForm>({
    name: '',
    region: '',
    public_tagline: '',
  })

  const [accountForm, setAccountForm] = useState<AccountForm>({
    discord_user_id: '',
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name ?? '',
        region: organization.region ?? '',
        public_tagline: organization.public_tagline ?? '',
      })
      if (organization.logo_url) setLogoPreview(organization.logo_url)
    }
  }, [organization])

  useEffect(() => {
    if (user) {
      setAccountForm({ discord_user_id: user.discord_user_id ?? '' })
    }
  }, [user])

  const updateOrg = useMutation({
    mutationFn: (body: Partial<OrgForm>) =>
      api.patch(`/organizations/${organization!.id}`, body, { token: token! }),
    onSuccess: () => {
      toast.success(t('settings.saved'))
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateAccount = useMutation({
    mutationFn: (body: AccountForm) =>
      fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: body }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success(t('settings.accountSaved'))
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/organizations/${organization!.id}/logo`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
      }
      return res.json() as Promise<{ logo_url: string }>
    },
    onSuccess: (data) => {
      setLogoPreview(data.logo_url)
      toast.success(t('settings.logoSaved'))
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadLogo.mutate(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateOrg.mutate({
      name: form.name,
      region: form.region,
      public_tagline: form.public_tagline || undefined,
    })
  }

  function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateAccount.mutate({ discord_user_id: accountForm.discord_user_id })
  }

  const inputClass =
    'w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none'

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-mono text-xl font-bold text-text-primary">{t('settings.title')}</h1>
        <p className="text-sm text-text-muted">{t('settings.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-sm bg-navy-deep border border-gold/20" />
          ))}
        </div>
      ) : (
        <RetroPanel title={t('settings.panel')}>
          {/* Logo upload */}
          <div className="mb-5 flex items-center gap-4">
            <div
              className="relative flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-gold/30 bg-navy-deep"
              onClick={() => logoInputRef.current?.click()}
              title={t('settings.logo.upload')}
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="font-mono text-xs text-text-muted">LOGO</span>
              )}
              {uploadLogo.isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-navy-deep/70">
                  <span className="font-mono text-[10px] text-gold">...</span>
                </div>
              )}
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
                {t('settings.logo.title')}
              </p>
              <p className="mt-0.5 text-[11px] text-text-dim">{t('settings.logo.hint')}</p>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="mt-1 font-mono text-[11px] text-gold underline underline-offset-2 opacity-70 hover:opacity-100"
              >
                {t('settings.logo.upload')}
              </button>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                  {t('settings.form.name')}
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('settings.form.namePlaceholder')}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                  {t('settings.form.region')}
                </label>
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className={inputClass}
                >
                  <option value="">{t('settings.form.regionPlaceholder')}</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                  {t('settings.form.tier')}
                </label>
                <div className={`${inputClass} cursor-default opacity-60`}>
                  {organization?.tier ? tierLabel(organization.tier) : t('settings.form.tierPlaceholder')}
                </div>
                <p className="text-[11px] text-text-dim">{t('settings.tier.readOnly')}</p>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                  {t('settings.form.tagline')}
                </label>
                <input
                  type="text"
                  value={form.public_tagline}
                  onChange={(e) => setForm({ ...form, public_tagline: e.target.value })}
                  placeholder={t('settings.form.taglinePlaceholder')}
                  maxLength={120}
                  className={inputClass}
                />
                <p className="text-[11px] text-text-dim">{form.public_tagline.length}/120</p>
              </div>

            </div>

            <div className="flex items-center justify-between pt-2">
              {updateOrg.isError && (
                <p className="text-xs text-danger">
                  {(updateOrg.error as Error).message}
                </p>
              )}
              <div className="ml-auto">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={updateOrg.isPending}
                >
                  {t('settings.submit')}
                </Button>
              </div>
            </div>
          </form>
        </RetroPanel>
      )}

      {/* Account panel — user-level settings */}
      <RetroPanel title={t('settings.account.title')}>
        <form onSubmit={handleAccountSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
              {t('settings.account.discordId')}
            </label>
            <input
              type="text"
              value={accountForm.discord_user_id}
              onChange={(e) => setAccountForm({ discord_user_id: e.target.value })}
              placeholder={t('settings.account.discordIdPlaceholder')}
              className={inputClass}
              pattern="\d{17,20}"
              title={t('settings.account.discordIdHint')}
            />
            <p className="text-[11px] text-text-dim">{t('settings.account.discordIdHint')}</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            {updateAccount.isError && (
              <p className="text-xs text-danger">
                {(updateAccount.error as Error).message}
              </p>
            )}
            <div className="ml-auto">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={updateAccount.isPending}
              >
                {t('settings.submit')}
              </Button>
            </div>
          </div>
        </form>
      </RetroPanel>

      {/* Info panel */}
      {organization && (
        <RetroPanel title={t('settings.info')}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">{t('settings.slug')}</span>
              <span className="font-mono text-text-primary">{organization.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">{t('settings.id')}</span>
              <span className="font-mono text-xs text-text-dim">{organization.id}</span>
            </div>
          </div>
        </RetroPanel>
      )}
    </div>
  )
}
