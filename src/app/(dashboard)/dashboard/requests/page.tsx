'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { RetroBadge } from '@/components/ui/RetroBadge'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { ScrimRequest, RosterPlayer } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { tierLabel } from '@/lib/utils'

interface RequestsResponse {
  data: {
    sent: ScrimRequest[]
    received: ScrimRequest[]
    pending_count: number
  }
}

const ROLE_ICON: Record<string, string> = {
  top: 'TOP', jungle: 'JG', mid: 'MID', adc: 'ADC', support: 'SUP',
}

const DRAFT_LABEL: Record<string, string> = {
  bo1: '1 Game', md3: 'MD3', md5: 'MD5', md3_fearless: 'MD3 Fearless',
}

function statusVariant(status: string): 'gold' | 'teal' | 'muted' | 'danger' {
  if (status === 'pending') return 'gold'
  if (status === 'accepted') return 'teal'
  if (status === 'declined' || status === 'cancelled') return 'danger'
  return 'muted'
}

function formatDate(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Tab = 'received' | 'sent'

export default function RequestsPage() {
  const token = useToken()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>('received')

  const { data, isLoading, isError } = useQuery<RequestsResponse>({
    queryKey: ['scrim-requests', token],
    queryFn: () => api.get('/matchmaking/scrim-requests', { token: token! }),
    enabled: !!token,
  })

  const patchRequest = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' | 'cancel' }) =>
      api.patch(`/matchmaking/scrim-requests/${id}/${action}`, {}, { token: token! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrim-requests'] })
    },
  })

  const pendingCount = data?.data?.pending_count ?? 0
  const received = data?.data?.received ?? []
  const sent = data?.data?.sent ?? []
  const activeList = tab === 'received' ? received : sent

  function statusLabel(status: string) {
    if (status === 'pending') return t('requests.status.pending')
    if (status === 'accepted') return t('requests.status.accepted')
    if (status === 'declined') return t('requests.status.declined')
    if (status === 'cancelled') return t('requests.status.cancelled')
    return status
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-bold text-text-primary">{t('requests.title')}</h1>
            {pendingCount > 0 && (
              <span className="rounded-sm bg-gold px-2 py-0.5 font-mono text-xs font-bold text-navy">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted">{t('requests.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gold/15">
        <button
          onClick={() => setTab('received')}
          className={[
            'px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors',
            tab === 'received'
              ? 'border-b-2 border-gold text-gold'
              : 'text-text-muted hover:text-text-primary',
          ].join(' ')}
        >
          {t('requests.tab.received')}
          {received.filter((r) => r.pending).length > 0 && (
            <span className="ml-2 rounded-sm bg-gold/20 px-1.5 py-0.5 text-gold">
              {received.filter((r) => r.pending).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={[
            'px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors',
            tab === 'sent'
              ? 'border-b-2 border-gold text-gold'
              : 'text-text-muted hover:text-text-primary',
          ].join(' ')}
        >
          {t('requests.tab.sent')}
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-sm bg-navy-card border border-gold/20" />
          ))}
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-danger">{t('requests.error')}</p>
      ) : activeList.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          {tab === 'received'
            ? t('requests.empty.received')
            : t('requests.empty.sent')}
        </p>
      ) : (
        <div className="space-y-3">
          {activeList.map((req) => {
            const fromOrg = req.requesting_organization
            const toOrg = req.target_organization
            const counterpart = tab === 'received' ? fromOrg : toOrg
            const hasRoster = counterpart.roster && counterpart.roster.length > 0
            const hasRecord = (counterpart.total_scrims ?? 0) > 0
            return (
              <RetroPanel key={req.id}>
                {/* Top row: org name + status + actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-text-primary">
                        {counterpart.name}
                      </span>
                      <span className="text-xs text-text-muted">{counterpart.region}</span>
                      {counterpart.tier && (
                        <RetroBadge variant="gold">{tierLabel(counterpart.tier)}</RetroBadge>
                      )}
                      <RetroBadge variant={statusVariant(req.status)}>
                        {statusLabel(req.status)}
                      </RetroBadge>
                      {req.expired && (
                        <RetroBadge variant="danger">{t('requests.expired')}</RetroBadge>
                      )}
                    </div>

                    {/* Tagline */}
                    {counterpart.public_tagline && (
                      <p className="text-xs text-text-muted italic">{counterpart.public_tagline}</p>
                    )}

                    {/* Scrim details */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span>{t('requests.proposed')} {formatDate(req.proposed_at)}</span>
                      {req.draft_type && (
                        <span className="rounded-sm border border-gold/20 px-1.5 py-0.5 font-mono text-[10px] text-gold/80">
                          {DRAFT_LABEL[req.draft_type] ?? req.draft_type}
                        </span>
                      )}
                      {req.expires_at && (
                        <span>{t('requests.expires')} {formatDate(req.expires_at)}</span>
                      )}
                    </div>

                    {/* Message */}
                    {req.message && (
                      <p className="rounded-sm border border-gold/10 bg-navy-deep px-3 py-2 text-xs text-text-muted italic">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    {tab === 'received' && req.pending && !req.expired && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={patchRequest.isPending}
                          onClick={() => patchRequest.mutate({ id: req.id, action: 'accept' })}
                        >
                          {t('requests.accept')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={patchRequest.isPending}
                          onClick={() => patchRequest.mutate({ id: req.id, action: 'decline' })}
                        >
                          {t('requests.decline')}
                        </Button>
                      </>
                    )}
                    {tab === 'sent' && req.pending && !req.expired && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={patchRequest.isPending}
                        onClick={() => patchRequest.mutate({ id: req.id, action: 'cancel' })}
                      >
                        {t('requests.cancel')}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Team info: record + avg elo + roster */}
                {(hasRecord || counterpart.avg_tier || hasRoster || counterpart.discord_server) && (
                  <div className="mt-3 border-t border-gold/10 pt-3 space-y-3">
                    {/* Stats row */}
                    <div className="flex flex-wrap gap-4">
                      {hasRecord && (
                        <div className="space-y-0.5">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">
                            {t('requests.orgRecord')}
                          </div>
                          <div className="font-mono text-xs text-text-primary">
                            <span className="text-teal-bright">{counterpart.scrims_won}V</span>
                            <span className="mx-1 text-text-dim">·</span>
                            <span className="text-danger">{counterpart.scrims_lost}D</span>
                            <span className="ml-1.5 text-text-muted text-[10px]">
                              ({counterpart.total_scrims} scrims)
                            </span>
                          </div>
                        </div>
                      )}
                      {counterpart.avg_tier && (
                        <div className="space-y-0.5">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">
                            {t('requests.avgElo')}
                          </div>
                          <div className="font-mono text-xs text-text-primary">
                            {counterpart.avg_tier}
                          </div>
                        </div>
                      )}
                      {counterpart.discord_server && (
                        <div className="space-y-0.5">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">Discord</div>
                          <a
                            href={counterpart.discord_server}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-gold/70 hover:text-gold transition-colors"
                          >
                            {t('requests.discordJoin')}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Roster */}
                    {hasRoster && (
                      <div className="space-y-1">
                        <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">
                          {t('requests.roster')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {counterpart.roster!.map((p: RosterPlayer) => (
                            <div
                              key={p.summoner_name}
                              className="flex items-center gap-1.5 rounded-sm border border-gold/15 bg-navy-deep px-2 py-1"
                            >
                              <span className="font-mono text-[9px] text-gold/60 uppercase">
                                {ROLE_ICON[p.role] ?? p.role}
                              </span>
                              <span className="font-mono text-xs text-text-primary">{p.summoner_name}</span>
                              {p.tier && (
                                <span className="font-mono text-[9px] text-text-muted">{p.tier}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </RetroPanel>
            )
          })}
        </div>
      )}

      {patchRequest.isError && (
        <p className="text-center text-xs text-danger">
          {(patchRequest.error as Error).message}
        </p>
      )}
    </div>
  )
}
