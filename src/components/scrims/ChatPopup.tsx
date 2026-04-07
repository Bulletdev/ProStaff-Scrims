'use client'

import React, { useCallback, useEffect, useRef, useState, KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageSquare, X, ChevronLeft, Send } from 'lucide-react'
import { createConsumer } from '@rails/actioncable'
import { useToken } from '@/hooks/useToken'
import { useAuth } from '@/hooks/useAuth'
import { useScrimChat, ScrimMessage } from '@/hooks/useScrimChat'
import { api } from '@/lib/api'
import { useLanguage } from '@/contexts/LanguageContext'

// ── Types ──────────────────────────────────────────────────────────

interface ScrimEntry {
  id: string
  scheduled_at: string
  status: string
  opponent_team: { name: string; logo_url?: string | null } | null
}

interface ScrimsResponse {
  data: { scrims: ScrimEntry[] }
}

interface MessagesResponse {
  data: { messages: ScrimMessage[] }
}

interface Opponent {
  name: string
  logo_url?: string | null
  scrims: ScrimEntry[]
}

// ── Helpers ────────────────────────────────────────────────────────

function buildCableUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'
  const ws = base.replace('/api/v1', '').replace('https://', 'wss://').replace('http://', 'ws://')
  return `${ws}/cable?token=${token}`
}

type TFn = (key: string, vars?: Record<string, string>) => string

