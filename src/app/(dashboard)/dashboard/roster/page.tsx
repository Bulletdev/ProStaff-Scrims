'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { RetroBadge } from '@/components/ui/RetroBadge'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { useLanguage } from '@/contexts/LanguageContext'

// ── Types ─────────────────────────────────────────────────────────

interface Player {
  id: string
  real_name: string
  summoner_name: string
  role: string
  solo_queue_tier: string
  solo_queue_rank: string
  solo_queue_lp: number
  status: string
  last_sync_at?: string
}

interface PlayersResponse {
  data: { players: Player[] }
}

// ── Constants ─────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  top: 'Top', jungle: 'Jungle', mid: 'Mid', adc: 'ADC', support: 'Support', fill: 'Fill',
}
const ROLE_ORDER = ['top', 'jungle', 'mid', 'adc', 'support', 'fill']
const SINGLE_TIER = ['master', 'grandmaster', 'challenger']

// ── Helpers ───────────────────────────────────────────────────────

function formatRank(tier?: string, rank?: string, lp?: number) {
  if (!tier) return 'Unranked'
  const label = tier.charAt(0).toUpperCase() + tier.slice(1)
  if (SINGLE_TIER.includes(tier.toLowerCase())) return lp != null ? `${label} ${lp} LP` : label
  return [label, rank?.toUpperCase(), lp != null ? `${lp} LP` : null].filter(Boolean).join(' ')
}

function statusVariant(status: string): 'teal' | 'muted' | 'danger' {
  if (status === 'active') return 'teal'
  if (status === 'inactive') return 'muted'
  return 'danger'
}

// ── Import via Riot ID panel ──────────────────────────────────────

