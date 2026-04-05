import { LobbyScrim } from '@/types'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { RetroBadge } from '@/components/ui/RetroBadge'
import { Button } from '@/components/ui/Button'
import { formatDate, gameLabel, tierLabel, isProfessionalTier } from '@/lib/utils'
import { CalendarDays, MapPin, Swords, Users } from 'lucide-react'

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

      {/* Discord link */}
      {org.discord_invite_url && (
        <div className="mt-3 border-t border-gold/10 pt-3">
          <a
            href={org.discord_invite_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-teal hover:text-teal-light transition-colors"
          >
            Join Discord →
          </a>
        </div>
      )}
    </RetroPanel>
  )
}
