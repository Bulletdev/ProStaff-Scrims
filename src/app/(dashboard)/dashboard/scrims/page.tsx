'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { RetroBadge } from '@/components/ui/RetroBadge'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { Pagination } from '@/types'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { tierLabel } from '@/lib/utils'

interface OpponentTeam {
  name: string
  tag?: string
  tier?: string
  region?: string
  scrims_won?: number
  scrims_lost?: number
}

interface GameResult {
  game_number: number
  victory: boolean
  duration?: string
  notes?: string
  played_at?: string
}

interface OpponentDetail {
  league?: string | null
  discord_server?: string | null
  known_players?: string[]
  playstyle_notes?: string | null
  strengths?: string[]
  weaknesses?: string[]
  roster?: { summoner_name: string; role: string; tier?: string }[]
  avg_tier?: string | null
}

interface HeadToHead {
  wins: number
  losses: number
  total: number
}

interface Scrim {
  id: string
  scheduled_at: string
  status: string
  games_planned: number
  games_completed: number
  win_rate: number | null
  completion_percentage: number
  draft_type?: string | null
  focus_area?: string | null
  pre_game_notes: string | null
  post_game_notes?: string | null
  game_results?: GameResult[]
  opponent_team: OpponentTeam | null
  opponent_detail?: OpponentDetail | null
  head_to_head?: HeadToHead | null
}

interface ScrimsResponse {
  data: {
    scrims: Scrim[]
    meta: Pagination
  }
}

// Analytics returns raw JSON without a `data` wrapper
interface AnalyticsResponse {
  overall_stats: {
    total_scrims: number
    win_rate: number         // 0-100
    completion_rate: number  // 0-100
  }
}

interface ScrimDetailResponse {
  data: Scrim
}

