'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToken } from '@/hooks/useToken'

const SEED_LOBBY_BASE = [
  { tier: { pt: 'CHALLENGER', en: 'CHALLENGER' }, tierAlt: false, name: 'Phantom Wolves',   meta: { pt: 'BR · LANING · SEX 20:00–23:00',    en: 'BR · LANING · FRI 20:00–23:00'    }, badge: { pt: 'ABERTO',  en: 'OPEN'    }, badgeOpen: true  },
  { tier: { pt: 'MESTRE',     en: 'MASTER'     }, tierAlt: true,  name: 'Nova Gaming',      meta: { pt: 'BR · TEAMFIGHT · SAB 19:00–22:00', en: 'BR · TEAMFIGHT · SAT 19:00–22:00' }, badge: { pt: '2 VAGAS', en: '2 SLOTS' }, badgeOpen: false },
  { tier: { pt: 'CHALLENGER', en: 'CHALLENGER' }, tierAlt: false, name: 'Eternal Force',    meta: { pt: 'SP · DRAFT · DOM 15:00–18:00',     en: 'SP · DRAFT · SUN 15:00–18:00'     }, badge: { pt: 'ABERTO',  en: 'OPEN'    }, badgeOpen: true  },
  { tier: { pt: 'MESTRE',     en: 'MASTER'     }, tierAlt: true,  name: 'DarkStar Esports', meta: { pt: 'BR · OBJECTIVES · SEX 21:00–00:00', en: 'BR · OBJECTIVES · FRI 21:00–00:00' }, badge: { pt: '1 VAGA',  en: '1 SLOT'  }, badgeOpen: false },
]

