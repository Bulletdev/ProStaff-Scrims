'use client'

import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RetroPanel } from '@/components/ui/RetroPanel'
import { Button } from '@/components/ui/Button'
import { useToken } from '@/hooks/useToken'
import { useScrimChat, ScrimMessage } from '@/hooks/useScrimChat'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  scrimId: string
  opponentName: string
  currentOrgId: string
}

interface MessagesResponse {
  data: {
    messages: ScrimMessage[]
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function ScrimChat({ scrimId, opponentName, currentOrgId }: Props) {
  const token = useToken()
  const { t } = useLanguage()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, isConnected, setMessages } = useScrimChat(scrimId, token)

  const { data: historyData, isLoading } = useQuery<MessagesResponse>({
    queryKey: ['scrim-messages', scrimId],
    queryFn: async () => {
      const res = await fetch(`/api/scrims/${scrimId}/messages`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    enabled: !!scrimId,
  })

  useEffect(() => {
    const history = historyData?.data?.messages ?? []
    if (history.length > 0) {
      setMessages(history)
    }
  }, [historyData, setMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOwnOrg = (msg: ScrimMessage) => msg.organization.id === currentOrgId

  return (
    <RetroPanel
      title={t('scrims.chat.title', { opponent: opponentName })}
      badge={
        isConnected
          ? t('scrims.chat.connected')
          : t('scrims.chat.disconnected')
      }
      className="flex flex-col h-full"
    >
      <div className="flex flex-col gap-3" style={{ minHeight: 0 }}>
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-teal-bright shadow-[0_0_4px_theme(colors.teal.bright)]' : 'bg-text-dim'}`}
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
            {isConnected ? t('scrims.chat.live') : t('scrims.chat.offline')}
          </span>
        </div>

        {/* Messages list */}
        <div
          className="overflow-y-auto rounded-sm border border-gold/10 bg-navy-deep p-3 space-y-2"
          style={{ maxHeight: '400px', minHeight: '200px' }}
        >
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-sm bg-navy-card" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <p className="py-4 text-center font-mono text-xs text-text-dim">
              {t('scrims.chat.empty')}
            </p>
          ) : (
            messages.map((msg) => {
              const own = isOwnOrg(msg)
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-0.5 ${own ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${own ? 'text-gold/70' : 'text-teal-bright/70'}`}>
                      {msg.organization.name}
                    </span>
                    <span className="font-mono text-[10px] text-text-dim">
                      {msg.user.full_name}
                    </span>
                    <span className="font-mono text-[9px] text-text-dim">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-sm px-3 py-1.5 text-sm ${
                      own
                        ? 'border border-gold/20 bg-gold/10 text-text-primary'
                        : 'border border-gold/10 bg-navy-card text-text-muted'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('scrims.chat.placeholder')}
            className="flex-1 rounded-sm border border-gold/20 bg-navy-deep px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:border-gold/50 focus:outline-none"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
          >
            {t('scrims.chat.send')}
          </Button>
        </div>
      </div>
    </RetroPanel>
  )
}
