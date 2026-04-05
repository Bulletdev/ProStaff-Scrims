/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRD — Sistema de Inhouse (scrims.lol)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * VISÃO GERAL
 * O sistema de Inhouse é um ecossistema de partidas fechadas dentro da
 * organização. Substitui a fila pública ranqueada por um ambiente controlado
 * onde o gestor (coach/manager) organiza partidas customizadas de alto nível.
 *
 * FLUXO PRINCIPAL — FILA COM ROLES
 *   1. Gestor abre uma fila (POST /inhouse/queue/open)
 *   2. Jogadores são adicionados por role: 2 vagas por role × 5 roles = 10
 *   3. Com 10 jogadores, gestor inicia o Check-in (POST /inhouse/queue/start_checkin)
 *   4. Timer de 60s: gestor confirma presença de cada jogador
 *      - Jogadores não confirmados são removidos da fila
 *   5. Após check-in, gestor escolhe modo de formação:
 *      - Auto-Balanceamento: algoritmo equilibra times por MMR
 *      - Draft de Capitães: 2 maiores MMR viram capitães, alternam picks 1-2-2-2-1
 *   6. Sessão criada → partidas jogadas → resultados registrados
 *   7. Ao encerrar, MMR da inhouse atualizado por jogador
 *
 * FLUXO ALTERNATIVO — SESSÃO MANUAL
 *   Cria sessão diretamente (sem fila), adiciona jogadores e balanceia.
 *   Mantém compatibilidade com fluxo existente.
 *
 * TABS
 *   • Sessão   — Fila → Check-in → Draft/Balance → Partida → Resultado
 *   • Ladder   — Leaderboard com MMR da inhouse, W/L, WR por jogador
 *   • Histórico — Sessões encerradas com placar, formação e data
 *
 * DRAFT DE CAPITÃES (formato 1-2-2-2-1)
 *   Ordem de picks: B R R B B R R B  (8 picks para 8 não-capitães)
 *   Blue captain + Red captain são atribuídos automaticamente (maior MMR)
 *   Total: 5 Blue + 5 Red
 *
 * MMR DA INHOUSE
 *   Independente do Solo Queue tier. Persiste entre sessões.
 *   Exibido no Leaderboard e como delta (+/-) no resultado de cada sessão.
 *
 * ENDPOINTS ESPERADOS (backend)
 *   GET    /inhouse/queue/status              → QueueState | null
 *   POST   /inhouse/queue/open                → QueueState
 *   POST   /inhouse/queue/join                → { player_id, role }
 *   POST   /inhouse/queue/remove              → { player_id }
 *   POST   /inhouse/queue/start_checkin       → QueueState (status: 'check_in')
 *   POST   /inhouse/queue/checkin             → { player_id }
 *   POST   /inhouse/queue/start_session       → { formation_mode } → Inhouse
 *   POST   /inhouse/queue/close               → {}
 *   GET    /inhouse/inhouses/active           → Inhouse | null  (existente)
 *   POST   /inhouse/inhouses                  → Inhouse          (existente)
 *   POST   /inhouse/inhouses/:id/join         → { player_id }    (existente)
 *   POST   /inhouse/inhouses/:id/balance_teams→ {}               (existente)
 *   POST   /inhouse/inhouses/:id/start_draft  → {}               (novo)
 *   POST   /inhouse/inhouses/:id/captain_pick → { player_id }    (novo)
 *   POST   /inhouse/inhouses/:id/start_game   → {}               (novo)
 *   POST   /inhouse/inhouses/:id/record_game  → { winner }       (existente)
 *   PATCH  /inhouse/inhouses/:id/close        → {}               (existente)
 *   GET    /inhouse/ladder                    → LadderEntry[]    (novo)
 *   GET    /inhouse/sessions                  → SessionSummary[] (novo)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useToken } from '@/hooks/useToken'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { useLanguage } from '@/contexts/LanguageContext'

// ── Color tokens ───────────────────────────────────────────────────────────
const GOLD = '#C89B3C'
const GOLD_DIM = 'rgba(200,155,60,0.45)'
const GOLD_FAINT = 'rgba(200,155,60,0.08)'
const NAVY_CARD = 'rgba(15,24,35,0.96)'
const NAVY_DEEP = '#070C14'

// ── Role config ────────────────────────────────────────────────────────────
const ROLES = [
  { key: 'top'     as const, label: 'Top',     iconSrc: '/lane-icon/top.svg',     color: '#facc15' },
  { key: 'jungle'  as const, label: 'Jungle',  iconSrc: '/lane-icon/jungle.svg',  color: '#4ade80' },
  { key: 'mid'     as const, label: 'Mid',     iconSrc: '/lane-icon/mid.svg',     color: '#60a5fa' },
  { key: 'adc'     as const, label: 'ADC',     iconSrc: '/lane-icon/bot.webp',    color: '#f87171' },
  { key: 'support' as const, label: 'Support', iconSrc: '/lane-icon/supp.svg',    color: '#c084fc' },
] as const

// Captain pick order for 1-2-2-2-1: 8 picks (Blue 4, Red 4)
const PICK_ORDER: Array<'blue' | 'red'> = ['blue', 'red', 'red', 'blue', 'blue', 'red', 'red', 'blue']

// ── Types ──────────────────────────────────────────────────────────────────
type InhouseRole = typeof ROLES[number]['key']
type QueueStatus = 'open' | 'check_in'
type FormationMode = 'auto' | 'captain_draft'
type TeamColor = 'none' | 'blue' | 'red'
type InhouseStatus = 'waiting' | 'draft' | 'in_progress' | 'done'
// Note: 'draft' is the captain draft phase (backend status: 'draft')
type ActiveTab = 'session' | 'ladder' | 'history'

interface QueueEntry {
  player_id: string
  player_name: string
  role: InhouseRole
  tier_snapshot: string
  checked_in: boolean
}

interface QueueState {
  id: string
  status: QueueStatus
  check_in_deadline?: string
  total_entries: number
  total_slots: number
  full: boolean
  entries: QueueEntry[]
  entries_by_role?: Record<string, QueueEntry[]>
}

interface Participation {
  player_id: string
  player_name: string
  team: TeamColor
  tier_snapshot: string
  wins: number
  losses: number
  mmr_delta?: number
  is_captain?: boolean
}

interface DraftState {
  blue_captain_id: string
  red_captain_id: string
  pick_number: number
  current_pick_team?: 'blue' | 'red' | null
  picks_remaining?: number
  draft_complete?: boolean
}

interface Inhouse {
  id: string
  status: InhouseStatus
  formation_mode?: FormationMode
  games_played: number
  blue_wins: number
  red_wins: number
  participations: Participation[]
  draft_state?: DraftState
}

interface LadderEntry {
  rank: number
  player_id: string
  player_name: string
  summoner_name?: string
  role?: string
  inhouse_mmr: number
  wins: number
  losses: number
  games: number
  win_rate: number
}

interface SessionSummary {
  id: string
  created_at: string
  games_played: number
  blue_wins: number
  red_wins: number
  formation_mode?: FormationMode
  participants_count: number
  winner?: 'blue' | 'red' | null
}

interface Player {
  id: string
  summoner_name: string
  tier: string
}

