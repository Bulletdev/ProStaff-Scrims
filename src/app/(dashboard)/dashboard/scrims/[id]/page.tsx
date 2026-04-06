'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { RetroBadge } from '@/components/ui/RetroBadge'
import { Button } from '@/components/ui/Button'
import { ScrimChat } from '@/components/scrims/ScrimChat'
import { ScrimResultReport } from '@/components/scrims/ScrimResultReport'
import { api } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { useAuth } from '@/hooks/useAuth'
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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ROLE_ORDER = ['top', 'jungle', 'mid', 'adc', 'support']
const LANE_ICON: Record<string, string> = {
  top: '/lane-icon/top.svg',
  jungle: '/lane-icon/jungle.svg',
  mid: '/lane-icon/mid.svg',
  adc: '/lane-icon/bot.webp',
  support: '/lane-icon/supp.svg',
}

interface ResultReport {
  id: string
  status: string
  game_outcomes: string[]
  reported_at: string | null
  confirmed_at: string | null
  deadline_at: string
  attempt_count: number
  attempts_remaining: number
}

interface ResultData {
  my_report: ResultReport | null
  opponent_report: { status: string; has_reported: boolean; confirmed_at: string | null; game_outcomes: string[] | null } | null
  status: string
  deadline_at: string | null
  attempts_remaining: number
  max_attempts: number
  games_planned: number | null
}

