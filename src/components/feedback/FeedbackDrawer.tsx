'use client'

import { useState, useCallback, useEffect } from 'react'
import { MessageSquarePlus, Send, CheckCircle, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'

// ── Color tokens ──────────────────────────────────────────────────
const G = {
  gold:      '#C89B3C',
  goldDim:   'rgba(200,155,60,0.45)',
  goldFaint: 'rgba(200,155,60,0.08)',
  teal:      '#4ECDC4',
  bg:        '#070C14',
  card:      'rgba(15,24,35,0.96)',
  blue:      '#0C223F',
  textDim:   'rgba(255,255,255,0.35)',
} as const

const CATEGORY_VALUES = ['bug', 'feature', 'improvement', 'performance', 'other'] as const
const CATEGORY_COLORS: Record<string, string> = {
  bug: '#ff4444', feature: G.teal, improvement: G.gold, performance: '#a78bfa', other: G.textDim,
}

type Category = typeof CATEGORY_VALUES[number]
type Tab = 'submit' | 'board'
type TFn = (key: string, params?: Record<string, string>) => string

interface FeedbackItem {
  id: number
  category: Category
  title: string
  description: string
  rating: number | null
  status: string
  votes_count: number
  user_voted: boolean
  source: string
  created_at: string
}

// ── Primitives ─────────────────────────────────────────────────────
const Input = ({ id, placeholder, value, onChange, required }: {
  id: string; placeholder?: string; value: string; onChange: (v: string) => void; required?: boolean
}) => (
  <input id={id} type="text" placeholder={placeholder} value={value}
    onChange={e => onChange(e.target.value)} required={required}
    style={{ width: '100%', padding: '9px 11px', background: 'rgba(12,34,63,0.6)', border: `1px solid ${G.goldDim}`, color: '#fff', fontSize: 11, fontFamily: 'Share Tech Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
    onFocus={e => { e.currentTarget.style.border = `1px solid ${G.gold}` }}
    onBlur={e  => { e.currentTarget.style.border = `1px solid ${G.goldDim}` }}
  />
)

const Textarea = ({ id, placeholder, value, onChange, rows = 4 }: {
  id: string; placeholder?: string; value: string; onChange: (v: string) => void; rows?: number
}) => (
  <textarea id={id} placeholder={placeholder} value={value} rows={rows}
    onChange={e => onChange(e.target.value)}
    style={{ width: '100%', padding: '9px 11px', background: 'rgba(12,34,63,0.6)', border: `1px solid ${G.goldDim}`, color: '#fff', fontSize: 11, fontFamily: 'Share Tech Mono, monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
    onFocus={e => { e.currentTarget.style.border = `1px solid ${G.gold}` }}
    onBlur={e  => { e.currentTarget.style.border = `1px solid ${G.goldDim}` }}
  />
)

const FieldLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 8, color: G.goldDim, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 5, fontFamily: 'Share Tech Mono, monospace' }}>
    {children}
  </label>
)

const CategorySelect = ({ value, onChange, t }: { value: Category | ''; onChange: (v: Category) => void; t: TFn }) => {
  const color = value ? CATEGORY_COLORS[value] : G.textDim
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value as Category)}
        style={{ width: '100%', padding: '9px 32px 9px 11px', background: 'rgba(12,34,63,0.6)', border: `1px solid ${G.goldDim}`, color, fontSize: 11, fontFamily: 'Share Tech Mono, monospace', outline: 'none', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
        <option value="" disabled style={{ color: G.textDim, background: G.bg }}>{t('feedback.form.categoryPlaceholder')}</option>
        {CATEGORY_VALUES.map(cat => (
          <option key={cat} value={cat} style={{ color: CATEGORY_COLORS[cat], background: G.bg }}>{t(`feedback.category.${cat}`)}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 12, height: 12, color: G.goldDim }} />
    </div>
  )
}

const RATING_KEYS = ['', 'feedback.rating.1', 'feedback.rating.2', 'feedback.rating.3', 'feedback.rating.4', 'feedback.rating.5']

const DiamondRating = ({ value, onChange, t }: { value: number; onChange: (v: number) => void; t: TFn }) => (
  <div className="flex items-center gap-2">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" onClick={() => onChange(n)} title={t(RATING_KEYS[n])}
        style={{ width: 18, height: 18, background: n <= value ? G.gold : 'transparent', border: `1px solid ${n <= value ? G.gold : G.goldDim}`, transform: 'rotate(45deg)', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0, boxShadow: n <= value ? `0 0 6px rgba(200,155,60,0.5)` : 'none' }} />
    ))}
    <span style={{ fontSize: 9, color: G.textDim, fontFamily: 'Share Tech Mono, monospace', marginLeft: 4 }}>
      {value === 0 ? t('feedback.noRating') : t(RATING_KEYS[value])}
    </span>
  </div>
)