// ── API response shapes ────────────────────────────────────────────────────
interface ActiveRes  { data: { inhouse: Inhouse | null } }
interface QueueRes   { data: { queue: QueueState | null } }
interface PlayersRes { data: { players: Player[] } }
interface LadderRes  { data: { entries: LadderEntry[]; total: number } }
interface SessionsRes { data: { sessions: SessionSummary[]; total: number } }

// ── Hook: countdown timer ──────────────────────────────────────────────────
function useCountdown(deadline?: string): number {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!deadline) { setSecs(0); return }
    const update = () =>
      setSecs(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)))
    update()
    const id = setInterval(update, 500)
    return () => clearInterval(id)
  }, [deadline])
  return secs
}

// ── Tier point system ──────────────────────────────────────────────────────
// Numeric MMR proxy used for display and captain selection algorithm
const TIER_POINTS: Record<string, number> = {
  // Org tiers
  tier_1_professional: 1800, professional: 1800,
  tier_2_semi_pro: 1200, semi_pro: 1200,
  tier_3_amateur: 800, amateur: 800,
  // Solo Queue tiers (fallback if tier_snapshot carries SQ rank)
  challenger: 2800, grandmaster: 2600, master: 2400,
  diamond: 2000, emerald: 1800, platinum: 1600,
  gold: 1400, silver: 1200, bronze: 1000, iron: 800,
}

function tierToPoints(tier: string): number {
  return TIER_POINTS[tier.toLowerCase()] ?? 1000
}

// ── Helpers ────────────────────────────────────────────────────────────────
function tierBadge(t: string) {
  const pts = tierToPoints(t)
  if (t.includes('professional')) return `Pro · ${pts}`
  if (t.includes('semi')) return `Semi · ${pts}`
  return `Amateur · ${pts}`
}
function tierColor(t: string) {
  if (t.includes('professional')) return GOLD
  if (t.includes('semi')) return '#a0c4ff'
  return 'rgba(255,255,255,0.55)'
}
function mmrDeltaColor(delta?: number) {
  if (!delta) return 'rgba(255,255,255,0.3)'
  return delta > 0 ? '#4ade80' : '#f87171'
}
function roleIconSrc(role?: string) {
  return ROLES.find(r => r.key === role)?.iconSrc ?? null
}
function RoleIcon({ role, size = 16 }: { role?: string; size?: number }) {
  const src = roleIconSrc(role)
  if (!src) return <span style={{ fontSize: size * 0.75, opacity: 0.4 }}>?</span>
  return <img src={src} alt={role ?? ''} style={{ width: size, height: size, objectFit: 'contain' }} />
}
function roleLabel(role?: string) {
  return ROLES.find(r => r.key === role)?.label ?? role ?? '—'
}

// ── Captain selection — menor desvio padrão por role ───────────────────────
// Para cada role com 2 jogadores, calcula o desvio padrão dos pontos.
// A role com menor desvio (jogadores mais próximos em nível) fornece os capitães,
// garantindo o draft mais equilibrado possível.

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
}

interface CaptainSuggestion {
  blueCaptainId: string
  redCaptainId:  string
  blueName:  string
  redName:   string
  bluePoints: number
  redPoints:  number
  roleKey:   string
  deviation: number
}

function selectCaptainsByStdDev(entries: QueueEntry[]): CaptainSuggestion | null {
  const rolesWithTwo = ROLES
    .map(r => ({ key: r.key, players: entries.filter(e => e.role === r.key) }))
    .filter(r => r.players.length === 2)

  if (rolesWithTwo.length === 0) return null

  const best = rolesWithTwo
    .map(r => {
      const pts = r.players.map(p => tierToPoints(p.tier_snapshot))
      return { ...r, pts, deviation: stdDev(pts) }
    })
    .reduce((min, cur) => cur.deviation < min.deviation ? cur : min)

  const [p1, p2] = best.players
  const pts1 = tierToPoints(p1.tier_snapshot)
  const pts2 = tierToPoints(p2.tier_snapshot)
  const blue = pts1 >= pts2 ? p1 : p2
  const red  = blue === p1 ? p2 : p1

  return {
    blueCaptainId: blue.player_id,
    redCaptainId:  red.player_id,
    blueName:   blue.player_name,
    redName:    red.player_name,
    bluePoints: tierToPoints(blue.tier_snapshot),
    redPoints:  tierToPoints(red.tier_snapshot),
    roleKey:    best.key,
    deviation:  best.deviation,
  }
}

// ── Shared: Scoreboard ─────────────────────────────────────────────────────
function Scoreboard({ blueWins, redWins, dim = false }: {
  blueWins: number; redWins: number; dim?: boolean
}) {
  const { t } = useLanguage()
  const blueC = dim ? 'rgba(96,165,250,0.35)' : '#60a5fa'
  const redC  = dim ? 'rgba(248,113,113,0.35)' : '#f87171'
  const sepC  = dim ? 'rgba(200,155,60,0.3)' : GOLD
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '20px 0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: dim ? 28 : 48, fontWeight: 900, fontFamily: 'Share Tech Mono, monospace', color: blueC, lineHeight: 1 }}>{blueWins}</div>
        <div style={{ fontSize: 11, color: blueC, marginTop: 4, fontFamily: 'Share Tech Mono, monospace' }}>{t('inhouse.teamBlue')}</div>
      </div>
      <div style={{ fontSize: dim ? 20 : 32, color: sepC, fontFamily: 'Share Tech Mono, monospace', fontWeight: 700, padding: '0 8px' }}>×</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: dim ? 28 : 48, fontWeight: 900, fontFamily: 'Share Tech Mono, monospace', color: redC, lineHeight: 1 }}>{redWins}</div>
        <div style={{ fontSize: 11, color: redC, marginTop: 4, fontFamily: 'Share Tech Mono, monospace' }}>{t('inhouse.teamRed')}</div>
      </div>
    </div>
  )
}

