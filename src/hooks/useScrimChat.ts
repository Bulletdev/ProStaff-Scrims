import { useEffect, useRef, useState, useCallback } from 'react'
import { createConsumer } from '@rails/actioncable'

export interface ScrimMessage {
  id: string
  content: string
  created_at: string
  user: { id: string; full_name: string }
  organization: { id: string; name: string }
}

interface UseScrimChatReturn {
  messages: ScrimMessage[]
  sendMessage: (content: string) => void
  isConnected: boolean
  setMessages: React.Dispatch<React.SetStateAction<ScrimMessage[]>>
}

function buildCableUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'
  const wsBase = base
    .replace('/api/v1', '')
    .replace('https://', 'wss://')
    .replace('http://', 'ws://')
  return `${wsBase}/cable?token=${token}`
}

export function useScrimChat(scrimId: string, token: string | null): UseScrimChatReturn {
  const [messages, setMessages] = useState<ScrimMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createConsumer>['subscriptions']['create']> | null>(null)
  const consumerRef = useRef<ReturnType<typeof createConsumer> | null>(null)

  useEffect(() => {
    if (!token || !scrimId) return

    const consumer = createConsumer(buildCableUrl(token))
    consumerRef.current = consumer

    const subscription = consumer.subscriptions.create(
      { channel: 'ScrimChatChannel', scrim_id: scrimId },
      {
        connected() {
          setIsConnected(true)
        },
        disconnected() {
          setIsConnected(false)
        },
        received(data: { type: string; message?: ScrimMessage }) {
          if (data.type === 'new_message' && data.message) {
            setMessages((prev) => [...prev, data.message!])
          }
        },
      }
    )

    channelRef.current = subscription

    return () => {
      subscription.unsubscribe()
      consumer.disconnect()
      consumerRef.current = null
      channelRef.current = null
      setIsConnected(false)
    }
  }, [scrimId, token])

  const sendMessage = useCallback((content: string) => {
    if (!channelRef.current || !content.trim()) return
    channelRef.current.perform('speak', { content: content.trim() })
  }, [])

  return { messages, sendMessage, isConnected, setMessages }
}
