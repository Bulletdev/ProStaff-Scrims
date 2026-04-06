'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { RetroBadge } from '@/components/ui/RetroBadge'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { MatchSuggestion } from '@/types'
import { tierLabel } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

interface SuggestionsResponse {
  data: {
    suggestions: MatchSuggestion[]
  }
}

const REGIONS = ['BR', 'NA', 'EUW', 'EUNE', 'LAN', 'LAS', 'OCE', 'KR', 'JP']

export default function MatchmakingPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const [regionFilter, setRegionFilter] = useState('')
  const [openInviteId, setOpenInviteId] = useState<string | null>(null)
  const [inviteForm, setInviteForm] = useState({ message: '', proposed_at: '', format: 'md3' })
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery<SuggestionsResponse>({
    queryKey: ['matchmaking-suggestions', token],
    queryFn: () => api.get('/matchmaking/suggestions', { token: token! }),
    enabled: !!token,
  })

  const sendRequest = useMutation({
    mutationFn: ({ orgId, body }: { orgId: string; body: Record<string, unknown> }) =>
      api.post('/matchmaking/scrim-requests', { target_organization_id: orgId, ...body }, { token: token! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrim-requests'] })
      setOpenInviteId(null)
      setInviteForm({ message: '', proposed_at: '', format: 'md3' })
    },
  })

  const suggestions = data?.data?.suggestions ?? []
  const filtered = regionFilter
    ? suggestions.filter((s) => s.organization.region === regionFilter)
    : suggestions

  // Group windows by org, keeping the highest score
  const grouped = Object.values(
    filtered.reduce<Record<string, { organization: MatchSuggestion['organization']; score: number; windows: MatchSuggestion['availability_window'][] }>>(
      (acc, s) => {
        const id = s.organization.id
        if (!acc[id]) {
          acc[id] = { organization: s.organization, score: s.score, windows: [] }
        } else if (s.score > acc[id].score) {
          acc[id].score = s.score
        }
        const key = `${s.availability_window.day_name}|${s.availability_window.time_range}`
        if (!acc[id].windows.some(w => `${w.day_name}|${w.time_range}` === key)) {
          acc[id].windows.push(s.availability_window)
        }
        return acc
      },
      {}
    )
  )

  const DAY_INDEX: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  }

  function nextOccurrence(dayName: string, startHour: number): string {
    const targetDay = DAY_INDEX[dayName.toLowerCase()] ?? 0
    const now = new Date()
    const date = new Date(now)
    const todayDay = now.getDay()
    let daysAhead = targetDay - todayDay
    if (daysAhead < 0 || (daysAhead === 0 && now.getHours() >= startHour)) daysAhead += 7
    date.setDate(now.getDate() + daysAhead)
    date.setHours(startHour, 0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(startHour)}:00`
  }

  function handleWindowSelect(window: MatchSuggestion['availability_window']) {
    setSelectedWindowId(window.id)
    setInviteForm((f) => ({ ...f, proposed_at: nextOccurrence(window.day_name, window.start_hour) }))
  }

  const FORMAT_MAP: Record<string, { games_planned: number; draft_type: string }> = {
    bo1:          { games_planned: 1, draft_type: 'bo1' },
    md3:          { games_planned: 3, draft_type: 'md3' },
    md5:          { games_planned: 5, draft_type: 'md5' },
    md3_fearless: { games_planned: 3, draft_type: 'md3_fearless' },
  }

  function handleInviteSubmit(e: React.FormEvent, orgId: string) {
    e.preventDefault()
    const fmt = FORMAT_MAP[inviteForm.format] ?? FORMAT_MAP.md3
    sendRequest.mutate({
      orgId,
      body: {
        message: inviteForm.message || undefined,
        // Convert local datetime to ISO so the API stores correct UTC
        proposed_at: inviteForm.proposed_at
          ? new Date(inviteForm.proposed_at).toISOString()
          : undefined,
        games_planned: fmt.games_planned,
        draft_type: fmt.draft_type,
      },
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-mono text-xl font-bold text-text-primary">{t('matchmaking.title')}</h1>
        <p className="text-sm text-text-muted">
          {t('matchmaking.subtitle')}
        </p>
      </div>

      {/* Region filter */}
      <div className="flex items-center gap-3">
        <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
          {t('matchmaking.regionLabel')}
        </label>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
        >
          <option value="">{t('matchmaking.allRegions')}</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Suggestions grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-sm bg-navy-card border border-gold/20" />
          ))}
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-danger">{t('matchmaking.error')}</p>
      ) : grouped.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          {t('matchmaking.empty')}
        </p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {grouped.map(({ organization: org, score, windows }) => {
            const isOpen = openInviteId === org.id
            return (
              <div
                key={org.id}
                className="rounded-sm border border-gold/20 bg-navy-card"
              >
                {/* Card header corner brackets */}
                <div className="relative p-4">
                  <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-gold/50" />
                  <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-gold/50" />

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-text-primary truncate">
                          {org.name}
                        </span>
                        {org.tier && (
                          <RetroBadge variant="gold">{tierLabel(org.tier)}</RetroBadge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                        <span>{org.region}</span>
                        {org.avg_tier && (
                          <>
                            <span className="text-text-dim">·</span>
                            <span>{t('matchmaking.avgTier', { tier: org.avg_tier })}</span>
                          </>
                        )}
                        {(org.scrims_won != null && org.scrims_lost != null) && (
                          <>
                            <span className="text-text-dim">·</span>
                            <span className="text-success">{org.scrims_won}W</span>
                            <span className="text-danger">{org.scrims_lost}L</span>
                          </>
                        )}
                      </div>
                      {org.public_tagline && (
                        <div className="mt-1 text-xs text-text-muted truncate italic">
                          {org.public_tagline}
                        </div>
                      )}
                      {/* Unique focus areas and draft types across all windows */}
                      {(() => {
                        const focuses = [...new Set(windows.map(w => w.focus_area).filter((v): v is string => !!v))]
                        const drafts  = [...new Set(windows.map(w => w.draft_type).filter((v): v is string => !!v))]
                        const tierPrefs = [...new Set(windows.map(w => w.tier_preference).filter((v): v is string => !!v && v !== 'any'))]
                        return (focuses.length > 0 || drafts.length > 0 || tierPrefs.length > 0) ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {focuses.map(f => (
                              <span key={f} className="rounded-sm border border-teal-bright/20 bg-teal-bright/5 px-1.5 py-0.5 font-mono text-[10px] text-teal-bright/70">
                                {t(`availability.focusArea.${f}`, { defaultValue: f })}
                              </span>
                            ))}
                            {drafts.map(d => (
                              <span key={d} className="rounded-sm border border-gold/20 bg-gold/5 px-1.5 py-0.5 font-mono text-[10px] text-gold/70">
                                {t(`availability.draftType.${d}`, { defaultValue: d })}
                              </span>
                            ))}
                            {tierPrefs.map(p => (
                              <span key={p} className="rounded-sm border border-gold/10 px-1.5 py-0.5 font-mono text-[10px] text-text-dim">
                                {t(`availability.tier.${p}`, { defaultValue: p })}
                              </span>
                            ))}
                          </div>
                        ) : null
                      })()}
                      <div className="mt-2 space-y-0.5">
                        {windows.map((w) => (
                          <div key={w.id} className="grid grid-cols-[100px_1fr] gap-x-2 text-xs text-text-muted">
                            <span className="capitalize">{w.day_name}</span>
                            <span>{w.time_range}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-mono text-xs text-text-muted">
                        {t('matchmaking.score', { value: score.toFixed(2) })}
                      </span>
                      <Button
                        variant={isOpen ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => {
                          setOpenInviteId(isOpen ? null : org.id)
                          setSelectedWindowId(null)
                          setInviteForm({ message: '', proposed_at: '', format: 'md3' })
                        }}
                      >
                        {isOpen ? t('matchmaking.close') : t('matchmaking.invite')}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Inline invite form */}
                {isOpen && (
                  <div className="border-t border-gold/15 bg-navy-deep p-4">
                    <form
                      onSubmit={(e) => handleInviteSubmit(e, org.id)}
                      className="space-y-3"
                    >
                      <div className="space-y-1">
                        <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                          {t('matchmaking.form.window')}
                        </label>
                        <div className="space-y-1">
                          {windows.map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => handleWindowSelect(w)}
                              className={`grid w-full grid-cols-[100px_1fr] gap-x-2 rounded-sm border px-3 py-2 text-left text-xs transition-colors ${
                                selectedWindowId === w.id
                                  ? 'border-gold/60 bg-gold/10 text-text-primary'
                                  : 'border-gold/20 bg-navy-deep text-text-muted hover:border-gold/40'
                              }`}
                            >
                              <span className="capitalize">{w.day_name}</span>
                              <span>{w.time_range}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                          {t('matchmaking.form.message')}
                        </label>
                        <textarea
                          rows={2}
                          value={inviteForm.message}
                          onChange={(e) =>
                            setInviteForm({ ...inviteForm, message: e.target.value })
                          }
                          placeholder={t('matchmaking.form.messagePlaceholder')}
                          className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none resize-none"
                        />
                      </div>
                      {inviteForm.proposed_at && (
                        <div className="space-y-1">
                          <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                            {t('matchmaking.form.proposedAt')}
                          </label>
                          <div className="rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-muted">
                            {new Date(inviteForm.proposed_at).toLocaleString('pt-BR', {
                              weekday: 'long', day: '2-digit', month: '2-digit',
                              year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                          {t('matchmaking.form.format')}
                        </label>
                        <select
                          value={inviteForm.format}
                          onChange={(e) => setInviteForm({ ...inviteForm, format: e.target.value })}
                          className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                        >
                          <option value="bo1">{t('scrims.draftType.bo1')}</option>
                          <option value="md3">{t('scrims.draftType.md3')}</option>
                          <option value="md5">{t('scrims.draftType.md5')}</option>
                          <option value="md3_fearless">{t('scrims.draftType.md3_fearless')}</option>
                        </select>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          loading={sendRequest.isPending}
                        >
                          {t('matchmaking.form.submit')}
                        </Button>
                      </div>
                      {sendRequest.isError && (
                        <p className="text-xs text-danger">
                          {(sendRequest.error as Error).message}
                        </p>
                      )}
                    </form>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