// ── Shared: TeamColumn ─────────────────────────────────────────────────────
function TeamColumn({ label, color, players }: {
  label: string; color: 'blue' | 'red'; players: Participation[]
}) {
  const { t } = useLanguage()
  const accent    = color === 'blue' ? '#60a5fa' : '#f87171'
  const accentDim = color === 'blue' ? 'rgba(96,165,250,0.25)' : 'rgba(248,113,113,0.25)'
  return (
    <div style={{ flex: 1, border: `1px solid ${accentDim}`, borderRadius: 4, overflow: 'hidden', background: NAVY_CARD }}>
      <div style={{ padding: '8px 12px', background: accentDim, borderBottom: `1px solid ${accentDim}` }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: accent, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      {players.length === 0 ? (
        <div style={{ padding: '16px 12px', fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Share Tech Mono, monospace' }}>{t('inhouse.noTeam')}</div>
      ) : (
        players.map(p => (
          <div key={p.player_id} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.is_captain && (
                  <span style={{ fontSize: 9, color: GOLD, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em', border: `1px solid ${GOLD_DIM}`, padding: '1px 5px', borderRadius: 2 }}>CAP</span>
                )}
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{p.player_name}</span>
              </div>
              <div style={{ fontSize: 10, color: tierColor(p.tier_snapshot), fontFamily: 'Share Tech Mono, monospace', marginTop: 2 }}>{tierBadge(p.tier_snapshot)}</div>
            </div>
            <div style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', textAlign: 'right' }}>
              {(p.wins > 0 || p.losses > 0) && (
                <div>
                  <span style={{ color: '#4ade80' }}>{p.wins}V</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 3px' }}>·</span>
                  <span style={{ color: '#f87171' }}>{p.losses}D</span>
                </div>
              )}
              {p.mmr_delta !== undefined && p.mmr_delta !== 0 && (
                <div style={{ color: mmrDeltaColor(p.mmr_delta), marginTop: 2 }}>
                  {p.mmr_delta > 0 ? '+' : ''}{p.mmr_delta} MMR
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Tab nav ────────────────────────────────────────────────────────────────
function TabNav({ active, onChange, isAdmin }: { active: ActiveTab; onChange: (t: ActiveTab) => void; isAdmin: boolean }) {
  const { t } = useLanguage()
  const tabs: Array<{ key: ActiveTab; label: string }> = [
    ...(isAdmin ? [{ key: 'session' as ActiveTab, label: t('inhouse.tab.session') }] : []),
    { key: 'ladder',  label: t('inhouse.tab.ladder')  },
    { key: 'history', label: t('inhouse.tab.history') },
  ]
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${GOLD_DIM}`, marginBottom: 24 }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: '10px 20px',
            fontSize: 12,
            fontFamily: 'Share Tech Mono, monospace',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: active === tab.key ? GOLD : 'rgba(255,255,255,0.4)',
            background: 'none',
            border: 'none',
            borderBottom: active === tab.key ? `2px solid ${GOLD}` : '2px solid transparent',
            cursor: 'pointer',
            transition: 'color 0.15s',
            marginBottom: -1,
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ height: 32, width: 200, borderRadius: 3, background: GOLD_FAINT, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 180, borderRadius: 4, background: NAVY_CARD, border: `1px solid ${GOLD_DIM}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10,
      fontFamily: 'Share Tech Mono, monospace',
      color,
      border: `1px solid ${color}40`,
      padding: '3px 10px',
      borderRadius: 2,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
    }}>
      {label}
    </span>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ onCreateQueue, onCreateManual, isPendingManual, isPendingQueue }: {
  onCreateQueue: () => void
  onCreateManual: () => void
  isPendingManual: boolean
  isPendingQueue: boolean
}) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', border: `1px solid ${GOLD_DIM}`, borderRadius: 4, background: NAVY_CARD, textAlign: 'center' }}>
      <div style={{ marginBottom: 16 }} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'Share Tech Mono, monospace', marginBottom: 8 }}>
        {t('inhouse.empty.title')}
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', maxWidth: 420, lineHeight: 1.7, marginBottom: 32 }}>
        {t('inhouse.empty.desc')}
      </p>

      {/* Formation card buttons */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16, width: '100%', maxWidth: 520 }}>
        <button
          onClick={onCreateQueue}
          disabled={isPendingQueue}
          style={{
            flex: 1, minWidth: 200,
            padding: '18px 20px',
            background: GOLD_FAINT,
            border: `2px solid ${GOLD_DIM}`,
            borderRadius: 4,
            color: GOLD,
            cursor: isPendingQueue ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            opacity: isPendingQueue ? 0.6 : 1,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD_DIM }}
        >
          <div style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.05em' }}>{t('inhouse.openQueue')}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.5 }}>{t('inhouse.openQueueDesc')}</div>
        </button>
        <button
          onClick={onCreateManual}
          disabled={isPendingManual}
          style={{
            flex: 1, minWidth: 200,
            padding: '18px 20px',
            background: 'rgba(255,255,255,0.02)',
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            color: 'rgba(255,255,255,0.6)',
            cursor: isPendingManual ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            opacity: isPendingManual ? 0.6 : 1,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
        >
          <div style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.05em', color: '#fff' }}>{t('inhouse.createSession')}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.5 }}>{t('inhouse.createSessionDesc')}</div>
        </button>
      </div>
    </div>
  )
}

// ── Queue view ─────────────────────────────────────────────────────────────
function QueueView({ queue, allPlayers, onAdd, onRemove, onStartCheckin, onStartSession, onClose, isStarting }: {
  queue: QueueState
  allPlayers: Player[]
  onAdd: (entry: QueueEntry) => void
  onRemove: (player_id: string) => void
  onStartCheckin: () => void
  onStartSession: (mode: FormationMode) => void
  onClose: () => void
  isStarting: boolean
}) {
  const { t } = useLanguage()
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [selectedRole, setSelectedRole] = useState<InhouseRole>('top')
  const [formationMode, setFormationMode] = useState<FormationMode>('auto')

  const queuedIds = new Set(queue.entries.map(e => e.player_id))
  const available = allPlayers.filter(p => !queuedIds.has(p.id))
  const isFull = queue.entries.length >= 10

  const handleAdd = () => {
    if (!selectedPlayer) return
    const player = allPlayers.find(p => p.id === selectedPlayer)
    if (!player) return
    onAdd({ player_id: player.id, player_name: player.summoner_name, role: selectedRole, tier_snapshot: player.tier, checked_in: false })
    setSelectedPlayer('')
  }

  const roleSlots = ROLES.map(r => ({
    ...r,
    entries: queue.entries.filter(e => e.role === r.key),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'Share Tech Mono, monospace', margin: 0 }}>
            {t('inhouse.queue.title')}
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            {t('inhouse.queue.counter', { count: String(queue.entries.length) })}
          </p>
        </div>
        <StatusBadge
          label={isFull ? t('inhouse.queue.full') : t('inhouse.queue.open')}
          color={isFull ? '#4ade80' : GOLD}
        />
      </div>

      {/* Role grid */}
      <RetroPanel title={t('inhouse.queue.roles')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {roleSlots.map(role => (
            <div key={role.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: NAVY_DEEP, borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Role label */}
              <div style={{ width: 86, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <RoleIcon role={role.key} size={18} />
                <span style={{ fontSize: 11, fontFamily: 'Share Tech Mono, monospace', color: role.color, fontWeight: 600, letterSpacing: '0.05em' }}>{role.label}</span>
              </div>
              {/* Two slots */}
              <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                {[0, 1].map(idx => {
                  const entry = role.entries[idx]
                  return (
                    <div key={idx} style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: entry ? 'rgba(200,155,60,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${entry ? GOLD_DIM : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 3,
                      minHeight: 34,
                    }}>
                      {entry ? (
                        <>
                          <div>
                            <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{entry.player_name}</div>
                            <div style={{ fontSize: 10, color: tierColor(entry.tier_snapshot), fontFamily: 'Share Tech Mono, monospace', marginTop: 1 }}>
                              {tierToPoints(entry.tier_snapshot)} pts
                            </div>
                          </div>
                          <button
                            onClick={() => onRemove(entry.player_id)}
                            style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.6)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                          >×</button>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Share Tech Mono, monospace' }}>
                          {t('inhouse.queue.emptySlot')}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </RetroPanel>

      {/* Add player */}
      {!isFull && (
        <RetroPanel title={t('inhouse.addPlayer')}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={selectedPlayer}
              onChange={e => setSelectedPlayer(e.target.value)}
              style={{ flex: 2, minWidth: 160, background: NAVY_DEEP, border: `1px solid ${GOLD_DIM}`, borderRadius: 3, color: '#fff', padding: '7px 10px', fontSize: 13, fontFamily: 'Share Tech Mono, monospace', outline: 'none' }}
            >
              <option value="">{t('inhouse.selectPlayer')}</option>
              {available.map(p => <option key={p.id} value={p.id}>{p.summoner_name}</option>)}
            </select>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value as InhouseRole)}
              style={{ flex: 1, minWidth: 120, background: NAVY_DEEP, border: `1px solid ${GOLD_DIM}`, borderRadius: 3, color: '#fff', padding: '7px 10px', fontSize: 13, fontFamily: 'Share Tech Mono, monospace', outline: 'none' }}
            >
              {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <Button
              variant="primary" size="sm"
              disabled={!selectedPlayer}
              onClick={handleAdd}
            >
              {t('inhouse.addPlayer')}
            </Button>
          </div>
          {available.length === 0 && allPlayers.length > 0 && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8, fontFamily: 'Share Tech Mono, monospace' }}>
              {t('inhouse.allJoined')}
            </p>
          )}
        </RetroPanel>
      )}

      {/* Formation + Start (when full) */}
      {isFull && (() => {
        const captainSuggestion = formationMode === 'captain_draft'
          ? selectCaptainsByStdDev(queue.entries)
          : null
        return (
          <RetroPanel title={t('inhouse.queue.formation')}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {(['auto', 'captain_draft'] as FormationMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setFormationMode(mode)}
                  style={{
                    flex: 1, minWidth: 140,
                    padding: '14px 16px',
                    background: formationMode === mode ? GOLD_FAINT : 'rgba(255,255,255,0.02)',
                    border: `2px solid ${formationMode === mode ? GOLD : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 4,
                    color: formationMode === mode ? GOLD : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'Share Tech Mono, monospace',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    {mode === 'auto' ? t('inhouse.formation.auto') : t('inhouse.formation.draft')}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1.5 }}>
                    {mode === 'auto' ? t('inhouse.formation.autoDesc') : t('inhouse.formation.draftDesc')}
                  </div>
                </button>
              ))}
            </div>

            {/* Captain suggestion — shown when captain_draft is selected */}
            {captainSuggestion && (
              <div style={{
                marginBottom: 14,
                padding: '12px 14px',
                background: 'rgba(192,132,252,0.06)',
                border: '1px solid rgba(192,132,252,0.25)',
                borderRadius: 3,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: 'Share Tech Mono, monospace', color: '#c084fc', letterSpacing: '0.08em' }}>
                    CAPITÃES SUGERIDOS
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Share Tech Mono, monospace' }}>
                    · {roleLabel(captainSuggestion.roleKey)} · σ = {captainSuggestion.deviation.toFixed(0)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{captainSuggestion.blueName}</span>
                    <span style={{ fontSize: 11, color: GOLD, fontFamily: 'Share Tech Mono, monospace' }}>{captainSuggestion.bluePoints} pts</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{captainSuggestion.redName}</span>
                    <span style={{ fontSize: 11, color: GOLD, fontFamily: 'Share Tech Mono, monospace' }}>{captainSuggestion.redPoints} pts</span>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Share Tech Mono, monospace', marginTop: 6 }}>
                  Role mais balanceada: menor diferença de pontos entre os 2 jogadores da lane.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="outline" size="sm" onClick={onStartCheckin}>
                {t('inhouse.queue.startCheckin')}
              </Button>
              <Button variant="primary" size="sm" loading={isStarting} onClick={() => onStartSession(formationMode)}>
                {t('inhouse.queue.startSession')}
              </Button>
            </div>
          </RetroPanel>
        )
      })()}

      {/* Close queue */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="danger" size="sm" onClick={onClose}>
          {t('inhouse.queue.close')}
        </Button>
      </div>
    </div>
  )
}

// ── Check-in view ──────────────────────────────────────────────────────────
function CheckInView({ queue, onCheckin, onStartSession, isStarting }: {
  queue: QueueState
  onCheckin: (player_id: string) => void
  onStartSession: (mode: FormationMode) => void
  isStarting: boolean
}) {
  const { t } = useLanguage()
  const secsLeft = useCountdown(queue.check_in_deadline)
  const [formationMode, setFormationMode] = useState<FormationMode>('auto')

  const checkedCount = queue.entries.filter(e => e.checked_in).length
  const allChecked = checkedCount === queue.entries.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'Share Tech Mono, monospace', margin: 0 }}>
            {t('inhouse.checkin.title')}
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            {t('inhouse.checkin.progress', { checked: String(checkedCount), total: String(queue.entries.length) })}
          </p>
        </div>
        <StatusBadge label={t('inhouse.checkin.phase')} color="#f87171" />
      </div>

      {/* Countdown */}
      <RetroPanel>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{
            fontSize: 72, fontWeight: 900,
            fontFamily: 'Share Tech Mono, monospace',
            color: secsLeft <= 10 ? '#f87171' : GOLD,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            transition: 'color 0.3s',
          }}>
            {secsLeft}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Share Tech Mono, monospace', marginTop: 8, letterSpacing: '0.12em' }}>
            {t('inhouse.checkin.seconds')}
          </div>
          {/* Progress bar */}
          <div style={{ width: '60%', margin: '16px auto 0', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: secsLeft <= 10 ? '#f87171' : GOLD,
              width: `${(checkedCount / queue.entries.length) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </RetroPanel>

      {/* Player list */}
      <RetroPanel title={t('inhouse.checkin.players')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {queue.entries.map(entry => (
            <div key={entry.player_id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              background: entry.checked_in ? 'rgba(74,222,128,0.06)' : NAVY_DEEP,
              border: `1px solid ${entry.checked_in ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 3,
              transition: 'background 0.2s, border-color 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <RoleIcon role={entry.role} size={18} />
                <div>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{entry.player_name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Share Tech Mono, monospace' }}>{roleLabel(entry.role)}</div>
                </div>
              </div>
              {entry.checked_in ? (
                <span style={{ fontSize: 11, fontFamily: 'Share Tech Mono, monospace', color: '#4ade80', letterSpacing: '0.08em' }}>{t('inhouse.checkin.ready')}</span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => onCheckin(entry.player_id)}>
                  Check-in
                </Button>
              )}
            </div>
          ))}
        </div>
      </RetroPanel>

      {/* Formation + start when all checked */}
      {(allChecked || secsLeft === 0) && (
        <RetroPanel title={t('inhouse.queue.formation')}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {(['auto', 'captain_draft'] as FormationMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setFormationMode(mode)}
                style={{
                  flex: 1, minWidth: 140,
                  padding: '14px 16px',
                  background: formationMode === mode ? GOLD_FAINT : 'rgba(255,255,255,0.02)',
                  border: `2px solid ${formationMode === mode ? GOLD : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 4,
                  color: formationMode === mode ? GOLD : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'Share Tech Mono, monospace',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  {mode === 'auto' ? t('inhouse.formation.auto') : t('inhouse.formation.draft')}
                </div>
                <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1.5 }}>
                  {mode === 'auto' ? t('inhouse.formation.autoDesc') : t('inhouse.formation.draftDesc')}
                </div>
              </button>
            ))}
          </div>
          <Button variant="primary" size="md" loading={isStarting} onClick={() => onStartSession(formationMode)}>
            {t('inhouse.queue.startSession')}
          </Button>
        </RetroPanel>
      )}
    </div>
  )
}

// ── Waiting state ──────────────────────────────────────────────────────────
function WaitingState({ inhouse, token }: { inhouse: Inhouse; token: string }) {
  const { t } = useLanguage()
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const queryClient = useQueryClient()

  const { data: playersData } = useQuery<PlayersRes>({
    queryKey: ['players', token],
    queryFn: () => api.get('/players', { token }),
    enabled: !!token,
  })

  const allPlayers = playersData?.data?.players ?? []
  const joinedIds = new Set(inhouse.participations.map(p => p.player_id))
  const available = allPlayers.filter(p => !joinedIds.has(p.id))

  const joinMutation = useMutation({
    mutationFn: (player_id: string) =>
      api.post(`/inhouse/inhouses/${inhouse.id}/join`, { player_id }, { token }),
    onSuccess: () => {
      toast.success(t('inhouse.toast.playerAdded'))
      setSelectedPlayerId('')
      queryClient.invalidateQueries({ queryKey: ['inhouse-active'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const balanceMutation = useMutation({
    mutationFn: () => api.post(`/inhouse/inhouses/${inhouse.id}/balance_teams`, {}, { token }),
    onSuccess: () => {
      toast.success(t('inhouse.toast.balanced'))
      queryClient.invalidateQueries({ queryKey: ['inhouse-active'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const draftMutation = useMutation({
    mutationFn: () => {
      // For manual sessions (no role data), select captains by closest pts to mean
      const pts = inhouse.participations.map(p => tierToPoints(p.tier_snapshot))
      const mean = pts.reduce((s, v) => s + v, 0) / pts.length
      const sorted = [...inhouse.participations].sort(
        (a, b) => Math.abs(tierToPoints(a.tier_snapshot) - mean) - Math.abs(tierToPoints(b.tier_snapshot) - mean)
      )
      const blueCapId = sorted[0]?.player_id
      const redCapId  = sorted[1]?.player_id
      return api.post(`/inhouse/inhouses/${inhouse.id}/start_draft`, {
        blue_captain_id: blueCapId,
        red_captain_id:  redCapId,
      }, { token })
    },
    onSuccess: () => {
      toast.success(t('inhouse.toast.draftStarted'))
      queryClient.invalidateQueries({ queryKey: ['inhouse-active'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const closeMutation = useMutation({
    mutationFn: () => api.patch(`/inhouse/inhouses/${inhouse.id}/close`, {}, { token }),
    onSuccess: () => {
      toast.success(t('inhouse.toast.closed'))
      queryClient.invalidateQueries({ queryKey: ['inhouse-active'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'Share Tech Mono, monospace', margin: 0 }}>{t('inhouse.waiting')}</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{t('inhouse.playersInSession', { count: String(inhouse.participations.length) })}</p>
        </div>
        <StatusBadge label={t('inhouse.status.waiting')} color={GOLD} />
      </div>

      <RetroPanel><Scoreboard blueWins={0} redWins={0} dim /></RetroPanel>

      <RetroPanel title={t('inhouse.players', { count: String(inhouse.participations.length) })}>
        {inhouse.participations.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '12px 0', fontFamily: 'Share Tech Mono, monospace' }}>{t('inhouse.noPlayers')}</p>
        ) : (
          <div style={{ borderRadius: 3, overflow: 'hidden', border: `1px solid ${GOLD_DIM}` }}>
            {inhouse.participations.map(p => (
              <div key={p.player_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderBottom: `1px solid ${GOLD_DIM}`, background: NAVY_DEEP }}>
                <span style={{ fontSize: 11, color: tierColor(p.tier_snapshot), fontFamily: 'Share Tech Mono, monospace', minWidth: 90 }}>{tierBadge(p.tier_snapshot)}</span>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{p.player_name}</span>
              </div>
            ))}
          </div>
        )}
      </RetroPanel>

      <RetroPanel title={t('inhouse.addPlayer')}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedPlayerId}
            onChange={e => setSelectedPlayerId(e.target.value)}
            style={{ flex: 1, minWidth: 200, background: NAVY_DEEP, border: `1px solid ${GOLD_DIM}`, borderRadius: 3, color: '#fff', padding: '7px 10px', fontSize: 13, fontFamily: 'Share Tech Mono, monospace', outline: 'none' }}
          >
            <option value="">{t('inhouse.selectPlayer')}</option>
            {available.map(p => <option key={p.id} value={p.id}>{p.summoner_name}</option>)}
          </select>
          <Button variant="primary" size="sm" disabled={!selectedPlayerId || joinMutation.isPending} loading={joinMutation.isPending} onClick={() => selectedPlayerId && joinMutation.mutate(selectedPlayerId)}>
            {t('inhouse.addPlayer')}
          </Button>
        </div>
      </RetroPanel>

      <RetroPanel title={t('inhouse.actions')}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" loading={balanceMutation.isPending} onClick={() => balanceMutation.mutate()}>
            {t('inhouse.balance')}
          </Button>
          {inhouse.participations.length >= 10 && (
            <Button variant="outline" size="sm" loading={draftMutation.isPending} onClick={() => draftMutation.mutate()}>
              {t('inhouse.startDraft')}
            </Button>
          )}
          <Button variant="danger" size="sm" loading={closeMutation.isPending} onClick={() => closeMutation.mutate()}>
            {t('inhouse.close')}
          </Button>
        </div>
      </RetroPanel>
    </div>
  )
}

// ── Captain draft view ─────────────────────────────────────────────────────
function CaptainDraftView({ inhouse, token }: { inhouse: Inhouse; token: string }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const draft = inhouse.draft_state
  const pickNum = draft?.pick_number ?? 0
  const currentTeam = pickNum < PICK_ORDER.length ? PICK_ORDER[pickNum] : null
  const isDraftDone = pickNum >= PICK_ORDER.length

  const unassigned = inhouse.participations.filter(p => p.team === 'none' && !p.is_captain)
  const blueTeam   = inhouse.participations.filter(p => p.team === 'blue')
  const redTeam    = inhouse.participations.filter(p => p.team === 'red')

  const pickMutation = useMutation({
    mutationFn: (player_id: string) =>
      api.post(`/inhouse/inhouses/${inhouse.id}/captain_pick`, { player_id }, { token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inhouse-active'] }),
    onError: (err: Error) => toast.error(err.message),
  })

  const startGameMutation = useMutation({
    mutationFn: () => api.post(`/inhouse/inhouses/${inhouse.id}/start_game`, {}, { token }),
    onSuccess: () => {
      toast.success(t('inhouse.toast.gameStarted'))
      queryClient.invalidateQueries({ queryKey: ['inhouse-active'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'Share Tech Mono, monospace', margin: 0 }}>
            {t('inhouse.draft.title')}
          </h1>
          {!isDraftDone && currentTeam && (
            <p style={{ fontSize: 12, color: currentTeam === 'blue' ? '#60a5fa' : '#f87171', marginTop: 4, fontFamily: 'Share Tech Mono, monospace' }}>
              {currentTeam === 'blue' ? t('inhouse.draft.bluePicks') : t('inhouse.draft.redPicks')}
            </p>
          )}
          {isDraftDone && (
            <p style={{ fontSize: 12, color: '#4ade80', marginTop: 4, fontFamily: 'Share Tech Mono, monospace' }}>
              {t('inhouse.draft.complete')}
            </p>
          )}
        </div>
        <StatusBadge label={t('inhouse.status.draft')} color="#c084fc" />
      </div>

      {/* Pick order tracker */}
      <RetroPanel title={t('inhouse.draft.pickOrder')}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {PICK_ORDER.map((team, i) => {
            const done    = i < pickNum
            const current = i === pickNum && !isDraftDone
            const accent  = team === 'blue' ? '#60a5fa' : '#f87171'
            return (
              <div key={i} style={{
                width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 3,
                fontSize: 11, fontFamily: 'Share Tech Mono, monospace', fontWeight: 700,
                background: current ? accent : done ? `${accent}30` : 'rgba(255,255,255,0.04)',
                color: current ? '#fff' : done ? accent : 'rgba(255,255,255,0.25)',
                border: current ? `2px solid ${accent}` : '2px solid transparent',
                opacity: done ? 0.55 : 1,
                transition: 'all 0.2s',
              }}>
                {team === 'blue' ? 'B' : 'R'}
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.05em' }}>
          {t('inhouse.draft.format')} · {t('inhouse.draft.pickProgress', { current: String(pickNum), total: String(PICK_ORDER.length) })}
        </div>
      </RetroPanel>

      {/* Available to pick */}
      {!isDraftDone && unassigned.length > 0 && currentTeam && (
        <RetroPanel title={t('inhouse.draft.available')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {unassigned.map(p => (
              <div key={p.player_id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: NAVY_DEEP,
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3,
              }}>
                <div>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{p.player_name}</div>
                  <div style={{ fontSize: 10, color: tierColor(p.tier_snapshot), fontFamily: 'Share Tech Mono, monospace' }}>{tierBadge(p.tier_snapshot)}</div>
                </div>
                <button
                  onClick={() => pickMutation.mutate(p.player_id)}
                  disabled={pickMutation.isPending}
                  style={{
                    padding: '6px 16px',
                    background: currentTeam === 'blue' ? 'rgba(96,165,250,0.12)' : 'rgba(248,113,113,0.12)',
                    border: `1px solid ${currentTeam === 'blue' ? 'rgba(96,165,250,0.5)' : 'rgba(248,113,113,0.5)'}`,
                    borderRadius: 3,
                    color: currentTeam === 'blue' ? '#60a5fa' : '#f87171',
                    fontSize: 11, fontFamily: 'Share Tech Mono, monospace', fontWeight: 700,
                    cursor: pickMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: pickMutation.isPending ? 0.6 : 1,
                    letterSpacing: '0.05em',
                    transition: 'background 0.15s',
                  }}
                >
                  {t('inhouse.draft.pick')}
                </button>
              </div>
            ))}
          </div>
        </RetroPanel>
      )}

      {/* Teams */}
      <div style={{ display: 'flex', gap: 16 }}>
        <TeamColumn label={t('inhouse.teamBlue')} color="blue" players={blueTeam} />
        <TeamColumn label={t('inhouse.teamRed')} color="red" players={redTeam} />
      </div>

      {/* Start game when draft complete */}
      {isDraftDone && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <Button variant="primary" size="lg" loading={startGameMutation.isPending} onClick={() => startGameMutation.mutate()}>
            {t('inhouse.draft.startGame')}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── In-progress state ──────────────────────────────────────────────────────
function InProgressState({ inhouse, token }: { inhouse: Inhouse; token: string }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const blueTeam = inhouse.participations.filter(p => p.team === 'blue')
  const redTeam  = inhouse.participations.filter(p => p.team === 'red')

  const recordMutation = useMutation({
    mutationFn: (winner: 'blue' | 'red') =>
      api.post(`/inhouse/inhouses/${inhouse.id}/record_game`, { winner }, { token }),
    onSuccess: () => {
      toast.success(t('inhouse.toast.resultRecorded'))
      queryClient.invalidateQueries({ queryKey: ['inhouse-active'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rebalanceMutation = useMutation({
    mutationFn: () => api.post(`/inhouse/inhouses/${inhouse.id}/balance_teams`, {}, { token }),
    onSuccess: () => {
      toast.success(t('inhouse.toast.balanced'))
      queryClient.invalidateQueries({ queryKey: ['inhouse-active'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const closeMutation = useMutation({
    mutationFn: () => api.patch(`/inhouse/inhouses/${inhouse.id}/close`, {}, { token }),
    onSuccess: () => {
      toast.success(t('inhouse.toast.closed'))
      queryClient.invalidateQueries({ queryKey: ['inhouse-active'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'Share Tech Mono, monospace', margin: 0 }}>{t('inhouse.inProgress')}</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{t('inhouse.gamesPlayed', { count: String(inhouse.games_played) })}</p>
        </div>
        <StatusBadge label={t('inhouse.status.inProgress')} color="#4ade80" />
      </div>

      <RetroPanel><Scoreboard blueWins={inhouse.blue_wins} redWins={inhouse.red_wins} /></RetroPanel>

      <div style={{ display: 'flex', gap: 16 }}>
        <TeamColumn label={t('inhouse.teamBlue')} color="blue" players={blueTeam} />
        <TeamColumn label={t('inhouse.teamRed')} color="red" players={redTeam} />
      </div>

      <RetroPanel title={t('inhouse.recordResult')}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {(['blue', 'red'] as const).map(team => (
            <button
              key={team}
              onClick={() => recordMutation.mutate(team)}
              disabled={recordMutation.isPending}
              style={{
                flex: 1, minWidth: 160,
                padding: '14px 20px',
                background: team === 'blue' ? 'rgba(96,165,250,0.12)' : 'rgba(248,113,113,0.12)',
                border: `2px solid ${team === 'blue' ? 'rgba(96,165,250,0.5)' : 'rgba(248,113,113,0.5)'}`,
                borderRadius: 4,
                color: team === 'blue' ? '#60a5fa' : '#f87171',
                fontSize: 14, fontWeight: 700, fontFamily: 'Share Tech Mono, monospace',
                cursor: recordMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: recordMutation.isPending ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = team === 'blue' ? 'rgba(96,165,250,0.22)' : 'rgba(248,113,113,0.22)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = team === 'blue' ? 'rgba(96,165,250,0.12)' : 'rgba(248,113,113,0.12)' }}
            >
              {team === 'blue' ? t('inhouse.blueWon') : t('inhouse.redWon')}
            </button>
          ))}
        </div>
      </RetroPanel>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <Button variant="outline" size="sm" loading={rebalanceMutation.isPending} onClick={() => rebalanceMutation.mutate()}>
          {t('inhouse.balance')}
        </Button>
        <Button variant="danger" size="sm" loading={closeMutation.isPending} onClick={() => closeMutation.mutate()}>
          {t('inhouse.closeSession')}
        </Button>
      </div>
    </div>
  )
}

// ── Done state ─────────────────────────────────────────────────────────────
function DoneState({ inhouse, onCreate, isPending }: {
  inhouse: Inhouse; onCreate: () => void; isPending: boolean
}) {
  const { t } = useLanguage()

  const blueTeam = inhouse.participations.filter(p => p.team === 'blue')
  const redTeam  = inhouse.participations.filter(p => p.team === 'red')
  const winner   = inhouse.blue_wins > inhouse.red_wins ? 'blue' : inhouse.red_wins > inhouse.blue_wins ? 'red' : null
  const hasMmr   = inhouse.participations.some(p => p.mmr_delta !== undefined && p.mmr_delta !== 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'Share Tech Mono, monospace', margin: 0 }}>{t('inhouse.done')}</h1>
          {winner ? (
            <p style={{ fontSize: 13, color: winner === 'blue' ? '#60a5fa' : '#f87171', marginTop: 6, fontFamily: 'Share Tech Mono, monospace', fontWeight: 600 }}>
              {winner === 'blue' ? t('inhouse.winnerBlue') : t('inhouse.winnerRed')}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, fontFamily: 'Share Tech Mono, monospace' }}>{t('inhouse.draw')}</p>
          )}
        </div>
        <StatusBadge label={t('inhouse.status.done')} color="rgba(255,255,255,0.4)" />
      </div>

      <RetroPanel>
        <Scoreboard blueWins={inhouse.blue_wins} redWins={inhouse.red_wins} />
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Share Tech Mono, monospace', marginTop: 4 }}>
          {t('inhouse.totalGames', { count: String(inhouse.games_played) })}
        </p>
      </RetroPanel>

      {/* MMR deltas */}
      {hasMmr && (
        <RetroPanel title={t('inhouse.mmrChanges')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...inhouse.participations]
              .sort((a, b) => (b.mmr_delta ?? 0) - (a.mmr_delta ?? 0))
              .map(p => (
                <div key={p.player_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: NAVY_DEEP, borderRadius: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.team === 'blue' ? '#60a5fa' : '#f87171', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#fff' }}>{p.player_name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontFamily: 'Share Tech Mono, monospace', fontWeight: 700, color: mmrDeltaColor(p.mmr_delta) }}>
                    {p.mmr_delta !== undefined && p.mmr_delta !== 0
                      ? `${p.mmr_delta > 0 ? '+' : ''}${p.mmr_delta} MMR`
                      : '—'}
                  </span>
                </div>
              ))}
          </div>
        </RetroPanel>
      )}

      <div style={{ display: 'flex', gap: 16 }}>
        <TeamColumn label={t('inhouse.teamBlue')} color="blue" players={blueTeam} />
        <TeamColumn label={t('inhouse.teamRed')} color="red" players={redTeam} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
        <Button variant="primary" size="md" onClick={onCreate} loading={isPending}>
          {t('inhouse.newSession')}
        </Button>
      </div>
    </div>
  )
}

// ── Session tab ────────────────────────────────────────────────────────────
// Queue is managed server-side so the Discord bot and web dashboard share state.
function SessionTab({ token }: { token: string }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const { data: activeData, isLoading: loadingActive, isError: errorActive } = useQuery<ActiveRes>({
    queryKey: ['inhouse-active', token],
    queryFn: () => api.get('/inhouse/inhouses/active', { token }),
    enabled: !!token,
    refetchInterval: 10_000,
  })

  const { data: queueData, isLoading: loadingQueue } = useQuery<QueueRes>({
    queryKey: ['inhouse-queue', token],
    queryFn: () => api.get('/inhouse/queue/status', { token }),
    enabled: !!token && !activeData?.data?.inhouse,
    refetchInterval: 5_000,
  })

  const { data: playersData } = useQuery<PlayersRes>({
    queryKey: ['players', token],
    queryFn: () => api.get('/players', { token }),
    enabled: !!token,
  })

  const allPlayers = playersData?.data?.players ?? []
  const invalidateQueue = () => queryClient.invalidateQueries({ queryKey: ['inhouse-queue'] })
  const invalidateActive = () => queryClient.invalidateQueries({ queryKey: ['inhouse-active'] })

  // ── Queue mutations ───────────────────────────────────────────────────────

  const openQueueMutation = useMutation({
    mutationFn: () => api.post('/inhouse/queue/open', {}, { token }),
    onSuccess: () => { toast.success(t('inhouse.toast.queueOpened')); invalidateQueue() },
    onError: (err: Error) => toast.error(err.message),
  })

  const addToQueueMutation = useMutation({
    mutationFn: (entry: { player_id: string; role: string }) =>
      api.post('/inhouse/queue/join', entry, { token }),
    onSuccess: () => invalidateQueue(),
    onError: (err: Error) => toast.error(err.message),
  })

  const removeFromQueueMutation = useMutation({
    mutationFn: (player_id: string) =>
      api.post('/inhouse/queue/leave', { player_id }, { token }),
    onSuccess: () => invalidateQueue(),
    onError: (err: Error) => toast.error(err.message),
  })

  const startCheckinMutation = useMutation({
    mutationFn: () => api.post('/inhouse/queue/start_checkin', {}, { token }),
    onSuccess: () => { toast.success(t('inhouse.toast.checkinStarted')); invalidateQueue() },
    onError: (err: Error) => toast.error(err.message),
  })

  const checkinMutation = useMutation({
    mutationFn: (player_id: string) =>
      api.post('/inhouse/queue/checkin', { player_id }, { token }),
    onSuccess: () => invalidateQueue(),
    onError: (err: Error) => toast.error(err.message),
  })

  const startSessionMutation = useMutation({
    mutationFn: (formation_mode: FormationMode) =>
      api.post('/inhouse/queue/start_session', { formation_mode }, { token }),
    onSuccess: () => {
      toast.success(t('inhouse.toast.sessionStarted'))
      invalidateQueue()
      invalidateActive()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const closeQueueMutation = useMutation({
    mutationFn: () => api.post('/inhouse/queue/close', {}, { token }),
    onSuccess: () => { toast.success(t('inhouse.toast.queueClosed')); invalidateQueue() },
    onError: (err: Error) => toast.error(err.message),
  })

  // Manual session creation (no queue)
  const createMutation = useMutation({
    mutationFn: () => api.post('/inhouse/inhouses', {}, { token }),
    onSuccess: () => {
      toast.success(t('inhouse.toast.created'))
      invalidateActive()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (loadingActive || loadingQueue) return <LoadingSkeleton />

  if (errorActive) {
    return (
      <RetroPanel>
        <p style={{ color: '#f87171', fontFamily: 'Share Tech Mono, monospace', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          {t('inhouse.error')}
        </p>
      </RetroPanel>
    )
  }

  const inhouse = activeData?.data?.inhouse ?? null
  const queue   = queueData?.data?.queue ?? null

  // Active session takes priority
  if (inhouse) {
    if (inhouse.status === 'waiting')     return <WaitingState inhouse={inhouse} token={token} />
    if (inhouse.status === 'draft')       return <CaptainDraftView inhouse={inhouse} token={token} />
    if (inhouse.status === 'in_progress') return <InProgressState inhouse={inhouse} token={token} />
    return (
      <DoneState
        inhouse={inhouse}
        onCreate={() => createMutation.mutate()}
        isPending={createMutation.isPending}
      />
    )
  }

  // Server-side queue active
  if (queue) {
    if (queue.status === 'check_in') {
      return (
        <CheckInView
          queue={queue}
          onCheckin={(player_id) => checkinMutation.mutate(player_id)}
          onStartSession={(fm) => startSessionMutation.mutate(fm)}
          isStarting={startSessionMutation.isPending}
        />
      )
    }
    return (
      <QueueView
        queue={queue}
        allPlayers={allPlayers}
        onAdd={(entry) => addToQueueMutation.mutate(entry)}
        onRemove={(player_id) => removeFromQueueMutation.mutate(player_id)}
        onStartCheckin={() => startCheckinMutation.mutate()}
        onStartSession={(fm) => startSessionMutation.mutate(fm)}
        onClose={() => closeQueueMutation.mutate()}
        isStarting={startSessionMutation.isPending}
      />
    )
  }

  // Nothing active
  return (
    <EmptyState
      onCreateQueue={() => openQueueMutation.mutate()}
      onCreateManual={() => createMutation.mutate()}
      isPendingManual={createMutation.isPending}
      isPendingQueue={openQueueMutation.isPending}
    />
  )
}

// ── Ladder view ────────────────────────────────────────────────────────────
function LadderView({ token }: { token: string }) {
  const { t } = useLanguage()

  const { data, isLoading, isError } = useQuery<LadderRes>({
    queryKey: ['inhouse-ladder', token],
    queryFn: () => api.get('/inhouse/ladder', { token }),
    enabled: !!token,
    refetchInterval: 30_000,
  })

  const entries = data?.data?.entries ?? []

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ height: 52, borderRadius: 3, background: NAVY_CARD, border: `1px solid ${GOLD_DIM}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }

  if (isError || entries.length === 0) {
    return (
      <RetroPanel>
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Share Tech Mono, monospace' }}>
            {t('inhouse.ladder.empty')}
          </p>
        </div>
      </RetroPanel>
    )
  }

  const cols = ['#', t('inhouse.ladder.player'), 'MMR', 'W/L', 'WR%']
  const grid = '36px 1fr 80px 80px 56px'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'Share Tech Mono, monospace', margin: 0 }}>
          {t('inhouse.ladder.title')}
        </h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
          {t('inhouse.ladder.subtitle', { count: String(entries.length) })}
        </p>
      </div>

      <RetroPanel noPadding>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '8px 16px', borderBottom: `1px solid ${GOLD_DIM}` }}>
          {cols.map((h, i) => (
            <span key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em', textAlign: i >= 2 ? 'right' : 'left' }}>
              {h}
            </span>
          ))}
        </div>

        {entries.map(entry => {
          const medal = null
          const rankColor = entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : 'rgba(255,255,255,0.45)'
          return (
            <div
              key={entry.player_id}
              style={{
                display: 'grid', gridTemplateColumns: grid, gap: 8,
                padding: '11px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: entry.rank <= 3 ? 'rgba(200,155,60,0.03)' : 'transparent',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: rankColor, fontFamily: 'Share Tech Mono, monospace' }}>
                {entry.rank}
              </span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {medal && <span style={{ fontSize: 14 }}>{medal}</span>}
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{entry.player_name}</span>
                </div>
                {entry.summoner_name && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Share Tech Mono, monospace' }}>
                    {entry.summoner_name}
                    {entry.role && <> · <RoleIcon role={entry.role} size={11} /> {roleLabel(entry.role)}</>}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Share Tech Mono, monospace', color: GOLD }}>
                  {entry.inhouse_mmr}
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, fontFamily: 'Share Tech Mono, monospace' }}>
                <span style={{ color: '#4ade80' }}>{entry.wins}</span>
                <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 3px' }}>/</span>
                <span style={{ color: '#f87171' }}>{entry.losses}</span>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, fontFamily: 'Share Tech Mono, monospace', color: entry.win_rate >= 50 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                {entry.win_rate.toFixed(0)}%
              </div>
            </div>
          )
        })}
      </RetroPanel>
    </div>
  )
}

// ── History view ───────────────────────────────────────────────────────────
function HistoryView({ token }: { token: string }) {
  const { t } = useLanguage()
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery<SessionsRes>({
    queryKey: ['inhouse-sessions', token, page],
    queryFn: () => api.get(`/inhouse/sessions?status=done&page=${page}`, { token }),
    enabled: !!token,
  })

  const sessions = data?.data?.sessions ?? []
  const hasMore  = sessions.length === 10

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 80, borderRadius: 4, background: NAVY_CARD, border: `1px solid ${GOLD_DIM}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }

  if (isError || sessions.length === 0) {
    return (
      <RetroPanel>
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Share Tech Mono, monospace' }}>
            {t('inhouse.history.empty')}
          </p>
        </div>
      </RetroPanel>
    )
  }

  const fmt = (d: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'Share Tech Mono, monospace', margin: 0 }}>
          {t('inhouse.history.title')}
        </h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
          {t('inhouse.history.subtitle')}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.map(s => {
          const winnerColor = s.winner === 'blue' ? '#60a5fa' : s.winner === 'red' ? '#f87171' : 'rgba(255,255,255,0.4)'
          return (
            <div
              key={s.id}
              style={{
                padding: '14px 18px',
                background: NAVY_CARD,
                border: `1px solid ${GOLD_DIM}`,
                borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Share Tech Mono, monospace', marginBottom: 6 }}>
                  {fmt(s.created_at)}
                  {s.formation_mode && (
                    <span style={{ marginLeft: 12, color: s.formation_mode === 'captain_draft' ? '#c084fc' : GOLD, opacity: 0.8 }}>
                      · {s.formation_mode === 'captain_draft' ? t('inhouse.formation.draft') : t('inhouse.formation.auto')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Share Tech Mono, monospace', color: '#60a5fa', lineHeight: 1 }}>{s.blue_wins}</span>
                  <span style={{ fontSize: 16, color: GOLD, fontFamily: 'Share Tech Mono, monospace' }}>×</span>
                  <span style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Share Tech Mono, monospace', color: '#f87171', lineHeight: 1 }}>{s.red_wins}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Share Tech Mono, monospace' }}>({s.games_played} games)</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {s.winner && (
                  <div style={{ fontSize: 11, fontFamily: 'Share Tech Mono, monospace', color: winnerColor, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
                    {s.winner === 'blue' ? t('inhouse.teamBlue') : t('inhouse.teamRed')} {t('inhouse.history.wins')}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Share Tech Mono, monospace' }}>
                  {s.participants_count} {t('inhouse.history.players')}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, paddingTop: 8 }}>
          {page > 1 && (
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)}>← Anterior</Button>
          )}
          {hasMore && (
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>Próxima →</Button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function InhousePage() {
  const token = useToken()
  const { organization } = useAuth()
  const isAdmin = organization?.slug === 'prostaff'
  const [tab, setTab] = useState<ActiveTab>(isAdmin ? 'session' : 'ladder')

  if (!token) return <LoadingSkeleton />

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <TabNav active={tab} onChange={setTab} isAdmin={isAdmin} />
      {tab === 'session' && isAdmin && <SessionTab token={token} />}
      {tab === 'ladder'  && <LadderView token={token} />}
      {tab === 'history' && <HistoryView token={token} />}
    </div>
  )
}