function ImportRiotPanel({
  onSubmit,
  onCancel,
  isPending,
  error,
}: {
  onSubmit: (riotId: string, role: string) => void
  onCancel: () => void
  isPending: boolean
  error?: string | null
}) {
  const { t } = useLanguage()
  const [riotId, setRiotId] = useState('')
  const [role, setRole] = useState('top')

  const inputClass =
    'w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none'

  return (
    <RetroPanel title={t('roster.import.title')}>
      <p className="text-xs text-text-muted mb-4">{t('roster.import.desc')}</p>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(riotId.trim(), role) }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="space-y-1">
          <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t('roster.import.riotId')}
          </label>
          <input
            type="text"
            required
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            placeholder={t('roster.import.riotIdPlaceholder')}
            className={inputClass}
          />
          <p className="text-xs text-text-muted">{t('roster.import.riotIdHint')}</p>
        </div>

        <div className="space-y-1">
          <label className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t('roster.import.role')}
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            {['top', 'jungle', 'mid', 'adc', 'support'].map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2 flex items-center justify-between pt-1">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              {t('roster.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isPending}>
              {t('roster.import.submit')}
            </Button>
          </div>
        </div>
      </form>
    </RetroPanel>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function RosterPage() {
  const token = useToken()
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const [showImport, setShowImport] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery<PlayersResponse>({
    queryKey: ['players', token],
    queryFn: () => api.get('/players?per_page=50', { token: token! }),
    enabled: !!token,
  })

  // Import via Riot ID: POST /players/import { summoner_name: "Name#TAG", role }
  const importFromRiot = useMutation({
    mutationFn: ({ summoner_name, role }: { summoner_name: string; role: string }) =>
      api.post('/players/import', { summoner_name, role }, { token: token! }),
    onSuccess: () => {
      toast.success(t('roster.import.success'))
      queryClient.invalidateQueries({ queryKey: ['players'] })
      setShowImport(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Sync individual: POST /players/:id/sync_from_riot
  const syncPlayer = useMutation({
    mutationFn: (id: string) =>
      api.post(`/players/${id}/sync_from_riot`, {}, { token: token! }),
    onSuccess: () => {
      toast.success(t('roster.sync.success'))
      queryClient.invalidateQueries({ queryKey: ['players'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Sync all: POST /players/bulk_sync
  const syncAll = useMutation({
    mutationFn: () => api.post('/players/bulk_sync', {}, { token: token! }),
    onSuccess: () => {
      toast.success(t('roster.syncAll.success'))
      queryClient.invalidateQueries({ queryKey: ['players'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updatePlayer = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/players/${id}`, body, { token: token! }),
    onSuccess: () => {
      toast.success(t('roster.updated'))
      queryClient.invalidateQueries({ queryKey: ['players'] })
      setEditingId(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removePlayer = useMutation({
    mutationFn: (id: string) => api.delete(`/players/${id}`, { token: token! }),
    onSuccess: () => {
      toast.success(t('roster.removed'))
      queryClient.invalidateQueries({ queryKey: ['players'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/players/${id}`, { status }, { token: token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['players'] }),
    onError: (err: Error) => toast.error(err.message),
  })

  const players = (data?.data?.players ?? []).sort(
    (a, b) => (ROLE_ORDER.indexOf(a.role) ?? 99) - (ROLE_ORDER.indexOf(b.role) ?? 99)
  )

  const active   = players.filter((p) => p.status === 'active')
  const inactive = players.filter((p) => p.status !== 'active')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">{t('roster.title')}</h1>
          <p className="text-sm text-text-muted">{t('roster.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            loading={syncAll.isPending}
            onClick={() => syncAll.mutate()}
          >
            ↻ {t('roster.syncAll')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setShowImport((v) => !v); setEditingId(null) }}
          >
            {showImport ? t('roster.cancel') : t('roster.import')}
          </Button>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <ImportRiotPanel
          onSubmit={(riotId, role) => importFromRiot.mutate({ summoner_name: riotId, role })}
          onCancel={() => setShowImport(false)}
          isPending={importFromRiot.isPending}
          error={importFromRiot.isError ? (importFromRiot.error as Error).message : null}
        />
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-sm bg-navy-deep border border-gold/20" />
          ))}
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-danger">{t('roster.error')}</p>
      ) : players.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-sm text-text-muted">{t('roster.empty')}</p>
          <Button variant="primary" size="sm" onClick={() => setShowImport(true)}>
            {t('roster.import')}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <RetroPanel title={t('roster.active', { count: String(active.length) })}>
              <div className="space-y-2">
                {active.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isEditing={editingId === player.id}
                    onEdit={() => { setEditingId(player.id); setShowImport(false) }}
                    onCancelEdit={() => setEditingId(null)}
                    onUpdate={(role) => updatePlayer.mutate({ id: player.id, body: { role } })}
                    onRemove={() => removePlayer.mutate(player.id)}
                    onToggleStatus={() => toggleStatus.mutate({ id: player.id, status: 'inactive' })}
                    onSync={() => syncPlayer.mutate(player.id)}
                    updatePending={updatePlayer.isPending}
                    removePending={removePlayer.isPending}
                    syncPending={syncPlayer.isPending && syncPlayer.variables === player.id}
                  />
                ))}
              </div>
            </RetroPanel>
          )}

          {inactive.length > 0 && (
            <RetroPanel title={t('roster.inactive', { count: String(inactive.length) })}>
              <div className="space-y-2">
                {inactive.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isEditing={editingId === player.id}
                    onEdit={() => { setEditingId(player.id); setShowImport(false) }}
                    onCancelEdit={() => setEditingId(null)}
                    onUpdate={(role) => updatePlayer.mutate({ id: player.id, body: { role } })}
                    onRemove={() => removePlayer.mutate(player.id)}
                    onToggleStatus={() => toggleStatus.mutate({ id: player.id, status: 'active' })}
                    onSync={() => syncPlayer.mutate(player.id)}
                    updatePending={updatePlayer.isPending}
                    removePending={removePlayer.isPending}
                    syncPending={syncPlayer.isPending && syncPlayer.variables === player.id}
                  />
                ))}
              </div>
            </RetroPanel>
          )}
        </div>
      )}
    </div>
  )
}

// ── Player card ───────────────────────────────────────────────────

function PlayerCard({
  player,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onRemove,
  onToggleStatus,
  onSync,
  updatePending,
  removePending,
  syncPending,
}: {
  player: Player
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onUpdate: (role: string) => void
  onRemove: () => void
  onToggleStatus: () => void
  onSync: () => void
  updatePending: boolean
  removePending: boolean
  syncPending: boolean
}) {
  const { t } = useLanguage()
  const rank = formatRank(player.solo_queue_tier, player.solo_queue_rank, player.solo_queue_lp)
  const role = ROLE_LABEL[player.role] ?? player.role

  // Inline role editor — only thing that makes sense to change manually
  // Everything else (tier, rank, lp, summoner_name) comes from Riot sync
  if (isEditing) {
    return (
      <div className="rounded-sm border border-gold/20 bg-navy-deep px-4 py-3 flex items-center gap-4">
        <span className="font-mono text-sm text-text-primary">{player.summoner_name}</span>
        <select
          defaultValue={player.role}
          onChange={(e) => onUpdate(e.target.value)}
          disabled={updatePending}
          className="rounded-sm border border-gold/20 bg-navy-deep px-2 py-1 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
        >
          {['top', 'jungle', 'mid', 'adc', 'support', 'fill'].map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={onCancelEdit}>{t('roster.cancel')}</Button>
      </div>
    )
  }

  const syncedAt = player.last_sync_at
    ? new Date(player.last_sync_at).toLocaleDateString()
    : null

  return (
    <div className="flex items-center justify-between rounded-sm border border-gold/10 bg-navy-deep px-4 py-3">
      <div className="flex items-center gap-4 min-w-0">
        <div className="font-mono text-xs text-gold w-16 shrink-0">{role}</div>
        <div className="min-w-0">
          <div className="font-mono text-sm font-semibold text-text-primary">
            {player.real_name || player.summoner_name}
          </div>
          <div className="text-xs text-text-muted">
            {player.summoner_name} — {rank}
            {syncedAt && <span className="ml-2 opacity-50">· sync {syncedAt}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <RetroBadge variant={statusVariant(player.status)}>
          {player.status === 'active' ? t('common.active') : t('common.inactive')}
        </RetroBadge>
        <Button variant="ghost" size="sm" loading={syncPending} onClick={onSync}>
          ↻ {t('roster.sync')}
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          {t('roster.edit')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggleStatus}>
          {player.status === 'active' ? t('roster.deactivate') : t('roster.activate')}
        </Button>
        <Button variant="danger" size="sm" loading={removePending} onClick={onRemove}>
          {t('roster.remove')}
        </Button>
      </div>
    </div>
  )
}