// ── Success ────────────────────────────────────────────────────────
const SuccessState = ({ onReset, onBoard, t }: { onReset: () => void; onBoard: () => void; t: TFn }) => (
  <div className="flex flex-col items-center justify-center gap-6 py-16 px-6 text-center">
    <div style={{ width: 56, height: 56, background: G.goldFaint, border: `1px solid ${G.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CheckCircle style={{ width: 24, height: 24, color: G.gold }} />
    </div>
    <div>
      <p style={{ fontSize: 12, fontWeight: 'bold', color: G.gold, letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace', textTransform: 'uppercase', marginBottom: 8 }}>{t('feedback.successTitle')}</p>
      <p style={{ fontSize: 10, color: G.textDim, fontFamily: 'Share Tech Mono, monospace', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
        {t('feedback.successBody')}
      </p>
    </div>
    <div className="flex gap-2">
      <button type="button" onClick={onReset}
        style={{ padding: '8px 16px', fontSize: 10, fontFamily: 'Share Tech Mono, monospace', fontWeight: 'bold', color: G.gold, background: 'transparent', border: `1px solid ${G.goldDim}`, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {t('feedback.sendAnother')}
      </button>
      <button type="button" onClick={onBoard}
        style={{ padding: '8px 16px', fontSize: 10, fontFamily: 'Share Tech Mono, monospace', fontWeight: 'bold', color: G.bg, background: `linear-gradient(135deg, ${G.gold}, #a07828)`, border: `1px solid ${G.gold}`, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {t('feedback.viewBoard')}
      </button>
    </div>
  </div>
)

// ── Upvote ─────────────────────────────────────────────────────────
const UpvoteButton = ({ id, count, voted, onVote }: {
  id: number; count: number; voted: boolean; onVote: (id: number, voted: boolean) => void
}) => (
  <button type="button" onClick={() => onVote(id, voted)}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '6px 8px', flexShrink: 0, background: voted ? 'rgba(200,155,60,0.12)' : 'transparent', border: `1px solid ${voted ? G.gold : G.goldDim}`, cursor: 'pointer', transition: 'all 0.15s', minWidth: 36 }}
    onMouseEnter={e => { if (!voted) e.currentTarget.style.borderColor = G.gold }}
    onMouseLeave={e => { if (!voted) e.currentTarget.style.borderColor = G.goldDim }}>
    <ChevronUp style={{ width: 12, height: 12, color: voted ? G.gold : G.textDim }} />
    <span style={{ fontSize: 10, fontWeight: 'bold', color: voted ? G.gold : G.textDim, fontFamily: 'Share Tech Mono, monospace', lineHeight: 1 }}>{count}</span>
  </button>
)

// ── Board card ─────────────────────────────────────────────────────
const BoardCard = ({ item, onVote, t }: { item: FeedbackItem; onVote: (id: number, voted: boolean) => void; t: TFn }) => {
  const color = CATEGORY_COLORS[item.category] ?? G.textDim
  const statusColor = item.status === 'resolved' ? '#00D364' : item.status === 'in_review' ? G.teal : G.goldDim

  return (
    <div className="flex" style={{ border: `1px solid ${G.goldDim}`, background: 'rgba(12,34,63,0.35)', marginBottom: 8 }}>
      <div style={{ borderRight: `1px solid ${G.goldDim}` }}>
        <UpvoteButton id={item.id} count={item.votes_count} voted={item.user_voted} onVote={onVote} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: `1px solid rgba(200,155,60,0.12)`, background: 'rgba(12,34,63,0.4)' }}>
          <span style={{ fontSize: 8, color, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Share Tech Mono, monospace', fontWeight: 'bold' }}>
            {t(`feedback.category.${item.category}`)}
          </span>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 5, height: 5, background: statusColor, borderRadius: '50%' }} />
            <span style={{ fontSize: 7, color: statusColor, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Share Tech Mono, monospace' }}>
              {t(`feedback.status.${item.status}`)}
            </span>
          </div>
        </div>
        <div className="px-3 py-2">
          <p style={{ fontSize: 10, fontWeight: 'bold', color: '#fff', fontFamily: 'Share Tech Mono, monospace', marginBottom: 3, lineHeight: 1.4 }}>{item.title}</p>
          <p style={{ fontSize: 9, color: G.textDim, fontFamily: 'Share Tech Mono, monospace', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {item.description}
          </p>
          <p style={{ fontSize: 8, color: 'rgba(200,155,60,0.35)', fontFamily: 'Share Tech Mono, monospace', marginTop: 5 }}>
            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Board view ─────────────────────────────────────────────────────
function BoardView({ token, t }: { token: string | null; t: TFn }) {
  const [items, setItems]   = useState<FeedbackItem[]>([])
  const [loading, setLoad]  = useState(true)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [error, setError]   = useState('')

  const load = useCallback(async () => {
    setLoad(true); setError('')
    try {
      const params = new URLSearchParams({ source: 'scrims' })
      if (filter !== 'all') params.set('category', filter)
      const res = await api.get<{ data: { data: FeedbackItem[] } }>(`/feedbacks?${params}`, { token: token! })
      setItems(res.data?.data ?? [])
    } catch {
      setError(t('feedback.loadError'))
    } finally {
      setLoad(false)
    }
  }, [filter, token, t])

  useEffect(() => { if (token) load() }, [load, token])

  const handleVote = async (id: number, currentlyVoted: boolean) => {
    setItems(prev => prev.map(item =>
      item.id !== id ? item : { ...item, user_voted: !currentlyVoted, votes_count: currentlyVoted ? item.votes_count - 1 : item.votes_count + 1 }
    ))
    try {
      await api.post(`/feedbacks/${id}/vote`, {}, { token: token! })
    } catch {
      setItems(prev => prev.map(item =>
        item.id !== id ? item : { ...item, user_voted: currentlyVoted, votes_count: currentlyVoted ? item.votes_count + 1 : item.votes_count - 1 }
      ))
    }
  }

  const sorted = [...items].sort((a, b) => b.votes_count - a.votes_count)
  const filterOptions = [{ value: 'all', label: t('feedback.all') }, ...CATEGORY_VALUES.map(v => ({ value: v, label: t(`feedback.category.${v}`) }))]

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 flex-wrap px-4 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${G.goldDim}` }}>
        {filterOptions.map(cat => (
          <button key={cat.value} type="button" onClick={() => setFilter(cat.value as Category | 'all')}
            style={{ padding: '3px 8px', fontSize: 8, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', border: `1px solid ${filter === cat.value ? G.gold : G.goldDim}`, background: filter === cat.value ? G.goldFaint : 'transparent', color: filter === cat.value ? G.gold : G.textDim }}>
            {cat.label}
          </button>
        ))}
        <button type="button" onClick={load} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: G.goldDim, display: 'flex' }}>
          <RefreshCw style={{ width: 11, height: 11 }} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && [1, 2, 3].map(n => <div key={n} style={{ height: 80, border: `1px solid ${G.goldDim}`, background: 'rgba(12,34,63,0.2)', opacity: 0.5, marginBottom: 8 }} />)}
        {!loading && error && <p style={{ fontSize: 10, color: '#ff4444', fontFamily: 'Share Tech Mono, monospace' }}>{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p style={{ fontSize: 10, color: G.textDim, fontFamily: 'Share Tech Mono, monospace', textAlign: 'center', paddingTop: 40 }}>{t('feedback.noFeedback')}</p>
        )}
        {!loading && !error && sorted.map(item => <BoardCard key={item.id} item={item} onVote={handleVote} t={t} />)}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export function FeedbackDrawer({ isCollapsed }: { isCollapsed: boolean }) {
  const { token, user }    = useAuth()
  const { t }              = useLanguage()
  const [open, setOpen]    = useState(false)
  const [tab, setTab]      = useState<Tab>('submit')
  const [category, setCat] = useState<Category | ''>('')
  const [title, setTitle]  = useState('')
  const [desc, setDesc]    = useState('')
  const [rating, setRating]       = useState(0)
  const [loading, setLoading]     = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')

  const reset = () => { setCat(''); setTitle(''); setDesc(''); setRating(0); setSubmitted(false); setError('') }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setTimeout(() => { reset(); setTab('submit') }, 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !title.trim() || !desc.trim()) return
    setLoading(true); setError('')
    try {
      await api.post('/feedbacks', { feedback: { category, title, description: desc, rating: rating || null, source: 'scrims' } }, { token: token! })
      setSubmitted(true)
    } catch {
      setError(t('feedback.sendError'))
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !!category && title.trim().length > 0 && desc.trim().length > 0 && !loading

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button type="button" title={isCollapsed ? t('feedback.title') : undefined}
          style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', width: '100%', gap: isCollapsed ? 0 : 9, padding: isCollapsed ? '8px 0' : '7px 12px', background: 'transparent', border: 'none', borderLeft: '2px solid transparent', cursor: 'pointer', transition: 'background 0.15s', boxSizing: 'border-box' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,155,60,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          <MessageSquarePlus style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
          {!isCollapsed && (
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
              {t('feedback.title')}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
        <Dialog.Content
          style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, maxWidth: '90vw', background: 'rgba(10,18,30,0.98)', border: `1px solid ${G.goldDim}`, borderRight: 'none', display: 'flex', flexDirection: 'column', zIndex: 51, fontFamily: 'Share Tech Mono, monospace' }}
          aria-describedby={undefined}
        >
          <Dialog.Title style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
            {t('feedback.title')}
          </Dialog.Title>

          {/* Header */}
          <div className="relative flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${G.blue} 0%, rgba(12,34,63,0.6) 100%)`, borderBottom: `1px solid ${G.goldDim}` }}>
            <div style={{ width: 32, height: 32, background: G.goldFaint, border: `1px solid ${G.goldDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquarePlus style={{ width: 16, height: 16, color: G.gold }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 'bold', color: G.gold, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('feedback.title')}</div>
              <div style={{ fontSize: 8, color: G.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>{t('feedback.subtitle')}</div>
            </div>
            <Dialog.Close asChild>
              <button style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: G.textDim, display: 'flex', padding: 4 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Scanline */}
          <div style={{ height: 2, background: `linear-gradient(to right, ${G.gold}, ${G.goldFaint} 60%, transparent)`, flexShrink: 0 }} />

          {/* Tabs */}
          <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid ${G.goldDim}` }}>
            {(['submit', 'board'] as Tab[]).map(tabKey => (
              <button key={tabKey} type="button" onClick={() => { setTab(tabKey); if (tabKey === 'submit') reset() }}
                style={{ flex: 1, padding: '8px 0', fontSize: 9, fontFamily: 'Share Tech Mono, monospace', fontWeight: 'bold', letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', background: tab === tabKey ? G.goldFaint : 'transparent', color: tab === tabKey ? G.gold : G.textDim, borderBottom: tab === tabKey ? `2px solid ${G.gold}` : '2px solid transparent' }}>
                {tabKey === 'submit' ? t('feedback.submit') : t('feedback.board')}
              </button>
            ))}
          </div>

          {/* Board */}
          {tab === 'board' ? (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <BoardView token={token} t={t} />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto" style={{ padding: '20px 20px 0' }}>
                {submitted ? (
                  <SuccessState onReset={reset} onBoard={() => setTab('board')} t={t} />
                ) : (
                  <form id="feedback-form" onSubmit={handleSubmit} className="space-y-5">
                    {user && (
                      <div className="flex items-center gap-2 px-3 py-2" style={{ background: G.goldFaint, border: `1px solid ${G.goldDim}` }}>
                        <div style={{ width: 22, height: 22, background: G.blue, border: `1px solid ${G.goldDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: G.gold, fontWeight: 'bold', flexShrink: 0 }}>
                          {user.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span style={{ fontSize: 9, color: G.textDim }}>{user.full_name ?? user.email}</span>
                      </div>
                    )}
                    <div>
                      <FieldLabel htmlFor="fb-cat">{t('feedback.form.category')}</FieldLabel>
                      <CategorySelect value={category} onChange={setCat} t={t} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="fb-title">{t('feedback.form.title')}</FieldLabel>
                      <Input id="fb-title" placeholder={t('feedback.form.titlePlaceholder')} value={title} onChange={setTitle} required />
                    </div>
                    <div>
                      <FieldLabel htmlFor="fb-desc">{t('feedback.form.description')}</FieldLabel>
                      <Textarea id="fb-desc" placeholder={t('feedback.form.descPlaceholder')} value={desc} onChange={setDesc} rows={5} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="fb-rating">{t('feedback.form.rating')}</FieldLabel>
                      <DiamondRating value={rating} onChange={setRating} t={t} />
                    </div>
                    {error && (
                      <p style={{ fontSize: 10, color: '#ff4444', padding: '6px 10px', border: '1px solid rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.06)' }}>{error}</p>
                    )}
                  </form>
                )}
              </div>
              {!submitted && (
                <div className="flex-shrink-0" style={{ padding: '16px 20px', borderTop: `1px solid ${G.goldDim}`, background: `linear-gradient(to right, ${G.blue}, ${G.card})` }}>
                  <button type="submit" form="feedback-form" disabled={!canSubmit}
                    className="w-full flex items-center justify-center gap-2"
                    style={{ padding: '10px 0', fontSize: 11, fontWeight: 'bold', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', background: canSubmit ? `linear-gradient(135deg, ${G.gold} 0%, #a07828 100%)` : G.blue, color: canSubmit ? G.bg : G.textDim, border: `1px solid ${canSubmit ? G.gold : G.goldDim}`, cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                    <Send style={{ width: 13, height: 13 }} />
                    {loading ? t('feedback.sending') : t('feedback.send')}
                  </button>
                </div>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
