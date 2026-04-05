'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { useLanguage } from '@/contexts/LanguageContext'

// ── Types ────────────────────────────────────────────────────────────────────

interface TeamPerformance {
  data: {
    performance: {
      win_rate: number
      avg_kda: number
      avg_kills: number
      avg_deaths: number
      avg_assists: number
      avg_cs_per_min: number
      avg_vision_score: number
      total_games: number
    }
  }
}

interface PlayersResponse {
  data: {
    players: Array<{
      id: string
      real_name: string
      summoner_name: string
      role: string
      solo_queue_tier: string
      solo_queue_rank: string
      solo_queue_lp: number
      status: string
    }>
  }
}

interface PlayerStatsResponse {
  data: {
    avg_kills: number
    avg_deaths: number
    avg_assists: number
    win_rate: number
    total_games: number
    avg_cs_per_min: number
    avg_vision_score: number
  }
}

interface ScrimAnalytics {
  overall_stats: {
    total_scrims: number
    win_rate: number
    completion_rate: number
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_ORDER = ['top', 'jungle', 'mid', 'adc', 'support']
const ROLE_LABEL: Record<string, string> = {
  top: 'Top', jungle: 'Jungle', mid: 'Mid', adc: 'ADC', support: 'Support',
}

function formatRank(tier?: string, rank?: string, lp?: number) {
  if (!tier) return 'Unranked'
  const single = ['master', 'grandmaster', 'challenger']
  const label = tier.charAt(0).toUpperCase() + tier.slice(1)
  if (single.includes(tier.toLowerCase())) return lp != null ? `${label} ${lp} LP` : label
  return [label, rank?.toUpperCase(), lp != null ? `${lp} LP` : null].filter(Boolean).join(' ')
}

function kda(k?: number, d?: number, a?: number) {
  const kills = (k ?? 0).toFixed(1)
  const deaths = (d ?? 0).toFixed(1)
  const assists = (a ?? 0).toFixed(1)
  const ratio = (d ?? 0) === 0 ? ((k ?? 0) + (a ?? 0)) : (((k ?? 0) + (a ?? 0)) / (d ?? 0))
  return `${kills}/${deaths}/${assists} (${ratio.toFixed(2)})`
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'rgba(15,24,35,0.96)',
      border: '1px solid rgba(200,155,60,0.3)',
      borderRadius: 8,
      padding: '16px 20px',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ color: '#C89B3C', fontSize: 20, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function WinRateBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = pct >= 50 ? '#2ECC71' : '#E74C3C'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ color, fontSize: 13, fontWeight: 700, width: 42, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const token = useToken()
  const { t } = useLanguage()

  const { data: perf, isLoading: loadingPerf } = useQuery<TeamPerformance>({
    queryKey: ['analytics-performance', token],
    queryFn: () => api.get<TeamPerformance>('/analytics/performance', { token: token! }),
    enabled: !!token,
    staleTime: 5 * 60_000,
  })

  const { data: playersData, isLoading: loadingPlayers } = useQuery<PlayersResponse>({
    queryKey: ['players', token],
    queryFn: () => api.get<PlayersResponse>('/players?per_page=20', { token: token! }),
    enabled: !!token,
    staleTime: 5 * 60_000,
  })

  const { data: scrimAnalytics } = useQuery<ScrimAnalytics>({
    queryKey: ['scrim-analytics', token],
    queryFn: () => api.get<ScrimAnalytics>('/scrims/scrims/analytics?days=365', { token: token! }),
    enabled: !!token,
    staleTime: 5 * 60_000,
  })

  const p = perf?.data?.performance
  const players = (playersData?.data?.players ?? [])
    .filter(pl => pl.status === 'active')
    .sort((a, b) => (ROLE_ORDER.indexOf(a.role) ?? 99) - (ROLE_ORDER.indexOf(b.role) ?? 99))

  const s = scrimAnalytics?.overall_stats

  return (
    <div style={{ padding: '24px 32px', color: '#fff', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 3, height: 24, background: '#C89B3C', borderRadius: 2 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>{t('analytics.title')}</h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: 13 }}>
          {t('analytics.subtitle')}
        </p>
      </div>

      {/* Team KPIs */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ color: 'rgba(200,155,60,0.8)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
          {t('analytics.teamPerf')}
        </div>
        {loadingPerf ? (
          <div style={{ color: 'rgba(255,255,255,0.35)' }}>{t('analytics.loadingPerf')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <StatBox label={t('analytics.kpi.winRate')} value={p?.win_rate != null ? `${p.win_rate.toFixed(1)}%` : '—'} sub={t('analytics.sub.recorded')} />
            <StatBox label={t('analytics.kpi.avgKda')} value={kda(p?.avg_kills, p?.avg_deaths, p?.avg_assists)} sub={t('analytics.sub.kda')} />
            <StatBox label={t('analytics.kpi.csMin')} value={p?.avg_cs_per_min?.toFixed(1) ?? '—'} sub={t('analytics.sub.avgGame')} />
            <StatBox label={t('analytics.kpi.vision')} value={p?.avg_vision_score?.toFixed(0) ?? '—'} sub={t('analytics.sub.avgGame')} />
            <StatBox label={t('analytics.kpi.matches')} value={p?.total_games?.toString() ?? '—'} sub={t('analytics.sub.total')} />
            {s && (
              <>
                <StatBox label={t('analytics.kpi.scrims')} value={s.total_scrims?.toString() ?? '—'} sub={t('analytics.sub.totalScrims')} />
                <StatBox label={t('analytics.kpi.scrimWinRate')} value={`${s.win_rate?.toFixed(1) ?? '—'}%`} sub={t('analytics.sub.last12')} />
                <StatBox label={t('analytics.kpi.completionRate')} value={`${s.completion_rate?.toFixed(1) ?? '—'}%`} sub={t('analytics.sub.gamesCompleted')} />
              </>
            )}
          </div>
        )}
      </section>

      {/* Roster analytics */}
      <section>
        <div style={{ color: 'rgba(200,155,60,0.8)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
          {t('analytics.roster')}
        </div>
        {loadingPlayers ? (
          <div style={{ color: 'rgba(255,255,255,0.35)' }}>{t('analytics.loadingPlayers')}</div>
        ) : players.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.35)' }}>{t('analytics.noPlayers')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map(player => (
              <PlayerRow key={player.id} player={player} token={token!} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Player row with lazy stats ────────────────────────────────────────────────

function PlayerRow({ player, token }: { player: PlayersResponse['data']['players'][0]; token: string }) {
  const { data: statsData } = useQuery<PlayerStatsResponse>({
    queryKey: ['player-stats', player.id, token],
    queryFn: () => api.get<PlayerStatsResponse>(`/players/${player.id}/stats`, { token }),
    enabled: !!token,
    staleTime: 10 * 60_000,
  })

  const stats = statsData?.data
  const rank = formatRank(player.solo_queue_tier, player.solo_queue_rank, player.solo_queue_lp)
  const role = ROLE_LABEL[player.role] ?? player.role

  return (
    <div style={{
      background: 'rgba(15,24,35,0.96)',
      border: '1px solid rgba(200,155,60,0.2)',
      borderRadius: 8,
      padding: '14px 20px',
      display: 'grid',
      gridTemplateColumns: '120px 1fr 160px 140px 80px 90px',
      alignItems: 'center',
      gap: 16,
    }}>
      {/* Name + role */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{player.real_name || player.summoner_name}</div>
        <div style={{ color: '#C89B3C', fontSize: 11, marginTop: 2 }}>{role}</div>
      </div>

      {/* Summoner + rank */}
      <div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{player.summoner_name}</div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{rank}</div>
      </div>

      {/* KDA */}
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
        {stats ? kda(stats.avg_kills, stats.avg_deaths, stats.avg_assists) : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
      </div>

      {/* Win rate bar */}
      <div>
        {stats?.win_rate != null
          ? <WinRateBar value={stats.win_rate} />
          : <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>—</span>}
      </div>

      {/* Games */}
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center' }}>
        {stats?.total_games != null ? `${stats.total_games}g` : '—'}
      </div>

      {/* CS/min */}
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'right' }}>
        {stats?.avg_cs_per_min != null ? `${stats.avg_cs_per_min.toFixed(1)} cs/m` : '—'}
      </div>
    </div>
  )
}
