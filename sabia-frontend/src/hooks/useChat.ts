import { useCallback, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { Message } from '@/types'

interface UseChatOptions {
  endpoint: '/chat' | '/widget/chat'
  initialConversationId?: string
  initialMessages?: Message[]
  /** Tempo máximo de espera pela resposta, em ms. Padrão: 180s (configurável pelo gestor em IA → Conexão). */
  timeoutMs?: number
}

interface StreamCallbacks {
  onMessageStart?: () => void
  onChunk?: (text: string) => void
  onMessageEnd?: (message: Message, conversationId: string) => void
  onError?: (err: Error) => void
  onTimeout?: () => void
}

// Timeout TOTAL de espera. Não há timer de "silêncio": o backend ecoa o
// conversation_id imediatamente e depois fica em silêncio enquanto o modelo
// pensa — silêncio pós-primeiro-byte é normal. Provedor travado de verdade é
// cortado pelo timeout(120) do AIProvider, que devolve erro no próprio stream.
const DEFAULT_TIMEOUT_MS = 180_000

/**
 * Hook that reads a Laravel SSE stream (section 5.3).
 * Aborts after `timeoutMs` in total, preserving partial text and posting an
 * automatic timeout message.
 */
export function useChat(options: UseChatOptions) {
  const { endpoint, initialConversationId, initialMessages, timeoutMs } = options
  const maxTimeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const convIdRef = useRef<string | undefined>(initialConversationId)
  const totalTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearStreamTimeout = useCallback(() => {
    if (totalTimeoutRef.current !== undefined) {
      window.clearTimeout(totalTimeoutRef.current)
      totalTimeoutRef.current = undefined
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

      let timedOut = false
      const abortByTimeout = () => {
        timedOut = true
        controller.abort()
        callbacks?.onTimeout?.()
      }

      clearStreamTimeout()
      totalTimeoutRef.current = window.setTimeout(abortByTimeout, maxTimeoutMs)

      // Declarados fora do try: o catch precisa do texto acumulado para
      // preservar resposta parcial em abort/timeout.
      let assistantText = ''
      let assistantMessage: Message | null = null

      const appendAssistant = (content: string) => {
        const message: Message = {
          id: Date.now(),
          conversation_id: convIdRef.current ?? '',
          role: 'assistant',
          content,
          has_images: false,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, message])
        callbacks?.onMessageEnd?.(message, convIdRef.current ?? '')

        return message
      }

      try {
        const res = await api.raw(endpoint, {
          method: 'POST',
          body: JSON.stringify({ message: text, conversation_id: convIdRef.current, images }),
          signal: controller.signal,
        })
        if (!res.ok) {
          // O backend devolve { message } amigável nos bloqueios/erros
          // (ex.: prompt injection) — mostrar isso em vez de "HTTP 400"
          const body = (await res.json().catch(() => null)) as { message?: string } | null
          throw new Error(body?.message || `HTTP ${res.status}`)
        }
        if (!res.body) throw new Error('Sem stream')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

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

        if (assistantMessage) {
          setMessages((prev) => [...prev, assistantMessage!])
          callbacks?.onMessageEnd?.(assistantMessage, convIdRef.current ?? '')
        } else if (assistantText) {
          appendAssistant(assistantText)
        } else {
          // Stream encerrou sem resposta (ex.: provedor de IA derrubou a
          // conexão): falhar em silêncio deixa o usuário sem feedback.
          const err = new Error('O assistente não retornou resposta. Tente novamente.')
          setError(err.message)
          callbacks?.onError?.(err)
        }
      } catch (err) {
        const isAbort = (err as Error).name === 'AbortError'

        if (assistantText) {
          // Parada no meio da geração (timeout ou botão "Parar"): preserva
          // o que já chegou em vez de descartar em silêncio.
          appendAssistant(assistantText)
        } else if (timedOut) {
          // Mensagem automática de timeout, visível na conversa.
          const seconds = Math.round(maxTimeoutMs / 1000)
          appendAssistant(
            `⏱️ A resposta não foi concluída em ${seconds} segundos (tempo limite). Tente novamente.`,
          )
        }

        if (!isAbort) {
          setError((err as Error).message)
          callbacks?.onError?.(err as Error)
        } else if (timedOut && callbacks?.onError) {
          callbacks.onError(new Error('timeout'))
        }
      } finally {
        clearStreamTimeout()
        setIsStreaming(false)
        setStreamingText('')
        abortRef.current = null
      }
    },
    // maxTimeoutMs/idleMs derivam de timeoutMs; incluir timeoutMs nas deps
    // para rearmar os timers quando o gestor mudar a config ao vivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint, timeoutMs, clearStreamTimeout]
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

  return { messages, isStreaming, streamingText, conversationId, error, send, stop, reset, setMessages, setConversationId }
}
