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
}

interface PlayersResponse {
  data: {
    players: Player[]
  }
}

interface PlayerForm {
  real_name: string
  summoner_name: string
  role: string
  solo_queue_tier: string
  solo_queue_rank: string
  solo_queue_lp: string
}

// ── Constants ─────────────────────────────────────────────────────

const ROLES = ['top', 'jungle', 'mid', 'adc', 'support', 'fill']
const ROLE_LABEL: Record<string, string> = {
  top: 'Top', jungle: 'Jungle', mid: 'Mid', adc: 'ADC', support: 'Support', fill: 'Fill',
}
const ROLE_ORDER = ['top', 'jungle', 'mid', 'adc', 'support', 'fill']

const TIERS = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger']
const RANKS = ['IV', 'III', 'II', 'I']
const SINGLE_TIER = ['master', 'grandmaster', 'challenger']

const EMPTY_FORM: PlayerForm = {
  real_name: '',
  summoner_name: '',
  role: 'top',
  solo_queue_tier: 'gold',
  solo_queue_rank: 'IV',
  solo_queue_lp: '0',
}

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

// ── Player form modal ─────────────────────────────────────────────

function PlayerFormPanel({
  initial,
  title,
  onSubmit,
  onCancel,
  isPending,
  error,
}: {
  initial: PlayerForm
  title: string
  onSubmit: (form: PlayerForm) => void
  onCancel: () => void
  isPending: boolean
  error?: string | null
}) {
  const { t } = useLanguage()
  const [form, setForm] = useState<PlayerForm>(initial)
  const isSingleTier = SINGLE_TIER.includes(form.solo_queue_tier)

  const inputClass =
    'w-full rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none'

  return (
    <RetroPanel title={title}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="space-y-1">
          <label className="font-mono text-xs uppercase tracking-widest text-text-muted">{t('roster.form.realName')}</label>
          <input
            type="text"
            value={form.real_name}
            onChange={(e) => setForm({ ...form, real_name: e.target.value })}
            placeholder={t('roster.form.realNamePlaceholder')}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="font-mono text-xs uppercase tracking-widest text-text-muted">{t('roster.form.summonerName')}</label>
          <input
            type="text"
            required
            value={form.summoner_name}
            onChange={(e) => setForm({ ...form, summoner_name: e.target.value })}
            placeholder={t('roster.form.summonerPlaceholder')}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="font-mono text-xs uppercase tracking-widest text-text-muted">{t('roster.form.role')}</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className={inputClass}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-mono text-xs uppercase tracking-widest text-text-muted">{t('roster.form.tier')}</label>
          <select
            value={form.solo_queue_tier}
            onChange={(e) => setForm({ ...form, solo_queue_tier: e.target.value })}
            className={inputClass}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        {!isSingleTier && (
          <div className="space-y-1">
            <label className="font-mono text-xs uppercase tracking-widest text-text-muted">{t('roster.form.rank')}</label>
            <select
              value={form.solo_queue_rank}
              onChange={(e) => setForm({ ...form, solo_queue_rank: e.target.value })}
              className={inputClass}
            >
              {RANKS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="font-mono text-xs uppercase tracking-widest text-text-muted">{t('roster.form.lp')}</label>
          <input
            type="number"
            min="0"
            max="100"
            value={form.solo_queue_lp}
            onChange={(e) => setForm({ ...form, solo_queue_lp: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="col-span-2 flex items-center justify-between pt-1">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              {t('roster.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isPending}>
              {t('common.save')}
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

  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery<PlayersResponse>({
    queryKey: ['players', token],
    queryFn: () => api.get('/players?per_page=50', { token: token! }),
    enabled: !!token,
  })

  const addPlayer = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post('/players', body, { token: token! }),
    onSuccess: () => {
      toast.success(t('roster.added'))
      queryClient.invalidateQueries({ queryKey: ['players'] })
      setShowAdd(false)
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleAdd(form: PlayerForm) {
    addPlayer.mutate({
      real_name: form.real_name || undefined,
      summoner_name: form.summoner_name,
      role: form.role,
      solo_queue_tier: form.solo_queue_tier,
      solo_queue_rank: SINGLE_TIER.includes(form.solo_queue_tier) ? undefined : form.solo_queue_rank,
      solo_queue_lp: Number(form.solo_queue_lp),
    })
  }

  function handleUpdate(id: string, form: PlayerForm) {
    updatePlayer.mutate({
      id,
      body: {
        real_name: form.real_name || undefined,
        summoner_name: form.summoner_name,
        role: form.role,
        solo_queue_tier: form.solo_queue_tier,
        solo_queue_rank: SINGLE_TIER.includes(form.solo_queue_tier) ? undefined : form.solo_queue_rank,
        solo_queue_lp: Number(form.solo_queue_lp),
      },
    })
  }

  const players = (data?.data?.players ?? []).sort(
    (a, b) => (ROLE_ORDER.indexOf(a.role) ?? 99) - (ROLE_ORDER.indexOf(b.role) ?? 99)
  )

  const active = players.filter((p) => p.status === 'active')
  const inactive = players.filter((p) => p.status !== 'active')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold text-text-primary">{t('roster.title')}</h1>
          <p className="text-sm text-text-muted">{t('roster.subtitle')}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => { setShowAdd((v) => !v); setEditingId(null) }}
        >
          {showAdd ? t('roster.cancel') : t('roster.add')}
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <PlayerFormPanel
          title={t('roster.form.new')}
          initial={EMPTY_FORM}
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
          isPending={addPlayer.isPending}
          error={addPlayer.isError ? (addPlayer.error as Error).message : null}
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
        <p className="py-8 text-center text-sm text-text-muted">
          {t('roster.empty')}{' '}
          <button onClick={() => setShowAdd(true)} className="text-gold hover:underline">
            {t('roster.emptyLink')}
          </button>
        </p>
      ) : (
        <div className="space-y-6">
          {/* Active roster */}
          {active.length > 0 && (
            <RetroPanel title={t('roster.active', { count: String(active.length) })}>
              <div className="space-y-2">
                {active.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isEditing={editingId === player.id}
                    onEdit={() => { setEditingId(player.id); setShowAdd(false) }}
                    onCancelEdit={() => setEditingId(null)}
                    onUpdate={(form) => handleUpdate(player.id, form)}
                    onRemove={() => removePlayer.mutate(player.id)}
                    onToggleStatus={() =>
                      toggleStatus.mutate({ id: player.id, status: 'inactive' })
                    }
                    updatePending={updatePlayer.isPending}
                    removePending={removePlayer.isPending}
                    updateError={updatePlayer.isError ? (updatePlayer.error as Error).message : null}
                  />
                ))}
              </div>
            </RetroPanel>
          )}

          {/* Inactive roster */}
          {inactive.length > 0 && (
            <RetroPanel title={t('roster.inactive', { count: String(inactive.length) })}>
              <div className="space-y-2">
                {inactive.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isEditing={editingId === player.id}
                    onEdit={() => { setEditingId(player.id); setShowAdd(false) }}
                    onCancelEdit={() => setEditingId(null)}
                    onUpdate={(form) => handleUpdate(player.id, form)}
                    onRemove={() => removePlayer.mutate(player.id)}
                    onToggleStatus={() =>
                      toggleStatus.mutate({ id: player.id, status: 'active' })
                    }
                    updatePending={updatePlayer.isPending}
                    removePending={removePlayer.isPending}
                    updateError={updatePlayer.isError ? (updatePlayer.error as Error).message : null}
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
  updatePending,
  removePending,
  updateError,
}: {
  player: Player
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onUpdate: (form: PlayerForm) => void
  onRemove: () => void
  onToggleStatus: () => void
  updatePending: boolean
  removePending: boolean
  updateError: string | null
}) {
  const { t } = useLanguage()
  const rank = formatRank(player.solo_queue_tier, player.solo_queue_rank, player.solo_queue_lp)
  const role = ROLE_LABEL[player.role] ?? player.role

  if (isEditing) {
    const initial: PlayerForm = {
      real_name: player.real_name ?? '',
      summoner_name: player.summoner_name ?? '',
      role: player.role ?? 'top',
      solo_queue_tier: player.solo_queue_tier ?? 'gold',
      solo_queue_rank: player.solo_queue_rank ?? 'IV',
      solo_queue_lp: String(player.solo_queue_lp ?? 0),
    }
    return (
      <PlayerFormPanel
        title={t('roster.form.edit', { name: player.summoner_name })}
        initial={initial}
        onSubmit={onUpdate}
        onCancel={onCancelEdit}
        isPending={updatePending}
        error={updateError}
      />
    )
  }

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
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <RetroBadge variant={statusVariant(player.status)}>
          {player.status === 'active' ? t('common.active') : t('common.inactive')}
        </RetroBadge>
        <Button variant="outline" size="sm" onClick={onEdit}>
          {t('roster.edit')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleStatus}
        >
          {player.status === 'active' ? t('roster.deactivate') : t('roster.activate')}
        </Button>
        <Button
          variant="danger"
          size="sm"
          loading={removePending}
          onClick={onRemove}
        >
          {t('roster.remove')}
        </Button>
      </div>
    </div>
  )
}
