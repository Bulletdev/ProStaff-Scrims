'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getCookie } from '@/lib/cookie'
import { tierLabel } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChatPopup } from '@/components/scrims/ChatPopup'
import { FeedbackDrawer } from '@/components/feedback/FeedbackDrawer'

// ── RETRO color tokens (mirrors ProStaff palette) ──────────────────
const GOLD = '#C89B3C'
const GOLD_DIM = 'rgba(200,155,60,0.45)'
const GOLD_FAINT = 'rgba(200,155,60,0.08)'
const NAVY_CARD = 'rgba(15,24,35,0.96)'
const NAVY_DEEP = '#070C14'
const NAVY_BLUE = '#0C223F'

// ── Section label with decorative lines ───────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px 3px' }}>
      <div style={{ width: 10, height: 1, background: `linear-gradient(to right, ${GOLD}, transparent)`, flexShrink: 0 }} />
      <span style={{
        fontSize: 7, color: GOLD_DIM, letterSpacing: '0.2em',
        textTransform: 'uppercase', fontFamily: 'Share Tech Mono, monospace',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${GOLD_DIM})` }} />
    </div>
  )
}

// ── Individual nav item ────────────────────────────────────────────
function NavItem({
  href, label, iconSrc, active, collapsed,
}: {
  href: string
  label: string
  iconSrc: string
  active: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 9,
        padding: collapsed ? '9px 0' : '7px 12px',
        textDecoration: 'none',
        background: active ? GOLD_FAINT : 'transparent',
        borderLeft: active ? `2px solid ${GOLD}` : '2px solid transparent',
        transition: 'background 0.15s, border-color 0.15s',
        boxSizing: 'border-box',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(200,155,60,0.04)'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <img
        src={iconSrc}
        alt=""
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          opacity: active ? 1 : 0.6,
          filter: 'brightness(0) invert(1)',
          transition: 'opacity 0.15s',
        }}
      />
      {!collapsed && (
        <span style={{
          fontSize: 13,
          fontWeight: active ? 700 : 400,
          color: active ? GOLD : 'rgba(255,255,255,0.7)',
          fontFamily: 'Share Tech Mono, monospace',
          letterSpacing: '0.03em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          transition: 'color 0.15s',
        }}>
          {label}
        </span>
      )}
    </Link>
  )
}

// ── Divider ────────────────────────────────────────────────────────
function SidebarDivider() {
  return (
    <div style={{
      margin: '3px 10px',
      height: 1,
      background: `linear-gradient(to right, transparent, ${GOLD_DIM}, transparent)`,
    }} />
  )
}

// ── Sidebar component ──────────────────────────────────────────────
function RetroDashboardSidebar() {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  )

  const pathname = usePathname()

  // Colapsa automaticamente fora do overview
  useEffect(() => {
    if (pathname !== '/dashboard') setCollapsed(true)
  }, [pathname])
  const { organization, logout } = useAuth()
  const { t, language, setLanguage } = useLanguage()

  // ── Nav sections ──────────────────────────────────────────────────
  const mainItems = [
    { href: '/dashboard',        label: t('nav.item.overview'), iconSrc: '/sidebar-icons/Dashboard.svg' },
    { href: '/dashboard/scrims', label: t('nav.item.scrims'),   iconSrc: '/sidebar-icons/Scrims.svg' },
  ]

  const matchItems = [
    { href: '/dashboard/matchmaking',  label: t('nav.item.matchmaking'), iconSrc: '/sidebar-icons/Target.svg' },
    { href: '/dashboard/availability', label: t('nav.item.availability'), iconSrc: '/sidebar-icons/Schedule.svg' },
    { href: '/dashboard/requests',     label: t('nav.item.requests'),    iconSrc: '/sidebar-icons/ProMatches.svg' },
    { href: '/dashboard/inhouse',      label: t('nav.item.inhouse'),     iconSrc: '/sidebar-icons/Strategy.svg' },
  ]

  const teamItems = [
    { href: '/dashboard/roster', label: t('nav.item.roster'), iconSrc: '/sidebar-icons/Roster.svg' },
  ]

  const w = collapsed ? 44 : 168

  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        background: NAVY_CARD,
        borderRight: `1px solid ${GOLD_DIM}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s, min-width 0.25s, max-width 0.25s',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* ── Logo ── */}
      <div style={{
        borderBottom: `1px solid ${GOLD_DIM}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: collapsed ? '12px 0' : '12px 16px',
        background: `linear-gradient(135deg, ${NAVY_BLUE} 0%, ${NAVY_CARD} 100%)`,
        flexShrink: 0,
      }}>
        {collapsed ? (
          <svg width="26" height="26" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <polygon points="12,1 23,12 12,23" fill="#8C1A1A" />
            <polygon points="12,1 1,12 12,23" fill="#1A3A8C" />
            <polygon points="12,1 23,12 12,23 1,12" fill="none" stroke={GOLD} strokeWidth="1.5" />
          </svg>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Image
              src="/scrimlogo.png"
              alt="scrims.lol"
              width={140}
              height={151}
              quality={100}
              priority
              style={{ width: '100%', height: 'auto', maxWidth: 140 }}
            />
            <div style={{
              fontFamily: 'Rajdhani, system-ui, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '2px',
              lineHeight: 1,
            }}>
              <span style={{ color: GOLD }}>scrims</span>
              <span style={{ color: '#4ECDC4' }}>.lol</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Collapse toggle ── */}
      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          borderBottom: `1px solid ${GOLD_DIM}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 6,
          padding: collapsed ? '5px 0' : '5px 10px',
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: `1px solid ${GOLD_DIM}`,
          cursor: 'pointer',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        {!collapsed && (
          <span style={{
            fontSize: 9,
            color: GOLD_DIM,
            fontFamily: 'Share Tech Mono, monospace',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            {t('nav.collapse')}
          </span>
        )}
        <div style={{
          width: 20,
          height: 20,
          border: `1px solid ${GOLD_DIM}`,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: GOLD_DIM,
          flexShrink: 0,
        }}>
          {collapsed
            ? <ChevronRight style={{ width: 12, height: 12 }} />
            : <ChevronLeft style={{ width: 12, height: 12 }} />
          }
        </div>
      </button>

      {/* ── Main nav ── */}
      <div style={{ padding: '10px 0 4px' }}>
        {!collapsed && <SectionLabel label={t('nav.section.general')} />}
        {mainItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            iconSrc={item.iconSrc}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </div>

      <SidebarDivider />

      {/* ── Matchmaking ── */}
      <div style={{ padding: '4px 0' }}>
        {!collapsed && <SectionLabel label={t('nav.section.matchmaking')} />}
        {matchItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            iconSrc={item.iconSrc}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </div>

      <SidebarDivider />

      {/* ── Time ── */}
      <div style={{ padding: '4px 0' }}>
        {!collapsed && <SectionLabel label={t('nav.section.team')} />}
        {teamItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            iconSrc={item.iconSrc}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </div>

      <SidebarDivider />

      {/* ── Lobby link ── */}
      <div style={{ padding: '4px 0' }}>
        {!collapsed && <SectionLabel label={t('nav.section.public')} />}
        <NavItem
          href="/lobby"
          label={t('nav.publicLobby')}
          iconSrc="/sidebar-icons/Scouting.svg"
          active={pathname === '/lobby'}
          collapsed={collapsed}
        />
      </div>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* Feedback + Settings + Logout — above the divider */}
      <FeedbackDrawer isCollapsed={collapsed} />
      <NavItem
        href="/dashboard/settings"
        label={t('nav.item.settings')}
        iconSrc="/sidebar-icons/settings.svg"
        active={pathname === '/dashboard/settings'}
        collapsed={collapsed}
      />

      <button
        onClick={logout}
        title={collapsed ? 'Logout' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 9,
          padding: collapsed ? '9px 0' : '7px 12px',
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderLeft: '2px solid transparent',
          transition: 'background 0.15s',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,155,60,0.04)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        <LogOut style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
        {!collapsed && (
          <span style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.35)',
            fontFamily: 'Share Tech Mono, monospace',
            letterSpacing: '0.03em',
          }}>
            {t('nav.logout')}
          </span>
        )}
      </button>

      {/* ── Bottom: org ── */}
      <div style={{
        borderTop: `1px solid ${GOLD_DIM}`,
        padding: '8px 0',
        flexShrink: 0,
      }}>

        {!collapsed && organization && (
          <div style={{
            padding: '4px 12px 8px',
            overflow: 'hidden',
          }}>
            <div style={{
              fontSize: 13,
              color: GOLD,
              fontFamily: 'Share Tech Mono, monospace',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: 700,
            }}>
              {organization.name}
            </div>
            {organization.tier && (
              <div style={{
                fontSize: 9,
                color: GOLD_DIM,
                fontFamily: 'Share Tech Mono, monospace',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginTop: 1,
              }}>
                {tierLabel(organization.tier)}
              </div>
            )}
          </div>
        )}

        {/* Language switcher */}
        {!collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '4px 8px' }}>
            {(['pt', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  padding: '3px 8px',
                  background: language === lang ? GOLD_FAINT : 'transparent',
                  border: `1px solid ${language === lang ? GOLD_DIM : 'transparent'}`,
                  borderRadius: 2,
                  color: language === lang ? GOLD : 'rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        )}

      </div>

    </aside>
  )
}

// ── Layout ────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!getCookie('scrims_token')) {
      window.location.replace('/login')
    } else {
      setReady(true)
    }
  }, [])

  if (!ready) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: NAVY_DEEP }}>
      <RetroDashboardSidebar />
      <main style={{ flex: 1, overflow: 'auto', padding: 'clamp(12px, 4vw, 32px)' }}>
        {children}
      </main>
      <ChatPopup />
    </div>
  )
}
