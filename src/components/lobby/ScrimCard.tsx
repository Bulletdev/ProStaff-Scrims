import { LobbyScrim, RosterPlayer } from '@/types'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { RetroBadge } from '@/components/ui/RetroBadge'
import { Button } from '@/components/ui/Button'
import { formatDate, gameLabel, tierLabel, isProfessionalTier } from '@/lib/utils'
import { CalendarDays, MapPin, Swords, Users } from 'lucide-react'

const ROLE_ICONS: Record<string, string> = {
  top: '🏔️', jungle: '🌿', mid: '⚡', adc: '🎯', support: '🛡️',
}
const ROLE_ORDER = ['top', 'jungle', 'mid', 'adc', 'support']

function tierShort(tier?: string, rank?: string) {
  if (!tier) return null
  const t = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()
  const single = ['Master', 'Grandmaster', 'Challenger']
  if (single.includes(t)) return t.slice(0, 4)
  return rank ? `${t.slice(0, 1)}${rank}` : t.slice(0, 1)
}

function RosterStrip({ roster }: { roster: RosterPlayer[] }) {
  const sorted = [...roster].sort(
    (a, b) => (ROLE_ORDER.indexOf(a.role) ?? 99) - (ROLE_ORDER.indexOf(b.role) ?? 99)
  )
  return (
    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gold/10">
      {sorted.map((p) => (
        <div key={p.summoner_name} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span>{ROLE_ICONS[p.role] ?? '?'}</span>
          <span className="font-mono text-text-primary">{p.summoner_name}</span>
          {p.tier && (
            <span className="text-gold/60">{tierShort(p.tier, p.tier_rank)}</span>
          )}
        </div>
      ))}
    </div>
  )
}

const PINK_RANKS = /^(Mestre|Master)$/i
const GOLD_RANKS = /^(Challenger|Desafiante)$/i
const RED_RANKS = /^(GrandMestre|Grandmaster|Grão Mestre|Grao Mestre)$/i
const ALL_RANKS = /\b(Ferro|Bronze|Prata|Ouro|Gold|Platina|Platinum|Esmeralda|Emerald|Diamante|Diamond|Mestre|Master|GrandMestre|Grandmaster|Gr[aã]o\s+Mestre|Desafiante|Challenger)\b/gi

function TaglineWithRanks({ text }: { text: string }) {
  const parts = text.split(new RegExp(ALL_RANKS.source, 'gi'))
  return (
    <p className="text-xs text-text-muted">
      {parts.map((part, i) => {
        if (PINK_RANKS.test(part)) return <span key={i} style={{ color: '#f472b6' }}>{part}</span>
        if (GOLD_RANKS.test(part)) return <span key={i} style={{ color: '#C89B3C' }}>{part}</span>
        if (RED_RANKS.test(part)) return <span key={i} style={{ color: '#FF4444' }}>{part}</span>
        return part
      })}
    </p>
  )
}

interface ScrimCardProps {
  scrim: LobbyScrim
  onChallenge?: (scrim: LobbyScrim) => void
}

export function ScrimCard({ scrim, onChallenge }: ScrimCardProps) {
  const org = scrim.organization

  return (
    <RetroPanel className="card-hover transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Org name + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-text-primary">{org.name}</span>
            {org.tier && (
              <RetroBadge variant={isProfessionalTier(org.tier) ? 'teal' : 'gold'}>
                {tierLabel(org.tier)}
              </RetroBadge>
            )}
            <RetroBadge variant="muted">{scrim.scrim_type}</RetroBadge>
          </div>

          {/* Tagline */}
          {org.public_tagline && (
            <TaglineWithRanks text={org.public_tagline} />
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-gold" />
              {formatDate(scrim.scheduled_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gold" />
              {org.region?.toUpperCase()}
            </span>
            <span className="flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-gold" />
              {scrim.games_planned} {scrim.games_planned === 1 ? 'game' : 'games'}
            </span>
            {scrim.focus_area && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-gold" />
                Focus: {scrim.focus_area}
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        {onChallenge && (
          <Button size="sm" onClick={() => onChallenge(scrim)}>
            Challenge
          </Button>
        )}
      </div>

      {/* Roster strip — from Riot-synced data */}
      {org.roster && org.roster.length > 0 && (
        <RosterStrip roster={org.roster} />
      )}

    </RetroPanel>
  )
}
