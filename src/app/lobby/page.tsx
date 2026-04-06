'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ScrimCard } from '@/components/lobby/ScrimCard'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { RetroBadge } from '@/components/ui/RetroBadge'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { getCookie } from '@/lib/cookie'
import { LobbyScrim, Pagination } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

const SEED_SCRIMS: LobbyScrim[] = [
  {
    id: 'seed-1',
    scheduled_at: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    scrim_type: 'competitive',
    focus_area: 'laning',
    games_planned: 3,
    status: 'upcoming',
    source: 'scrims_lol',
    organization: { id: 's1', name: 'Phantom Wolves', slug: 'phantom-wolves', region: 'br', tier: 'semi_pro', public_tagline: 'Semi-pro BR — Challenger+ only, foco em early game' },
  },
  {
    id: 'seed-2',
    scheduled_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    scrim_type: 'practice',
    focus_area: 'teamfight',
    games_planned: 3,
    status: 'upcoming',
    source: 'scrims_lol',
    organization: { id: 's2', name: 'Nova Gaming', slug: 'nova-gaming', region: 'br', tier: 'amateur', public_tagline: 'Stack amador subindo ranked coletivo — Mestre/Desafiante' },
  },
  {
    id: 'seed-3',
    scheduled_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    scrim_type: 'competitive',
    focus_area: 'draft',
    games_planned: 5,
    status: 'upcoming',
    source: 'scrims_lol',
    organization: { id: 's3', name: 'DarkStar Esports', slug: 'darkstar', region: 'br', tier: 'professional', public_tagline: 'Org profissional — preparação pré-campeonato' },
  },
]

const REGIONS = [
  { value: 'br', label: 'Brazil' },
  { value: 'na', label: 'North America' },
  { value: 'euw', label: 'EU West' },
  { value: 'las', label: 'LA South' },
  { value: 'lan', label: 'LA North' },
  { value: 'eune', label: 'EU Nordic & East' },
]

interface LobbyResponse {
  data: {
    scrims: LobbyScrim[]
    pagination: Pagination
  }
}

export default function LobbyPage() {
  const [region, setRegion] = useState('')
  const [page, setPage] = useState(1)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    setIsLoggedIn(!!getCookie('scrims_token'))
  }, [])

  const { data, isLoading, isError } = useQuery<LobbyResponse>({
    queryKey: ['lobby', region, page],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('game', 'league_of_legends')
      if (region) params.set('region', region)
      params.set('page', String(page))
      return fetch(`/api/scrims/lobby?${params}`).then((r) => r.json())
    },
  })

  const scrims = data?.data?.scrims ?? []
  const pagination = data?.data?.pagination

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-gold/15 bg-navy/80 px-6 py-4 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/">
          <div>
            <div className="font-display text-[20px] font-bold leading-none tracking-[2px]">
              <span className="text-gold">scrims</span>
              <span className="text-teal-bright">.lol</span>
            </div>
            <span className="mt-0.5 block font-mono text-[8px] tracking-[3px] text-gold/50">
              POWERED BY PROSTAFF.GG
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard"><Button size="sm">{t('nav.dashboard')}</Button></Link>
          ) : (
            <>
              <Link href="/login"><Button variant="outline" size="sm">{t('nav.signIn')}</Button></Link>
              <Link href="/register"><Button size="sm">{t('nav.register')}</Button></Link>
            </>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-2xl font-bold text-text-primary">
              <span className="gradient-gold">{t('lobby.title')}</span>
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {t('lobby.subtitle')}
            </p>
          </div>
          <RetroBadge variant="success">
            {pagination?.total_count ?? '—'} {t('lobby.open')}
          </RetroBadge>
        </div>

        {/* Filters */}
        <RetroPanel className="mb-6" title={t('lobby.filters')}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-sm border border-gold/30 bg-gold/10 px-3 py-1.5 font-mono text-xs text-gold">
              League of Legends
            </span>
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPage(1) }}
              className="rounded-sm border border-gold/20 bg-navy-deep px-3 py-1.5 font-mono text-xs text-text-primary focus:border-gold/50 focus:outline-none"
            >
              <option value="">{t('lobby.allRegions')}</option>
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </RetroPanel>

        {/* Results */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-sm bg-navy-card" />
            ))}
          </div>
        )}

        {isError && (
          <div className="space-y-3">
            <div className="mb-4 flex items-center gap-2 rounded-sm border border-gold/20 bg-gold/5 px-4 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold/60" />
              <span className="font-mono text-[10px] tracking-widest text-gold/70">
                API OFFLINE — SHOWING PREVIEW DATA
              </span>
            </div>
            {SEED_SCRIMS.map((scrim) => (
              <ScrimCard key={scrim.id} scrim={scrim} />
            ))}
          </div>
        )}

        {!isLoading && !isError && scrims.length === 0 && (
          <RetroPanel>
            <div className="py-8 text-center">
              <p className="font-mono text-text-muted">{t('lobby.empty')}</p>
              <p className="mt-2 text-xs text-text-dim">
                <Link href="/register" className="text-gold hover:underline">{t('lobby.emptyLink')}</Link>{' '}
                {t('lobby.emptyLinkSuffix')}
              </p>
            </div>
          </RetroPanel>
        )}

        <div className="space-y-3">
          {scrims.map((scrim) => (
            <ScrimCard key={scrim.id} scrim={scrim} />
          ))}
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="outline" size="sm"
              disabled={!pagination.has_prev_page}
              onClick={() => setPage((p) => p - 1)}
            >{t('lobby.prev')}</Button>
            <span className="font-mono text-xs text-text-muted">
              {pagination.current_page} / {pagination.total_pages}
            </span>
            <Button
              variant="outline" size="sm"
              disabled={!pagination.has_next_page}
              onClick={() => setPage((p) => p + 1)}
            >{t('lobby.next')}</Button>
          </div>
        )}
      </div>
    </div>
  )
}