export default function ScrimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const token = useToken()
  const { organization } = useAuth()
  const { t } = useLanguage()

  const { data, isLoading, isError } = useQuery<ScrimDetailResponse>({
    queryKey: ['scrim-detail-page', id],
    queryFn: () => api.get(`/scrims/scrims/${id}`, { token: token! }),
    enabled: !!token && !!id,
  })

  // Shares cache with ScrimResultReport component — no extra request
  const { data: resultData } = useQuery<{ data: ResultData }>({
    queryKey: ['scrim-result', id],
    queryFn: () => fetch(`/api/scrims/${id}/result`).then((r) => r.json()),
    enabled: !!id && !!data?.data?.scheduled_at && new Date(data.data.scheduled_at) < new Date(),
  })

  const scrim = data?.data
  const opponentName = scrim?.opponent_team?.name ?? t('scrims.detail.unknown')
  const opp = scrim?.opponent_detail
  const h2h = scrim?.head_to_head
  const results = scrim?.game_results ?? []
  const confirmedReport = resultData?.data?.status === 'confirmed' ? resultData.data : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/scrims">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
        </Link>
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">
            {isLoading ? t('common.loading') : opponentName}
          </h1>
          {scrim && (
            <p className="text-sm text-text-muted">{formatDate(scrim.scheduled_at)}</p>
          )}
        </div>
        {scrim && (
          <div className="ml-auto">
            <RetroBadge variant={statusBadgeVariant(scrim.status)}>
              {scrim.status === 'upcoming'
                ? t('scrims.status.upcoming')
                : scrim.status === 'in_progress'
                ? t('scrims.status.in_progress')
                : t('scrims.status.completed')}
            </RetroBadge>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-sm bg-navy-card border border-gold/10" />
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-sm bg-navy-card border border-gold/10" />
        </div>
      )}

      {isError && (
        <RetroPanel>
          <p className="py-6 text-center text-sm text-danger">{t('scrims.error')}</p>
        </RetroPanel>
      )}

      {scrim && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column — scrim info */}
          <div className="space-y-4">
            {/* Overview */}
            <RetroPanel title={t('scrims.detail.overview')}>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border border-gold/10 bg-navy-deep px-3 py-2 space-y-0.5">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">{t('scrims.detail.opponent')}</div>
                  <div className="font-mono text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    {opponentName}
                    {scrim.opponent_team?.tag && (
                      <span className="text-text-dim text-[10px]">[{scrim.opponent_team.tag}]</span>
                    )}
                  </div>
                  {scrim.opponent_team?.tier && (
                    <div className="font-mono text-xs text-gold/70">{tierLabel(scrim.opponent_team.tier)}</div>
                  )}
                  {scrim.opponent_team?.region && (
                    <div className="font-mono text-xs text-text-dim">{scrim.opponent_team.region}</div>
                  )}
                </div>

                <div className="rounded-sm border border-gold/10 bg-navy-deep px-3 py-2 space-y-0.5">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">{t('scrims.detail.games')}</div>
                  <div className="font-mono text-sm text-text-primary">
                    {scrim.games_completed} / {scrim.games_planned}
                  </div>
                  {scrim.draft_type && (
                    <div className="font-mono text-[10px] uppercase text-gold/60">
                      {scrim.draft_type.replace(/_/g, ' ')}
                    </div>
                  )}
                  {scrim.focus_area && (
                    <div className="font-mono text-[10px] text-text-dim">{scrim.focus_area}</div>
                  )}
                </div>

                {h2h && h2h.total > 0 && (
                  <div className="rounded-sm border border-gold/10 bg-navy-deep px-3 py-2 space-y-0.5">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">{t('scrims.detail.h2h')}</div>
                    <div className="font-mono text-sm">
                      <span className="text-teal-bright font-bold">{h2h.wins}W</span>
                      <span className="text-text-dim mx-1">·</span>
                      <span className="text-danger font-bold">{h2h.losses}L</span>
                      <span className="ml-2 text-[10px] text-text-dim">({h2h.total} scrims)</span>
                    </div>
                  </div>
                )}

                {scrim.status === 'completed' && scrim.win_rate != null && (
                  <div className="rounded-sm border border-gold/10 bg-navy-deep px-3 py-2 space-y-0.5">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">{t('scrims.winRate')}</div>
                    <div className={`font-mono text-sm font-bold ${scrim.win_rate >= 50 ? 'text-success' : 'text-danger'}`}>
                      {scrim.win_rate.toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>

              {(opp?.league || opp?.discord_server) && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {opp.league && (
                    <span className="text-xs text-text-muted">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-text-dim mr-2">{t('scrims.detail.league')}</span>
                      {opp.league}
                    </span>
                  )}
                  {opp.discord_server && (
                    <a
                      href={opp.discord_server}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gold/70 hover:text-gold transition-colors"
                    >
                      Discord ↗
                    </a>
                  )}
                </div>
              )}
            </RetroPanel>

            {/* Roster */}
            {(opp?.roster?.length || opp?.avg_tier) && (
              <RetroPanel title={t('scrims.detail.roster')} badge={opp?.avg_tier ?? undefined}>
                <div className="space-y-1">
                  {[...(opp?.roster ?? [])].sort(
                    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
                  ).map((p) => (
                    <div
                      key={p.summoner_name}
                      className="flex items-center gap-2 rounded-sm border border-gold/15 bg-navy-deep px-3 py-1.5"
                    >
                      <img
                        src={LANE_ICON[p.role] ?? ''}
                        alt={p.role}
                        className="h-4 w-4 shrink-0 opacity-80"
                      />
                      <span className="font-mono text-sm text-text-primary flex-1">{p.summoner_name}</span>
                      {p.tier && <span className="font-mono text-xs text-text-muted">{p.tier}</span>}
                    </div>
                  ))}
                </div>
              </RetroPanel>
            )}

            {/* Intel — strengths/weaknesses/notes */}
            {opp && ((opp.strengths?.length ?? 0) > 0 || (opp.weaknesses?.length ?? 0) > 0 || opp.playstyle_notes || (opp.known_players?.length ?? 0) > 0) && (
              <RetroPanel title={t('scrims.detail.intel')}>
                <div className="space-y-3">
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
                  {(opp.known_players?.length ?? 0) > 0 && (
                    <div className="space-y-1">
                      <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim">{t('scrims.detail.knownPlayers')}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {opp.known_players!.map((p, i) => (
                          <span key={i} className="rounded-sm border border-gold/15 bg-navy-deep px-2 py-0.5 font-mono text-xs text-text-primary">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {opp.playstyle_notes && (
                    <div className="rounded-sm border border-gold/10 bg-navy-deep px-3 py-2">
                      <div className="font-mono text-[9px] uppercase tracking-widest text-text-dim mb-1">{t('scrims.detail.playstyle')}</div>
                      <p className="text-xs text-text-muted italic">{opp.playstyle_notes}</p>
                    </div>
                  )}
                </div>
              </RetroPanel>
            )}

            {/* Game results */}
            <RetroPanel title={t('scrims.detail.results')}>
              {results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((r) => (
                    <div
                      key={r.game_number}
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
              ) : confirmedReport?.my_report?.game_outcomes?.length ? (
                <div className="space-y-1">
                  {confirmedReport.my_report.game_outcomes.map((o, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-sm border border-gold/10 bg-navy-deep px-3 py-2"
                    >
                      <span className="font-mono text-xs text-text-dim w-12">Game {i + 1}</span>
                      <span className={`font-mono text-xs font-bold ${o === 'win' ? 'text-success' : 'text-danger'}`}>
                        {o === 'win' ? t('scrims.detail.win') : t('scrims.detail.loss')}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-text-dim uppercase tracking-widest">
                        {t('scrims.result.sourceLabel')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : scrim.status === 'upcoming' ? (
                <p className="text-xs text-text-dim italic">{t('scrims.detail.upcoming')}</p>
              ) : (
                <p className="text-xs text-text-dim">{t('scrims.detail.noResults')}</p>
              )}

              {(scrim.pre_game_notes || scrim.post_game_notes) && (
                <div className="mt-3 space-y-1.5">
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
                </div>
              )}
            </RetroPanel>
          </div>

          {/* Right column — chat + result report */}
          <div className="space-y-4">
            {scrim.scheduled_at && (
              <ScrimResultReport
                scrimId={id}
                opponentName={opponentName}
                scheduledAt={scrim.scheduled_at}
                gamesPlanned={scrim.games_planned}
              />
            )}
            {organization ? (
              <ScrimChat
                scrimId={id}
                opponentName={opponentName}
                currentOrgId={organization.id}
              />
            ) : (
              <RetroPanel title={t('scrims.chat.title', { opponent: opponentName })}>
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 animate-pulse rounded-sm bg-navy-deep" />
                  ))}
                </div>
              </RetroPanel>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