function statusBadgeVariant(status: string): 'gold' | 'teal' | 'muted' {
  if (status === 'upcoming') return 'gold'
  if (status === 'in_progress') return 'teal'
  return 'muted'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Inline game detail for a single scrim ────────────────────────
function ScrimDetail({ scrimId, token }: { scrimId: string; token: string }) {
  const { t } = useLanguage()
  const { data, isLoading } = useQuery<ScrimDetailResponse>({
    queryKey: ['scrim-detail', scrimId],
    queryFn: () => api.get(`/scrims/scrims/${scrimId}`, { token }),
  })

  const scrim = data?.data

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded-sm bg-navy-deep" />
        ))}
      </div>
    )
  }

  if (!scrim) return null

  const results: GameResult[] = scrim.game_results ?? []

  const h2h = scrim.head_to_head
  const opp = scrim.opponent_detail

  return (
    <div className="space-y-4 border-t border-gold/10 pt-3">
      {/* Opponent intel */}
      {(h2h || opp) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Head-to-head */}
          {h2h && h2h.total > 0 && (
            <div className="rounded-sm border border-gold/15 bg-navy-deep px-3 py-2 space-y-1">
              <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">{t('scrims.detail.h2h')}</div>
              <div className="font-mono text-sm">
                <span className="text-teal-bright font-bold">{h2h.wins}W</span>
                <span className="text-text-dim mx-1">·</span>
                <span className="text-danger font-bold">{h2h.losses}L</span>
                <span className="ml-2 text-[10px] text-text-dim">({h2h.total} scrims)</span>
              </div>
            </div>
          )}

          {/* League + Discord */}
          {opp && (opp.league || opp.discord_server) && (
            <div className="rounded-sm border border-gold/15 bg-navy-deep px-3 py-2 space-y-1">
              {opp.league && (
                <div className="text-xs text-text-muted">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-text-dim mr-2">{t('scrims.detail.league')}</span>
                  {opp.league}
                </div>
              )}
              {opp.discord_server && (
                <a href={opp.discord_server} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gold/70 hover:text-gold transition-colors">
                  Discord ↗
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Roster + avg elo */}
      {(opp?.roster?.length || opp?.avg_tier) && (() => {
        const ROLE_ORDER = ['top', 'jungle', 'mid', 'adc', 'support']
        const LANE_ICON: Record<string, string> = {
          top: '/lane-icon/top.svg',
          jungle: '/lane-icon/jungle.svg',
          mid: '/lane-icon/mid.svg',
          adc: '/lane-icon/bot.webp',
          support: '/lane-icon/supp.svg',
        }
        const sorted = [...(opp?.roster ?? [])].sort(
          (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
        )
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">{t('scrims.detail.roster')}</div>
              {opp?.avg_tier && (
                <span className="rounded-sm border border-gold/20 px-1.5 py-0.5 font-mono text-[9px] text-gold/80">
                  {t('scrims.detail.avgElo')}: {opp.avg_tier}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {sorted.map((p) => (
                <div key={p.summoner_name}
                  className="flex items-center gap-2 rounded-sm border border-gold/15 bg-navy-deep px-3 py-1.5">
                  <img
                    src={LANE_ICON[p.role] ?? ''}
                    alt={p.role}
                    className="h-4 w-4 shrink-0 opacity-80"
                  />
                  <span className="font-mono text-sm text-text-primary flex-1">{p.summoner_name}</span>
                  {p.tier && (
                    <span className="font-mono text-xs text-text-muted">{p.tier}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Known players */}
      {opp?.known_players && opp.known_players.length > 0 && (
        <div className="space-y-1">
          <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">{t('scrims.detail.knownPlayers')}</div>
          <div className="flex flex-wrap gap-1.5">
            {opp.known_players.map((p, i) => (
              <span key={i} className="rounded-sm border border-gold/15 bg-navy-deep px-2 py-0.5 font-mono text-xs text-text-primary">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths / Weaknesses */}
      {opp && ((opp.strengths?.length ?? 0) > 0 || (opp.weaknesses?.length ?? 0) > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {(opp.strengths?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <div className="font-mono text-[9px] uppercase tracking-widest text-teal-bright/70">{t('scrims.detail.strengths')}</div>
              <ul className="space-y-0.5">
                {opp.strengths!.map((s, i) => (
                  <li key={i} className="text-xs text-text-muted">+ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {(opp.weaknesses?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <div className="font-mono text-[9px] uppercase tracking-widest text-danger/70">{t('scrims.detail.weaknesses')}</div>
              <ul className="space-y-0.5">
                {opp.weaknesses!.map((w, i) => (
                  <li key={i} className="text-xs text-text-muted">- {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Playstyle notes */}
      {opp?.playstyle_notes && (
        <div className="rounded-sm border border-gold/10 bg-navy-deep px-3 py-2">
          <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim mb-1">{t('scrims.detail.playstyle')}</div>
          <p className="text-xs text-text-muted italic">{opp.playstyle_notes}</p>
        </div>
      )}

      {/* Notes */}
      {scrim.pre_game_notes && (
        <div className="text-xs text-text-muted">
          <span className="font-mono uppercase tracking-widest text-gold/60 mr-1">{t('scrims.detail.pre')}</span>
          {scrim.pre_game_notes}
        </div>
      )}
      {scrim.post_game_notes && (
        <div className="text-xs text-text-muted">
          <span className="font-mono uppercase tracking-widest text-gold/60 mr-1">{t('scrims.detail.pos')}</span>
          {scrim.post_game_notes}
        </div>
      )}

      {/* Game results */}
      {results.length > 0 ? (
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
            {t('scrims.detail.results')}
          </div>
          {results.map((r) => (
            <div key={r.game_number}
              className="flex items-center gap-3 rounded-sm border border-gold/10 bg-navy-deep px-3 py-2"
            >
              <span className="font-mono text-xs text-text-dim w-12">Game {r.game_number}</span>
              <span className={`font-mono text-xs font-bold ${r.victory ? 'text-success' : 'text-danger'}`}>
                {r.victory ? t('scrims.detail.win') : t('scrims.detail.loss')}
              </span>
              {r.duration && <span className="text-xs text-text-dim">{r.duration}</span>}
              {r.notes && <span className="text-xs text-text-muted italic truncate flex-1">{r.notes}</span>}
            </div>
          ))}
        </div>
      ) : scrim.status === 'upcoming' ? (
        <p className="text-xs text-text-dim italic">{t('scrims.detail.upcoming')}</p>
      ) : (
        <p className="text-xs text-text-dim">{t('scrims.detail.noResults')}</p>
      )}
    </div>
  )
}

export default function ScrimsPage() {
  const token = useToken()
  const { t } = useLanguage()
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: analyticsData } = useQuery<AnalyticsResponse>({
    queryKey: ['scrims-analytics', token],
    queryFn: () => api.get('/scrims/scrims/analytics?days=365', { token: token! }),
    enabled: !!token,
  })

  const { data: scrimsData, isLoading: scrimsLoading, isError } = useQuery<ScrimsResponse>({
    queryKey: ['scrims', token, page],
    queryFn: () => api.get(`/scrims/scrims?per_page=10&page=${page}`, { token: token! }),
    enabled: !!token,
  })

  const overall = analyticsData?.overall_stats
  const scrims = scrimsData?.data?.scrims ?? []
  const pagination = scrimsData?.data?.meta

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">{t('scrims.title')}</h1>
          <p className="text-sm text-text-muted">{t('scrims.subtitle')}</p>
        </div>
        <Link href="/dashboard/matchmaking">
          <Button variant="primary" size="sm">{t('scrims.schedule')}</Button>
        </Link>
      </div>

      {/* Analytics bar */}
      <div className="grid grid-cols-3 gap-4">
        <RetroPanel>
          <div className="space-y-1">
            <div className="font-mono text-2xl font-bold text-text-primary">
              {overall?.total_scrims ?? '—'}
            </div>
            <div className="text-xs text-text-muted">{t('scrims.total')}</div>
          </div>
        </RetroPanel>
        <RetroPanel>
          <div className="space-y-1">
            <div className="font-mono text-2xl font-bold text-gold">
              {overall?.win_rate != null ? `${overall.win_rate.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-text-muted">{t('scrims.winRate')}</div>
          </div>
        </RetroPanel>
        <RetroPanel>
          <div className="space-y-1">
            <div className="font-mono text-2xl font-bold text-teal-bright">
              {overall?.completion_rate != null ? `${overall.completion_rate.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-text-muted">{t('scrims.completionRate')}</div>
          </div>
        </RetroPanel>
      </div>

      {/* Scrims list */}
      <RetroPanel title={t('scrims.history')}>
        {scrimsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-sm bg-navy-deep" />
            ))}
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-danger">{t('scrims.error')}</p>
        ) : scrims.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            {t('scrims.empty')}{' '}
            <Link href="/dashboard/matchmaking" className="text-gold hover:underline">
              {t('scrims.emptyLink')}
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {scrims.map((scrim) => {
              const opponentName =
                scrim.opponent_team?.name ?? scrim.pre_game_notes ?? t('scrims.detail.unknown')
              const isExpanded = expandedId === scrim.id

              return (
                <div
                  key={scrim.id}
                  className="rounded-sm border border-gold/10 bg-navy-deep"
                >
                  {/* Row */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gold/5 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : scrim.id)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-text-primary truncate">
                            {opponentName}
                          </span>
                          {scrim.opponent_team?.tag && (
                            <span className="font-mono text-[10px] text-text-dim">[{scrim.opponent_team.tag}]</span>
                          )}
                          {scrim.opponent_team?.region && (
                            <span className="font-mono text-[10px] text-text-dim">{scrim.opponent_team.region}</span>
                          )}
                          {scrim.opponent_team?.tier && (
                            <span className="rounded-sm border border-gold/20 px-1 py-0.5 font-mono text-[9px] text-gold/70">
                              {tierLabel(scrim.opponent_team.tier)}
                            </span>
                          )}
                          {((scrim.opponent_team?.scrims_won ?? 0) + (scrim.opponent_team?.scrims_lost ?? 0)) > 0 && (
                            <span className="font-mono text-[10px]">
                              <span className="text-teal-bright">{scrim.opponent_team!.scrims_won}W</span>
                              <span className="text-text-dim mx-0.5">·</span>
                              <span className="text-danger">{scrim.opponent_team!.scrims_lost}L</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          <span>{formatDate(scrim.scheduled_at)}</span>
                          <span className="text-text-dim">·</span>
                          <span>{scrim.games_planned} game{scrim.games_planned !== 1 ? 's' : ''}</span>
                          {scrim.draft_type && (
                            <span className="rounded-sm border border-gold/15 px-1 py-0.5 font-mono text-[9px] text-gold/60 uppercase">
                              {scrim.draft_type.replace(/_/g, ' ')}
                            </span>
                          )}
                          {scrim.focus_area && (
                            <span className="text-text-dim text-[10px]">{scrim.focus_area}</span>
                          )}
                          {scrim.games_completed > 0 && (
                            <span className="text-text-dim">({scrim.games_completed} jogados)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {scrim.status === 'completed' && scrim.win_rate != null && (
                        <span className={`font-mono text-xs font-bold ${scrim.win_rate >= 50 ? 'text-success' : 'text-danger'}`}>
                          {scrim.win_rate.toFixed(0)}% win
                        </span>
                      )}
                      <RetroBadge variant={statusBadgeVariant(scrim.status)}>
                        {scrim.status === 'upcoming'
                          ? t('scrims.status.upcoming')
                          : scrim.status === 'in_progress'
                          ? t('scrims.status.in_progress')
                          : t('scrims.status.completed')}
                      </RetroBadge>
                      <Link
                        href={`/dashboard/scrims/${scrim.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-[10px] uppercase tracking-widest text-gold/60 hover:text-gold transition-colors"
                      >
                        {t('scrims.detail.viewDetails')}
                      </Link>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-text-dim" />
                        : <ChevronDown className="h-4 w-4 text-text-dim" />
                      }
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && token && (
                    <div className="px-4 pb-3">
                      <ScrimDetail scrimId={scrim.id} token={token} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline" size="sm"
              disabled={!pagination.has_prev_page}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('scrims.pagination.prev')}
            </Button>
            <span className="font-mono text-xs text-text-muted">
              {pagination.current_page} / {pagination.total_pages}
            </span>
            <Button
              variant="outline" size="sm"
              disabled={!pagination.has_next_page}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('scrims.pagination.next')}
            </Button>
          </div>
        )}
      </RetroPanel>
    </div>
  )
}
