import { useState, useEffect, useRef, useCallback } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import api from '../../services/api'

interface WidgetConfig {
  maintenance: boolean
  welcome_message: string
  app_name: string
  primary_color: string
  secondary_color: string
  logo_url: string | null
  font: string
  support_link: string | null
  support_phone: string | null
  within_business_hours: boolean
  out_of_hours_message: string
  message?: string
}

interface MessageData {
  role: 'user' | 'assistant'
  content: string
}

export function FloatingWidget() {
  const [config, setConfig] = useState<WidgetConfig | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConfig() {
    try {
      const res = await api.get('/widget/config')
      setConfig(res.data)
    } catch (err) {
      console.error('Erro ao carregar config do widget:', err)
    }
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    const userMsg: MessageData = { role: 'user', content }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/widget/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, session_id: sessionId }),
        }
      )

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Erro ao enviar mensagem')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Stream não suportado')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullResponse = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const jsonStr = trimmed.slice(6)
          if (jsonStr === '[DONE]') continue

          try {
            const data = JSON.parse(jsonStr)
            if (data.error) { setError(data.error); continue }
            if (data.done) continue
            if (data.chunk) {
              fullResponse += data.chunk
              setMessages((prev) => {
                const updated = [...prev]
                const lastIdx = updated.length - 1
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = { ...updated[lastIdx], content: fullResponse }
                }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId])

  function renderMarkdown(text: string): string {
    if (!text) return ''
    const raw = marked.parse(text)
    if (raw instanceof Promise) return text
    return DOMPurify.sanitize(raw)
  }

  const primaryColor = config?.primary_color || '#6366f1'
  const secondaryColor = config?.secondary_color || '#4f46e5'

  if (!config) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="w-14 h-14 rounded-full bg-gray-300 animate-pulse shadow-lg" />
      </div>
    )
  }

  if (config.maintenance) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50" style={{ fontFamily: config.font || 'Inter, sans-serif' }}>
      {/* Chat Bubble */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[360px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden mb-2">
          {/* Header */}
          <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {config.logo_url ? (
                  <img src={config.logo_url} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🦜</div>
                )}
                <div>
                  <p className="font-semibold text-sm">{config.app_name}</p>
                  <p className="text-xs opacity-80">Online</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">{config.welcome_message}</p>
                {!config.within_business_hours && (
                  <p className="text-xs text-gray-400 mt-2">{config.out_of_hours_message}</p>
                )}
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 rounded-bl-sm text-gray-800'
                }`} style={msg.role === 'user' ? { background: primaryColor } : {}}>
                  {msg.role === 'user' ? (
                    <p>{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex space-x-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': primaryColor } as any}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-lg text-white disabled:opacity-50"
                style={{ background: primaryColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            {config.support_link && (
              <p className="text-xs text-gray-400 text-center mt-2">
                <a href={config.support_link} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: primaryColor }}>
                  Falar com suporte humano
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Inject CSS variables */}
      <style>{`
        .widget-chat-input:focus { ring-color: ${primaryColor}; }
      `}</style>
    </div>
  )
}