function formatShortDate(iso: string, t: TFn) {
  const d = new Date(iso)
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000)
  if (diff === 0)  return t('chat.today') + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff === 1)  return t('chat.tomorrow')
  if (diff === -1) return t('chat.yesterday')
  if (diff > 1 && diff < 7) return t('chat.inDays', { count: String(diff) })
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(iso: string, t: TFn) {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return t('chat.today')
  if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday')
  return d.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long' })
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function pickActiveScrim(scrims: ScrimEntry[]): ScrimEntry {
  const upcoming = scrims.filter(s => new Date(s.scheduled_at).getTime() > Date.now())
  return upcoming[0] ?? scrims[scrims.length - 1]
}

// ── Team avatar with logo fallback ────────────────────────────────

function TeamAvatar({ name, logoUrl, hasUnread }: { name: string; logoUrl?: string | null; hasUnread: boolean }) {
  const [imgError, setImgError] = useState(false)
  const initials = name.slice(0, 2).toUpperCase()
  const style: React.CSSProperties = {
    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
    background: hasUnread ? 'rgba(255,68,68,0.12)' : 'rgba(200,155,60,0.1)',
    border: `1px solid ${hasUnread ? 'rgba(255,68,68,0.3)' : 'rgba(200,155,60,0.22)'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: 13, fontWeight: 700,
    color: hasUnread ? '#FF4444' : '#C89B3C',
    overflow: 'hidden',
  }
  if (logoUrl && !imgError) {
    return (
      <div style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }
  return <div style={style}>{initials}</div>
}

// ── Background unread tracker ──────────────────────────────────────
// Opens one WS subscription per opponent (on their active scrim).
// Increments unread count when a message arrives from the opponent
// while that conversation is NOT currently open.

function useBackgroundUnread(
  opponents: Opponent[],
  token: string | null,
  currentOrgId: string | null
): {
  unread: Record<string, number>
  markRead: (opponentName: string) => void
} {
  const [unread, setUnread] = useState<Record<string, number>>({})
  const activeNameRef = useRef<string | null>(null)   // updated by markRead callers
  const openConvRef   = useRef<string | null>(null)   // which conversation is open right now

  const markRead = useCallback((name: string) => {
    openConvRef.current = name
    setUnread(prev => ({ ...prev, [name]: 0 }))
  }, [])

  useEffect(() => {
    if (!token || !currentOrgId || opponents.length === 0) return

    const consumer = createConsumer(buildCableUrl(token))

    const subs = opponents.map((opp) => {
      const scrim = pickActiveScrim(opp.scrims)
      return consumer.subscriptions.create(
        { channel: 'ScrimChatChannel', scrim_id: scrim.id },
        {
          received(data: { type: string; message?: ScrimMessage }) {
            if (data.type !== 'new_message' || !data.message) return
            // Ignore own messages
            if (data.message.organization.id === currentOrgId) return
            // Ignore if this conversation is currently open
            if (openConvRef.current === opp.name) return
            setUnread(prev => ({ ...prev, [opp.name]: (prev[opp.name] ?? 0) + 1 }))
          },
        }
      )
    })

    return () => {
      subs.forEach(s => s.unsubscribe())
      consumer.disconnect()
    }
  // Re-subscribe only when the set of scrim IDs changes, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrgId, opponents.map(o => pickActiveScrim(o.scrims).id).join(',')])

  // Keep activeNameRef in sync (unused but kept for future use)
  useEffect(() => { activeNameRef.current = openConvRef.current }, [])

  return { unread, markRead }
}

// ── Conversation view ──────────────────────────────────────────────

function ConversationChat({
  opponent,
  currentOrgId,
  token,
}: {
  opponent: Opponent
  currentOrgId: string
  token: string
}) {
  const { t } = useLanguage()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeScrim = pickActiveScrim(opponent.scrims)
  const scrimIds = opponent.scrims.map(s => s.id)

  // Fetch and merge messages from all scrims with this opponent
  const { data: mergedMessages, isLoading } = useQuery<ScrimMessage[]>({
    queryKey: ['conversation', scrimIds],
    queryFn: async () => {
      const results = await Promise.all(
        scrimIds.map(id =>
          fetch(`/api/scrims/${id}/messages`)
            .then((r: Response) => r.json() as Promise<MessagesResponse>)
            .then(j => j?.data?.messages ?? [])
            .catch(() => [] as ScrimMessage[])
        )
      )
      return (results as ScrimMessage[][])
        .flat()
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    },
    staleTime: 30_000,
  })

  // Live WS on the active scrim
  const { messages: liveMessages, sendMessage, isConnected, setMessages } = useScrimChat(activeScrim.id, token)

  // Seed WS state with merged history
  useEffect(() => {
    if (mergedMessages && mergedMessages.length > 0) setMessages(mergedMessages)
  }, [mergedMessages, setMessages])

  const allMessages = liveMessages.length > 0 ? liveMessages : (mergedMessages ?? [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length])

  function handleSend() {
    if (!input.trim() || !isConnected) return
    sendMessage(input)
    setInput('')
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderBottom: '1px solid rgba(200,155,60,0.08)', flexShrink: 0 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: isConnected ? '#4ECDC4' : 'rgba(255,255,255,0.2)',
          boxShadow: isConnected ? '0 0 4px #4ECDC4' : 'none',
        }} />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {isConnected ? t('chat.live') : t('chat.offline')} · {opponent.scrims.length} {t('chat.scrims')}
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} style={{ height: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 3 }} />
          ))
        ) : allMessages.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: 11, fontFamily: 'Share Tech Mono, monospace', padding: '32px 0' }}>
            {t('chat.noMessages')}
          </p>
        ) : allMessages.map((msg, idx) => {
          const own  = msg.organization.id === currentOrgId
          const prev = allMessages[idx - 1]
          const showDateSep = !prev || !sameDay(prev.created_at, msg.created_at)

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {formatDateLabel(msg.created_at, t)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: own ? 'rgba(200,155,60,0.6)' : 'rgba(78,205,196,0.6)', fontFamily: 'Share Tech Mono, monospace' }}>
                    {msg.user.full_name}
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'Share Tech Mono, monospace' }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <div style={{
                  maxWidth: '80%', padding: '6px 10px', fontSize: 12, lineHeight: 1.45,
                  color: own ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.62)',
                  background: own ? 'rgba(200,155,60,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${own ? 'rgba(200,155,60,0.22)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: own ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(200,155,60,0.1)', display: 'flex', gap: 6, flexShrink: 0 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t('chat.inputPlaceholder')}
          style={{
            flex: 1, background: 'rgba(7,12,20,0.8)',
            border: '1px solid rgba(200,155,60,0.18)', borderRadius: 4,
            padding: '7px 10px', fontSize: 12,
            color: 'rgba(255,255,255,0.85)', outline: 'none',
            fontFamily: 'Share Tech Mono, monospace',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || !isConnected}
          style={{
            background: input.trim() && isConnected ? 'rgba(200,155,60,0.15)' : 'transparent',
            border: '1px solid rgba(200,155,60,0.2)', borderRadius: 4,
            padding: '7px 10px', cursor: input.trim() && isConnected ? 'pointer' : 'not-allowed',
            color: input.trim() && isConnected ? '#C89B3C' : 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', transition: 'background 0.15s',
          }}
        >
          <Send style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  )
}

// ── Main popup ─────────────────────────────────────────────────────

export function ChatPopup() {
  const token = useToken()
  const { organization } = useAuth()
  const { t } = useLanguage()
  const [isOpen, setIsOpen]           = useState(false)
  const [activeOpponent, setActive]   = useState<Opponent | null>(null)

  const { data } = useQuery<ScrimsResponse>({
    queryKey: ['scrims-chat-list', token],
    queryFn: () => api.get('/scrims/scrims?per_page=50&page=1', { token: token! }),
    enabled: !!token,
    staleTime: 60_000,
  })

  // Group by opponent, ±30 days
  const opponents: Opponent[] = Object.values(
    (data?.data?.scrims ?? [])
      .filter(s => {
        const t = new Date(s.scheduled_at).getTime()
        const now = Date.now()
        return t > now - 30 * 86_400_000 && t < now + 30 * 86_400_000
      })
      .reduce<Record<string, Opponent>>((acc, s) => {
        const key = s.opponent_team?.name ?? t('chat.opponent')
        if (!acc[key]) acc[key] = { name: key, logo_url: s.opponent_team?.logo_url, scrims: [] }
        // Update logo_url if we find one (in case first scrim had none)
        if (!acc[key].logo_url && s.opponent_team?.logo_url) acc[key].logo_url = s.opponent_team.logo_url
        acc[key].scrims.push(s)
        return acc
      }, {})
  ).map(opp => ({
    ...opp,
    scrims: opp.scrims.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
  })).sort((a, b) =>
    new Date(pickActiveScrim(a.scrims).scheduled_at).getTime() -
    new Date(pickActiveScrim(b.scrims).scheduled_at).getTime()
  )

  const { unread, markRead } = useBackgroundUnread(opponents, token, organization?.id ?? null)
  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0)

  function openConversation(opp: Opponent) {
    setActive(opp)
    markRead(opp.name)
  }

  function closePanel() {
    setIsOpen(false)
    setActive(null)
  }

  return (
    <>
      {/* Toggle */}
      <button
        onClick={() => isOpen ? closePanel() : setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 28, right: 28,
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(12,20,32,0.97)',
          border: `1px solid ${isOpen ? 'rgba(200,155,60,0.6)' : 'rgba(200,155,60,0.35)'}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, transition: 'border-color 0.2s',
        }}
        title="Scrims Chat"
      >
        <MessageSquare style={{ width: 20, height: 20, color: '#C89B3C' }} />
        {totalUnread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#FF4444', color: '#fff',
            fontSize: 9, fontWeight: 700,
            fontFamily: 'Share Tech Mono, monospace',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '1px solid rgba(7,12,20,0.9)',
          }}>
            {totalUnread}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 88, right: 28,
          width: 360, height: 520,
          background: 'rgba(10,17,27,0.99)',
          border: '1px solid rgba(200,155,60,0.22)',
          borderRadius: 8, boxShadow: '0 12px 48px rgba(0,0,0,0.65)',
          display: 'flex', flexDirection: 'column', zIndex: 50, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 14px', borderBottom: '1px solid rgba(200,155,60,0.12)',
            background: 'rgba(200,155,60,0.04)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeOpponent && (
                <button
                  onClick={() => setActive(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgba(200,155,60,0.55)', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronLeft style={{ width: 16, height: 16 }} />
                </button>
              )}
              {activeOpponent && (
                <TeamAvatar name={activeOpponent.name} logoUrl={activeOpponent.logo_url} hasUnread={false} />
              )}
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#C89B3C', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {activeOpponent ? activeOpponent.name : t('chat.title')}
              </span>
            </div>
            <button
              onClick={closePanel}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center' }}
            >
              <X style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* Body */}
          {activeOpponent && token && organization ? (
            <ConversationChat opponent={activeOpponent} currentOrgId={organization.id} token={token} />
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {opponents.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: 11, fontFamily: 'Share Tech Mono, monospace', padding: '48px 20px' }}>
                  {t('chat.noScrims')}
                </p>
              ) : opponents.map(opp => {
                const count    = unread[opp.name] ?? 0
                const upcoming = opp.scrims.filter(s => new Date(s.scheduled_at).getTime() > Date.now())
                return (
                  <button
                    key={opp.name}
                    onClick={() => openConversation(opp)}
                    style={{
                      width: '100%', padding: '12px 14px',
                      background: count > 0 ? 'rgba(255,68,68,0.04)' : 'transparent',
                      border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      gap: 11, textAlign: 'left', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,155,60,0.05)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = count > 0 ? 'rgba(255,68,68,0.04)' : 'transparent' }}
                  >
                    {/* Avatar */}
                    <TeamAvatar name={opp.name} logoUrl={opp.logo_url} hasUnread={count > 0} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'Share Tech Mono, monospace', fontSize: 12,
                        color: count > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.82)',
                        fontWeight: count > 0 ? 700 : 500,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {opp.name}
                      </div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                        {formatShortDate(pickActiveScrim(opp.scrims).scheduled_at, t)}
                        {opp.scrims.length > 1 && (
                          <span style={{ marginLeft: 6, color: 'rgba(200,155,60,0.35)' }}>
                            · {opp.scrims.length} {t('chat.scrims')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread badge */}
                    {count > 0 ? (
                      <span style={{
                        minWidth: 18, height: 18, borderRadius: 9,
                        background: '#FF4444', color: '#fff',
                        fontSize: 9, fontWeight: 700,
                        fontFamily: 'Share Tech Mono, monospace',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px', flexShrink: 0,
                      }}>
                        {count}
                      </span>
                    ) : upcoming.length > 0 ? (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(200,155,60,0.5)', flexShrink: 0 }} />
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}
