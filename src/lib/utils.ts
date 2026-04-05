import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function formatDay(dayIndex: number) {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  return days[dayIndex] ?? '—'
}

export function tierLabel(tier: string) {
  const map: Record<string, string> = {
    // Organization tiers (long form)
    tier_1_professional: 'Pro',
    tier_2_semi_pro: 'Semi-Pro',
    tier_3_amateur: 'Amador',
    // OpponentTeam tiers (short form)
    tier_1: 'Pro',
    tier_2: 'Semi-Pro',
    tier_3: 'Amador',
    // legacy
    professional: 'Pro',
    semi_pro: 'Semi-Pro',
    amateur: 'Amador',
  }
  return map[tier] ?? tier
}

export function isProfessionalTier(tier: string) {
  return tier === 'tier_1_professional' || tier === 'professional'
}

export function gameLabel(game: string) {
  const map: Record<string, string> = {
    league_of_legends: 'League of Legends',
    valorant: 'Valorant',
    cs2: 'CS2',
    dota2: 'Dota 2',
  }
  return map[game] ?? game
}
