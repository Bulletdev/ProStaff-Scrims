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
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          {t('matchmaking.empty')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((suggestion) => {
            const org = suggestion.organization
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
                      <div className="mt-1 text-xs text-text-muted">{org.region}</div>
                      {org.public_tagline && (
                        <div className="mt-1 text-xs text-text-muted truncate italic">
                          {org.public_tagline}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-text-muted">
                        {suggestion.availability_window.day_name} —{' '}
                        {suggestion.availability_window.time_range}{' '}
                        <span className="text-text-dim">
                          ({suggestion.availability_window.timezone})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-mono text-xs text-text-muted">
                        {t('matchmaking.score', { value: suggestion.score.toFixed(2) })}
                      </span>
                      <Button
                        variant={isOpen ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => {
                          setOpenInviteId(isOpen ? null : org.id)
                          // Default to tomorrow at 20:00 (local time)
                          const tomorrow = new Date()
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          tomorrow.setHours(20, 0, 0, 0)
                          const pad = (n: number) => String(n).padStart(2, '0')
                          const defaultAt = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`
                          setInviteForm({ message: '', proposed_at: defaultAt, format: 'md3' })
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
                      <div className="space-y-1">
                        <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
                          {t('matchmaking.form.proposedAt')}
                        </label>
                        <input
                          type="datetime-local"
                          value={inviteForm.proposed_at}
                          onChange={(e) =>
                            setInviteForm({ ...inviteForm, proposed_at: e.target.value })
                          }
                          className="w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                        />
                      </div>
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
