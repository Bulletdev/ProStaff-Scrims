export interface RosterPlayer {
  summoner_name: string
  role: string
  tier?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  region: string
  tier?: string
  public_tagline?: string
  discord_server?: string
  discord_invite_url?: string
  scrims_won?: number
  scrims_lost?: number
  total_scrims?: number
  avg_tier?: string
  roster?: RosterPlayer[]
}

export interface LobbyScrim {
  id: string
  scheduled_at: string
  scrim_type: string
  focus_area?: string
  games_planned: number
  status: string
  source: string
  organization: Organization
}

export interface AvailabilityWindow {
  id: string
  day_of_week: number
  day_name: string
  start_hour: number
  end_hour: number
  timezone: string
  time_range: string
  game: string
  region?: string
  tier_preference: string
  focus_area?: string
  draft_type?: string
  active: boolean
  expires_at?: string
}

export interface ScrimRequest {
  id: string
  status: string
  game: string
  message?: string
  proposed_at?: string
  expires_at?: string
  games_planned?: number
  draft_type?: string
  requesting_organization: Organization
  target_organization: Organization
  pending: boolean
  expired: boolean
  created_at: string
}

export interface MatchSuggestion {
  score: number
  organization: Organization
  availability_window: {
    id: string
    day_name: string
    time_range: string
    start_hour: number
    end_hour: number
    timezone: string
  }
}

export interface Pagination {
  current_page: number
  per_page: number
  total_pages: number
  total_count: number
  has_next_page: boolean
  has_prev_page: boolean
}