export default function LandingPage() {
  const { t, language, setLanguage } = useLanguage()
  const token = useToken()
  const isLoggedIn = !!token

  const STATS = [
    { value: '247',  label: t('landing.stats.teams') },
    { value: '1.2K', label: t('landing.stats.scrims') },
    { value: '4.8K', label: t('landing.stats.maps') },
  ]

  const FEATURES = [
    { title: t('landing.features.matchmaking.title'), desc: t('landing.features.matchmaking.desc') },
    { title: t('landing.features.stats.title'),       desc: t('landing.features.stats.desc') },
    { title: t('landing.features.bot.title'),         desc: t('landing.features.bot.desc') },
    { title: t('landing.features.prostaff.title'),    desc: t('landing.features.prostaff.desc') },
  ]

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-navy font-sans text-text-primary">
      {/* Grid de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(200,155,60,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,155,60,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Scanlines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        }}
      />
      <HudCorner pos="tl" />
      <HudCorner pos="tr" />
      <HudCorner pos="bl" />
      <HudCorner pos="br" />

      {/* ── NAV ── */}
      <nav className="relative z-10 flex items-center justify-between border-b border-gold/20 px-7 py-4">
        <div>
          <div className="font-display text-[22px] font-bold leading-none tracking-[2px]">
            <span className="text-gold">scrims</span>
            <span className="text-teal-bright">.lol</span>
          </div>
          <span className="mt-0.5 block font-mono text-[9px] tracking-[3px] text-gold/50">
            POWERED BY PROSTAFF.GG
          </span>
        </div>

        <div className="flex items-center gap-5 font-mono text-[11px] tracking-widest text-text-muted">
          <Link href="/lobby" className="transition-colors hover:text-text-primary">
            {t('nav.lobby')}
          </Link>
          <span className="rounded-sm border border-gold/40 bg-gold/15 px-1.5 py-0.5 font-mono text-[9px] tracking-[2px] text-gold">
            {t('landing.hero.beta')}
          </span>
          <div className="flex items-center gap-1">
            {(['pt', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className="rounded-sm px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest transition-colors"
                style={{
                  background: language === lang ? 'rgba(200,155,60,0.12)' : 'transparent',
                  border: `1px solid ${language === lang ? 'rgba(200,155,60,0.4)' : 'transparent'}`,
                  color: language === lang ? 'rgba(200,155,60,1)' : 'rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-sm bg-gold px-4 py-2 font-mono text-[11px] font-semibold tracking-[2px] text-navy transition-colors hover:bg-gold-light"
            >
              {t('nav.dashboard')}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="font-mono text-[11px] text-text-muted transition-colors hover:text-text-primary"
              >
                {t('nav.signIn')}
              </Link>
              <Link
                href="/register"
                className="rounded-sm bg-gold px-4 py-2 font-mono text-[11px] font-semibold tracking-[2px] text-navy transition-colors hover:bg-gold-light"
              >
                {t('nav.getStarted')}
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO 2 colunas ── */}
      <section className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-7 pb-16 pt-14 lg:grid-cols-2">
        {/* Coluna esquerda */}
        <div>
          {/* Eyebrow — LoL only */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[3px] text-teal-bright">
              <span className="inline-block h-px w-5 bg-teal-bright" />
              {t('landing.hero.eyebrow')}
            </div>
            <span className="rounded-sm border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[9px] tracking-[2px] text-gold/70">
              {t('landing.hero.badge')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-wide text-text-primary lg:text-[52px]">
            {t('landing.hero.title1')}
            <br />
            {t('landing.hero.title2')}
            <br />
            <span className="text-gold">{t('landing.hero.title3')}</span>
          </h1>

          <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-text-muted">
            {t('landing.hero.desc')}
          </p>

          {/* CTAs */}
          <div className="mt-7 flex items-center gap-3">
            <Link
              href={isLoggedIn ? '/dashboard' : '/register'}
              className="rounded-sm bg-gold px-5 py-3 font-mono text-[11px] font-semibold tracking-[2px] text-navy transition-colors after:ml-2 after:content-['→'] hover:bg-gold-light"
            >
              {isLoggedIn ? t('nav.dashboard') : t('landing.hero.cta1')}
            </Link>
            <Link
              href="/lobby"
              className="rounded-sm border border-gold/40 px-5 py-3 font-mono text-[11px] tracking-[2px] text-gold transition-colors hover:bg-gold/10"
            >
              {t('landing.hero.cta2')}
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-9 flex gap-7">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-display text-[28px] font-bold leading-none text-gold">
                  {s.value}
                </div>
                <div className="mt-1 font-mono text-[10px] tracking-wide text-text-muted/60">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Coluna direita — lobby ao vivo */}
        <div className="overflow-hidden rounded-sm border border-gold/25 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-gold/20 bg-gold/10 px-4 py-2.5">
            <span className="font-mono text-[9px] tracking-[3px] text-gold">{t('lobby.widgetTitle')}</span>
            <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[2px] text-teal-bright">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-bright" />
              {t('lobby.live')}
            </span>
          </div>

          {SEED_LOBBY_BASE.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-gold/10 px-4 py-3 last:border-b-0"
            >
              <span
                className="shrink-0 whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[9px] tracking-wide"
                style={
                  entry.tierAlt
                    ? { borderColor: 'rgba(244,114,182,0.4)', background: 'rgba(244,114,182,0.12)', color: '#f472b6' }
                    : { borderColor: 'rgba(200,155,60,0.3)', background: 'rgba(200,155,60,0.15)', color: '#C89B3C' }
                }
              >
                {entry.tier[language]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold tracking-[0.5px] text-text-primary">
                  {entry.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-[10px] text-text-muted/60">
                  {entry.meta[language]}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[9px] tracking-wide ${
                  entry.badgeOpen
                    ? 'border-teal-bright/40 bg-teal-bright/15 text-teal-bright'
                    : 'border-gold/40 bg-gold/15 text-gold'
                }`}
              >
                {entry.badge[language]}
              </span>
            </div>
          ))}

          <div className="border-t border-gold/10 px-4 py-3 text-center">
            <Link
              href="/lobby"
              className="font-mono text-[10px] tracking-widest text-gold/60 transition-colors hover:text-gold"
            >
              {t('lobby.viewAll')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-7 pb-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-sm border border-gold/15 bg-white/[0.02] p-5 transition-all hover:border-gold/30 hover:bg-gold/5"
            >
              <div className="mb-2 font-display text-[15px] font-bold tracking-wide text-gold">
                {f.title}
              </div>
              <p className="text-[12px] leading-relaxed text-text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOT BANNER ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-7 pb-20">
        <div className="overflow-hidden rounded-sm border border-teal-bright/20 bg-teal-bright/5 px-8 py-7">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 font-mono text-[10px] tracking-[3px] text-teal-bright">
                {t('landing.bot.eyebrow')}
              </div>
              <h2 className="font-display text-2xl font-bold text-text-primary">
                {t('landing.bot.title')}
              </h2>
              <p className="mt-2 max-w-lg text-[13px] text-text-muted">
                {t('landing.bot.desc')}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <a
                href="https://discord.gg/yNUSWMDbq4"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm border border-teal-bright/50 bg-teal-bright/15 px-5 py-3 text-center font-mono text-[11px] font-semibold tracking-[2px] text-teal-bright transition-all hover:bg-teal-bright/25"
              >
                {t('landing.bot.cta')}
              </a>
              <span className="text-center font-mono text-[9px] tracking-wider text-text-muted/50">
                discord.gg/yNUSWMDbq4
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 mt-auto">
        {/* top gradient line */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

        <div className="bg-gradient-to-b from-[#0C223F]/60 to-[#070C14] px-7 py-8">
          <div className="mx-auto max-w-6xl">
            {/* divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent mb-4" />

            {/* bottom bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* left: diamond + copy */}
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rotate-45 bg-gold/40" />
                <span className="font-mono text-[13px] tracking-[2px] text-white/20">
                  {t('landing.footer.copy')}
                </span>
              </div>

              {/* center: powered by */}
              <a
                href="https://prostaff.gg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 opacity-40 transition-opacity hover:opacity-90"
              >
                <span className="font-mono text-[13px] tracking-[2px] text-white/60 uppercase">
                  {t('landing.footer.poweredBy')}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/PROSTAFFLOGO.png" alt="ProStaff" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/prostaffgg.png" alt="ProStaff.gg" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
              </a>

              {/* right: diamond */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] tracking-[2px] text-gold/30">
                  {t('landing.footer.region')}
                </span>
                <div className="h-1.5 w-1.5 rotate-45 bg-gold/40" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function HudCorner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const positions = {
    tl: 'top-2 left-2 border-t-2 border-l-2',
    tr: 'top-2 right-2 border-t-2 border-r-2',
    bl: 'bottom-2 left-2 border-b-2 border-l-2',
    br: 'bottom-2 right-2 border-b-2 border-r-2',
  }
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-10 h-4 w-4 border-gold/60 ${positions[pos]}`}
    />
  )
}
