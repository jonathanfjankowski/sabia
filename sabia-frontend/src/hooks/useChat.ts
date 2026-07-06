import { useState, useRef, useCallback, useEffect } from 'react'
import api from '../services/api'

export interface MessageData {
  id?: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string
  citations?: any[]
  confidence?: any
}

export interface ConversationData {
  id: number
  title: string
  session_id: string
  model: string | null
  is_closed?: boolean
  rating?: number
  messages_count?: number
  created_at: string
  updated_at: string
}

export function useChat() {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [conversation, setConversation] = useState<ConversationData | null>(null)
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [])

  /**
   * Load chat history
   */
  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get('/chat/history')
      setConversations(res.data.data || res.data)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    }
  }, [])

  /**
   * Load messages for a specific conversation
   */
  const loadConversation = useCallback(async (convId: number) => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await api.get(`/conversations/${convId}`)
      setConversation(res.data)
      setMessages(res.data.messages || [])
    } catch (err: any) {
      setError('Erro ao carregar conversa')
      console.error('Erro ao carregar conversa:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Send a message via API with SSE streaming
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return

    // Create AbortController for this request
    abortRef.current = new AbortController()
    setIsStreaming(true)
    setError(null)

    const userMessage: MessageData = {
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    const assistantMessage: MessageData = {
      role: 'assistant',
      content: '',
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      const convId = conversation?.id
      const endpoint = convId
        ? `/conversations/${convId}/messages`
        : '/chat'

      const payload: any = { content }
      const token = localStorage.getItem('token')

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          signal: abortRef.current.signal,
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Erro ao enviar mensagem')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Stream não suportado')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullResponse = ''
      let newConvId: number | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6)
            if (jsonStr === '[DONE]') continue

            try {
              const data = JSON.parse(jsonStr)

              if (data.error) {
                setError(data.error)
                continue
              }

              if (data.done) {
                if (data.conversation_id) {
                  newConvId = data.conversation_id
                }
                continue
              }

              if (data.chunk) {
                fullResponse += data.chunk
                setMessages((prev) => {
                  const updated = [...prev]
                  const lastIdx = updated.length - 1
                  if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      content: fullResponse,
                    }
                  }
                  return updated
                })
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

      // Update conversation ID from response
      if (newConvId && !convId) {
        const convRes = await api.get(`/conversations/${newConvId}`)
        setConversation(convRes.data)
      }

      await loadHistory()
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError(null) // Silently handle cancellation
        // Remove empty assistant message
        setMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant' && !updated[lastIdx].content) {
            updated.pop()
          }
          return updated
        })
      } else {
        setError(err.message || 'Erro ao enviar mensagem')
        // Remove empty assistant message on error
        setMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant' && !updated[lastIdx].content) {
            updated.pop()
          }
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [conversation, isStreaming, loadHistory])

  /**
   * Start a new conversation
   */
  const newConversation = useCallback(() => {
    setConversation(null)
    setMessages([])
    setError(null)
  }, [])

  /**
   * Close conversation with rating
   */
  const closeConversation = useCallback(async (rating: number, feedback?: string) => {
    if (!conversation) return

    try {
      await api.post(`/chat/${conversation.id}/close`, { rating, feedback })
      setConversation({ ...conversation, is_closed: true, rating })
      await loadHistory()
    } catch (err) {
      console.error('Erro ao fechar conversa:', err)
      throw err
    }
  }, [conversation, loadHistory])

  /**
   * Cancel streaming
   */
  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsStreaming(false)
  }, [])

  return {
    messages,
    conversation,
    conversations,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    loadConversation,
    loadHistory,
    newConversation,
    closeConversation,
    cancelStream,
  }
}
