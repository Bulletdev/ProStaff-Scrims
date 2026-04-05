'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { RetroBadge } from '@/components/ui/RetroBadge'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { AvailabilityWindow } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface WindowsResponse {
  data: {
    availability_windows: AvailabilityWindow[]
  }
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function padHour(h: number) {
  return String(h).padStart(2, '0') + ':00'
}

export default function AvailabilityPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    day_of_week: '1',
    start_hour: '18',
    end_hour: '22',
    region: '',
    tier_preference: 'any',
    focus_area: '',
    draft_type: '',
  })

  const DAYS = [
    { value: 0, label: t('availability.days.0') },
    { value: 1, label: t('availability.days.1') },
    { value: 2, label: t('availability.days.2') },
    { value: 3, label: t('availability.days.3') },
    { value: 4, label: t('availability.days.4') },
    { value: 5, label: t('availability.days.5') },
    { value: 6, label: t('availability.days.6') },
  ]

  const TIER_PREFS = [
    { value: 'any', label: t('availability.tier.any') },
    { value: 'same', label: t('availability.tier.same') },
    { value: 'adjacent', label: t('availability.tier.adjacent') },
  ]

  const DRAFT_TYPES = [
    { value: '', label: t('availability.draftType.any') },
    { value: 'md3', label: t('availability.draftType.md3') },
    { value: 'md5', label: t('availability.draftType.md5') },
    { value: 'md3_fearless', label: t('availability.draftType.md3_fearless') },
    { value: 'bo1', label: t('availability.draftType.bo1') },
  ]

  const FOCUS_AREAS = [
    { value: '', label: t('availability.focusArea.any') },
    { value: 'laning', label: t('availability.focusArea.laning') },
    { value: 'teamfight', label: t('availability.focusArea.teamfight') },
    { value: 'objectives', label: t('availability.focusArea.objectives') },
    { value: 'draft', label: t('availability.focusArea.draft') },
    { value: 'rotations', label: t('availability.focusArea.rotations') },
  ]

  const { data, isLoading, isError } = useQuery<WindowsResponse>({
    queryKey: ['availability-windows', token],
    queryFn: () => api.get('/matchmaking/availability-windows', { token: token! }),
    enabled: !!token,
  })

  const createWindow = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post('/matchmaking/availability-windows', body, { token: token! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-windows'] })
      setShowForm(false)
      setForm({ day_of_week: '1', start_hour: '18', end_hour: '22', region: '', tier_preference: 'any', focus_area: '', draft_type: '' })
    },
  })

  const deleteWindow = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/matchmaking/availability-windows/${id}`, { token: token! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-windows'] })
    },
  })

  const windows = data?.data?.availability_windows ?? []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createWindow.mutate({
      day_of_week: Number(form.day_of_week),
      start_hour: Number(form.start_hour),
      end_hour: Number(form.end_hour),
      region: form.region || undefined,
      tier_preference: form.tier_preference,
      focus_area: form.focus_area || undefined,
      draft_type: form.draft_type || undefined,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">{t('availability.title')}</h1>
          <p className="text-sm text-text-muted">{t('availability.subtitle')}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? t('availability.cancel') : t('availability.new')}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <RetroPanel title={t('availability.form.title')}>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                {t('availability.form.day')}
              </label>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                {t('availability.form.region')}
              </label>
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              >
                <option value="">{t('availability.allRegions')}</option>
                {['BR','NA','EUW','EUNE','LAN','LAS','OCE','KR','JP','TR','RU'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                {t('availability.form.startHour')}
              </label>
              <select
                value={form.start_hour}
                onChange={(e) => setForm({ ...form, start_hour: e.target.value })}
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>{padHour(h)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                {t('availability.form.endHour')}
              </label>
              <select
                value={form.end_hour}
                onChange={(e) => setForm({ ...form, end_hour: e.target.value })}
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>{padHour(h)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                {t('availability.form.tierPref')}
              </label>
              <select
                value={form.tier_preference}
                onChange={(e) => setForm({ ...form, tier_preference: e.target.value })}
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              >
                {TIER_PREFS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                {t('availability.form.draftType')}
              </label>
              <select
                value={form.draft_type}
                onChange={(e) => setForm({ ...form, draft_type: e.target.value })}
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              >
                {DRAFT_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                {t('availability.form.focusArea')}
              </label>
              <select
                value={form.focus_area}
                onChange={(e) => setForm({ ...form, focus_area: e.target.value })}
                className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
              >
                {FOCUS_AREAS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={createWindow.isPending}
              >
                {t('availability.form.submit')}
              </Button>
            </div>
            {createWindow.isError && (
              <p className="col-span-2 text-xs text-danger">
                {(createWindow.error as Error).message}
              </p>
            )}
          </form>
        </RetroPanel>
      )}

      {/* Windows list */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-sm bg-navy-card border border-gold/20" />
          ))}
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-danger">{t('availability.error')}</p>
      ) : windows.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          {t('availability.empty')}{' '}
          <button
            onClick={() => setShowForm(true)}
            className="text-gold hover:underline"
          >
            {t('availability.emptyLink')}
          </button>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {windows.map((window) => (
            <RetroPanel key={window.id}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-sm font-bold text-text-primary">
                      {window.day_name}
                    </div>
                    <div className="text-xs text-text-muted">{window.time_range}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RetroBadge variant={window.active ? 'teal' : 'muted'}>
                      {window.active ? t('availability.active') : t('availability.inactive')}
                    </RetroBadge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>
                    {window.region ? t('availability.region', { region: window.region }) : t('availability.allRegions')}
                  </span>
                  <span>{t('availability.tier', { tier: window.tier_preference })}</span>
                </div>
                {(window.draft_type || window.focus_area) && (
                  <div className="flex items-center gap-2">
                    {window.draft_type && (
                      <span className="rounded-sm border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[10px] text-gold uppercase tracking-wider">
                        {t(`availability.draftType.${window.draft_type}` as any)}
                      </span>
                    )}
                    {window.focus_area && (
                      <span className="rounded-sm border border-gold/20 bg-gold/5 px-2 py-0.5 font-mono text-[10px] text-gold/60 uppercase tracking-wider">
                        {t(`availability.focusArea.${window.focus_area}` as any)}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deleteWindow.isPending}
                    onClick={() => deleteWindow.mutate(window.id)}
                  >
                    {t('availability.remove')}
                  </Button>
                </div>
              </div>
            </RetroPanel>
          ))}
        </div>
      )}
    </div>
  )
}
