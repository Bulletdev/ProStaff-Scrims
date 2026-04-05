'use client'

import { useQuery } from '@tanstack/react-query'
import { Swords, Clock, CheckCircle, Users, Calendar, Activity, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { api } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────

interface DashboardStats {
  win_rate: number
  recent_form: string
  total_players: number
  active_players: number
  total_matches: number
  wins: number
  losses: number
}

interface DashboardStatsResponse {
  data?: DashboardStats
  win_rate?: number
  recent_form?: string
  total_players?: number
  active_players?: number
  total_matches?: number
  wins?: number
  losses?: number
}

interface ActivityItem {
  id: string
  action: string
  entity_type: string
  user: string
  timestamp: string
}

interface ActivitiesResponse {
  activities?: ActivityItem[]
  data?: { activities?: ActivityItem[] }
}

interface ScheduleEvent {
  id: string
  title: string
  event_type: string
  start_time: string
  opponent?: string
  location?: string
}

interface ScheduleResponse {
  events?: ScheduleEvent[]
  data?: { events?: ScheduleEvent[] }
}

interface ScrimAnalytics {
  overall_stats: {
    total_scrims: number
    wins: number
    losses: number
    win_rate: number
    completion_rate: number
  }
}

interface RequestsResponse {
  data: { pending_count: number }
}

interface UpcomingScrim {
  id: string
  scheduled_at: string
  games_planned: number
  opponent_team: { name: string } | null
  pre_game_notes: string | null
}

interface UpcomingResponse {
  data: { scrims: UpcomingScrim[] }
}

// ── Helpers ───────────────────────────────────────────────────────

function eventTypeColor(type: string) {
  if (type === 'scrim') return '#C89B3C'
  if (type === 'match') return '#4ECDC4'
  if (type === 'training') return '#4ade80'
  return 'rgba(255,255,255,0.4)'
}

function WinRateBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = pct >= 55 ? '#4ade80' : pct >= 45 ? '#C89B3C' : '#FF4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
      <span style={{ color }} className="font-mono text-xs font-bold w-10 text-right">
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const token = useToken()
  const { t } = useLanguage()

  const { data: statsRaw } = useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard-stats', token],
    queryFn: () => api.get('/dashboard/stats', { token: token! }),
    enabled: !!token,
    staleTime: 2 * 60_000,
  })

  const { data: scrimAnalytics } = useQuery<ScrimAnalytics>({
    queryKey: ['dashboard-scrim-analytics', token],
    queryFn: () => api.get('/scrims/scrims/analytics?days=30', { token: token! }),
    enabled: !!token,
    staleTime: 2 * 60_000,
  })

  const { data: requestsRaw } = useQuery<RequestsResponse>({
    queryKey: ['dashboard-requests', token],
    queryFn: () => api.get('/matchmaking/scrim-requests', { token: token! }),
    enabled: !!token,
    staleTime: 60_000,
  })

  const { data: activitiesRaw } = useQuery<ActivitiesResponse>({
    queryKey: ['dashboard-activities', token],
    queryFn: () => api.get('/dashboard/activities', { token: token! }),
    enabled: !!token,
    staleTime: 60_000,
  })

  const { data: scheduleRaw } = useQuery<ScheduleResponse>({
    queryKey: ['dashboard-schedule', token],
    queryFn: () => api.get('/dashboard/schedule', { token: token! }),
    enabled: !!token,
    staleTime: 2 * 60_000,
  })

  const { data: upcoming } = useQuery<UpcomingResponse>({
    queryKey: ['dashboard-upcoming', token],
    enabled: !!token,
    queryFn: () => api.get('/scrims/scrims?status=upcoming&per_page=3', { token: token! }),
    staleTime: 60_000,
  })

  // Normalize stats — API pode vir com ou sem wrapper `data`
  const stats: DashboardStats | null = statsRaw
    ? ((statsRaw as any).data ?? statsRaw) as DashboardStats
    : null

  const scrim = scrimAnalytics?.overall_stats
  const pendingCount = requestsRaw?.data?.pending_count ?? null

  const activities = (activitiesRaw as any)?.activities
    ?? (activitiesRaw as any)?.data?.activities
    ?? []

  const scheduleEvents: ScheduleEvent[] = (scheduleRaw as any)?.events
    ?? (scheduleRaw as any)?.data?.events
    ?? []

  const upcomingScrims = upcoming?.data?.scrims ?? []

  function activityLabel(a: ActivityItem) {
    const key = `activity.${a.entity_type}` as const
    const translated = t(key as any)
    if (translated !== key) return translated
    return a.action ?? a.entity_type
  }

  // KPIs
  const kpis = [
    {
      label: t('dashboard.kpi.scrimsMonth'),
      value: scrim?.total_scrims != null ? String(scrim.total_scrims) : (stats?.total_matches != null ? String(stats.total_matches) : '—'),
      icon: Swords,
      color: '#C89B3C',
    },
    {
      label: t('dashboard.kpi.winRate'),
      value: scrim?.win_rate != null
        ? `${scrim.win_rate.toFixed(1)}%`
        : stats?.win_rate != null ? `${stats.win_rate.toFixed(1)}%` : '—',
      icon: scrim?.win_rate != null && scrim.win_rate >= 50 ? TrendingUp : TrendingDown,
      color: (scrim?.win_rate ?? stats?.win_rate ?? 0) >= 50 ? '#4ade80' : '#FF4444',
    },
    {
      label: t('dashboard.kpi.activePlayers'),
      value: stats?.active_players != null ? String(stats.active_players) : '—',
      icon: Users,
      color: '#4ECDC4',
    },
    {
      label: t('dashboard.kpi.pendingRequests'),
      value: pendingCount != null ? String(pendingCount) : '—',
      icon: Clock,
      color: pendingCount ? '#C89B3C' : 'rgba(255,255,255,0.3)',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">{t('dashboard.title')}</h1>
          <p className="text-sm text-text-muted">
            {scrim && (scrim.wins > 0 || scrim.losses > 0)
              ? t('dashboard.records', { wins: String(scrim.wins), losses: String(scrim.losses) })
              : t('dashboard.subtitle')}
          </p>
        </div>
        <Link href="/lobby">
          <Button variant="outline" size="sm">{t('dashboard.viewLobby')}</Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <RetroPanel key={kpi.label}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm border bg-white/5"
                style={{ borderColor: `${kpi.color}33` }}>
                <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-text-primary">{kpi.value}</div>
                <div className="text-xs text-text-muted">{kpi.label}</div>
              </div>
            </div>
          </RetroPanel>
        ))}
      </div>

      {/* Win record bar — scrim data only */}
      {scrim && (scrim.wins > 0 || scrim.losses > 0) && (
        <RetroPanel>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-muted font-mono">
              <span>{scrim.wins}V</span>
              <span className="uppercase tracking-widest">{t('dashboard.winRecord')}</span>
              <span>{scrim.losses}D</span>
            </div>
            <WinRateBar value={scrim.win_rate ?? 0} />
          </div>
        </RetroPanel>
      )}

      {/* Main 3-col grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Upcoming scrims */}
        <RetroPanel title={t('dashboard.upcomingScrims')}>
          {upcomingScrims.length === 0 ? (
            <div className="py-4 text-center space-y-2">
              <p className="text-xs text-text-muted">{t('dashboard.noScrims')}</p>
              <Link href="/dashboard/matchmaking">
                <Button variant="ghost" size="sm">{t('dashboard.findOpponents')}</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingScrims.map((s) => (
                <div key={s.id} className="rounded-sm border border-gold/10 bg-navy-deep px-3 py-2">
                  <div className="font-mono text-xs font-semibold text-text-primary truncate">
                    {s.opponent_team?.name ?? s.pre_game_notes ?? 'Adversário'}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {formatDate(s.scheduled_at)} · {s.games_planned}g
                  </div>
                </div>
              ))}
              <Link href="/dashboard/scrims">
                <Button variant="ghost" size="sm" className="w-full text-xs mt-1">
                  {t('dashboard.viewAll')}
                </Button>
              </Link>
            </div>
          )}
        </RetroPanel>

        {/* Upcoming schedule */}
        <RetroPanel title={t('dashboard.schedule')}>
          {scheduleEvents.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">{t('dashboard.noEvents')}</p>
          ) : (
            <div className="space-y-2">
              {scheduleEvents.slice(0, 4).map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 rounded-sm border border-gold/10 bg-navy-deep px-3 py-2">
                  <div
                    className="mt-0.5 h-2 w-2 rounded-full shrink-0"
                    style={{ background: eventTypeColor(ev.event_type) }}
                  />
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold text-text-primary truncate">{ev.title}</div>
                    <div className="text-[11px] text-text-muted">
                      {new Date(ev.start_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {ev.opponent && <span className="ml-1">· vs {ev.opponent}</span>}
                    </div>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider shrink-0 mt-0.5"
                    style={{ color: eventTypeColor(ev.event_type) }}>
                    {ev.event_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </RetroPanel>

        {/* Recent activities */}
        <RetroPanel title={t('dashboard.recentActivity')}>
          {activities.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">{t('dashboard.noActivity')}</p>
          ) : (
            <div className="space-y-2">
              {activities.slice(0, 5).map((a: ActivityItem) => (
                <div key={a.id} className="flex items-start gap-2">
                  <Activity className="h-3 w-3 mt-0.5 text-gold/50 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-text-primary truncate">{activityLabel(a)}</div>
                    <div className="text-[11px] text-text-muted">
                      {a.user && <span>{a.user} · </span>}
                      {new Date(a.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </RetroPanel>
      </div>

      {/* Bottom row: quick actions + scrim stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RetroPanel title={t('dashboard.quickActions')}>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/dashboard/matchmaking">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <Swords className="h-4 w-4" /> {t('matchmaking.title')}
              </Button>
            </Link>
            <Link href="/dashboard/availability">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <Clock className="h-4 w-4" /> {t('availability.title')}
              </Button>
            </Link>
            <Link href="/dashboard/roster">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <Users className="h-4 w-4" /> {t('roster.title')}
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <TrendingUp className="h-4 w-4" /> {t('analytics.title')}
              </Button>
            </Link>
            <Link href="/dashboard/requests">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <Calendar className="h-4 w-4" /> {t('requests.title')}
                {!!pendingCount && pendingCount > 0 && (
                  <span className="ml-auto rounded-sm bg-gold px-1.5 py-0.5 font-mono text-[10px] text-navy font-bold">
                    {pendingCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/dashboard/inhouse">
              <Button variant="secondary" size="sm" className="w-full justify-start">
                <CheckCircle className="h-4 w-4" /> {t('inhouse.title')}
              </Button>
            </Link>
          </div>
        </RetroPanel>

        {scrim && (
          <RetroPanel title={t('dashboard.scrimsLast30')}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold text-text-primary">{scrim.total_scrims}</div>
                  <div className="text-[11px] text-text-muted">{t('dashboard.total')}</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold text-gold">{scrim.win_rate.toFixed(1)}%</div>
                  <div className="text-[11px] text-text-muted">{t('dashboard.kpi.winRate')}</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold text-teal-bright">{scrim.completion_rate.toFixed(1)}%</div>
                  <div className="text-[11px] text-text-muted">{t('dashboard.completion')}</div>
                </div>
              </div>
              <WinRateBar value={scrim.win_rate} />
              <Link href="/dashboard/scrims">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  {t('dashboard.viewHistory')}
                </Button>
              </Link>
            </div>
          </RetroPanel>
        )}
      </div>

    </div>
  )
}
