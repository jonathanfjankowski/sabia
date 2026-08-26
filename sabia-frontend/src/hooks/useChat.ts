import { useCallback, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { Message } from '@/types'

interface UseChatOptions {
  endpoint: '/chat' | '/widget/chat'
  initialConversationId?: string
  initialMessages?: Message[]
}

interface StreamCallbacks {
  onMessageStart?: () => void
  onChunk?: (text: string) => void
  onMessageEnd?: (message: Message, conversationId: string) => void
  onError?: (err: Error) => void
  onTimeout?: () => void
}

const STREAM_TIMEOUT_MS = 60_000

/**
 * Hook that reads a Laravel SSE stream (section 5.3).
 * Auto-aborts after 60s without [DONE] and fires onTimeout().
 */
export function useChat(options: UseChatOptions) {
  const { endpoint, initialConversationId, initialMessages } = options
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const convIdRef = useRef<string | undefined>(initialConversationId)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearStreamTimeout = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
  }, [])

  const send = useCallback(
    async (text: string, images: string[] = [], callbacks?: StreamCallbacks) => {
      setError(null)
      setIsStreaming(true)
      setStreamingText('')

      const userMessage: Message = {
        id: -Date.now(),
        conversation_id: convIdRef.current ?? '',
        role: 'user',
        content: text,
        images: images.length ? images : undefined,
        has_images: images.length > 0,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      const controller = new AbortController()
      abortRef.current = controller

      clearStreamTimeout()
      timeoutRef.current = window.setTimeout(() => {
        controller.abort()
        callbacks?.onTimeout?.()
      }, STREAM_TIMEOUT_MS)

      try {
        const res = await api.raw(endpoint, {
          method: 'POST',
          body: JSON.stringify({ message: text, conversation_id: convIdRef.current, images }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        if (!res.body) throw new Error('Sem stream')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let assistantText = ''
        let assistantMessage: Message | null = null

        callbacks?.onMessageStart?.()

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') continue
            try {
              const parsed = JSON.parse(payload)
              if (parsed.conversation_id && !convIdRef.current) {
                convIdRef.current = parsed.conversation_id
                setConversationId(parsed.conversation_id)
              }
              if (typeof parsed.text === 'string') {
                assistantText += parsed.text
                setStreamingText(assistantText)
                callbacks?.onChunk?.(parsed.text)
              }
              if (parsed.message) {
                assistantMessage = parsed.message as Message
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }

        clearStreamTimeout()

        if (assistantMessage) {
          setMessages((prev) => [...prev, assistantMessage!])
          callbacks?.onMessageEnd?.(assistantMessage, convIdRef.current ?? '')
        } else if (assistantText) {
          const fallback: Message = {
            id: Date.now(),
            conversation_id: convIdRef.current ?? '',
            role: 'assistant',
            content: assistantText,
            has_images: false,
            created_at: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, fallback])
          callbacks?.onMessageEnd?.(fallback, convIdRef.current ?? '')
        }
      } catch (err) {
        clearStreamTimeout()
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message)
          callbacks?.onError?.(err as Error)
        }
      } finally {
        setIsStreaming(false)
        setStreamingText('')
        abortRef.current = null
      }
    },
    [endpoint, clearStreamTimeout]
  )

  const stop = useCallback(() => {
    clearStreamTimeout()
    abortRef.current?.abort()
  }, [clearStreamTimeout])

  const reset = useCallback(() => {
    clearStreamTimeout()
    setMessages([])
    convIdRef.current = undefined
    setConversationId(undefined)
    setStreamingText('')
    setError(null)
  }, [clearStreamTimeout])

  return { messages, isStreaming, streamingText, conversationId, error, send, stop, reset, setMessages }
}
