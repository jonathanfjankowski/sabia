import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageSquare, X, Send, Sparkles, Minus, PhoneCall, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import type { WidgetSettings, BrandSettings, Message } from '@/types'
import { useBrandStore } from '@/stores/brand'
import { cn, formatTime } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge'
import { Link } from 'react-router-dom'

export function PublicWidget() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t') || ''
  const brand = useBrandStore((s) => s.brand)

  const [settings, setSettings] = useState<WidgetSettings | null>(null)
  const [brandData, setBrandData] = useState<BrandSettings | null>(null)
  const [open, setOpen] = useState(false)
  const [maintenance, setMaintenance] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [conversationId, setConversationId] = useState<string>()
  const [sessionId] = useState(() => token || `sess-${Math.random().toString(36).slice(2, 10)}`)
  const [minimized, setMinimized] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<WidgetSettings>('/widget/settings').then((s) => {
      setSettings(s)
      if (s.maintenance_mode) setMaintenance(true)
    }).catch(() => {})
    api.get<BrandSettings>('/widget/brand').then(setBrandData).catch(() => {})
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [open, messages, streamingText])

  const send = async () => {
    if (!input.trim() || streaming || !settings) return
    const text = input.trim()
    setInput('')
    setMessages((prev) => [
      ...prev,
      {
        id: -Date.now(),
        conversation_id: conversationId ?? '',
        role: 'user',
        content: text,
        has_images: false,
        created_at: new Date().toISOString(),
      },
    ])
    setStreaming(true)
    setStreamingText('')

    try {
      const res = await api.raw('/widget/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          session_id: sessionId,
        }),
      })
      if (!res.body) throw new Error('Sem stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let acc = ''
      let assistantMessage: Message | null = null

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
            if (parsed.conversation_id && !conversationId) {
              setConversationId(parsed.conversation_id)
            }
            if (typeof parsed.text === 'string') {
              acc += parsed.text
              setStreamingText(acc)
            }
            if (parsed.message) {
              assistantMessage = parsed.message as Message
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      if (assistantMessage) {
        setMessages((prev) => [...prev, assistantMessage!])
      } else if (acc) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            conversation_id: conversationId ?? '',
            role: 'assistant',
            content: acc,
            has_images: false,
            created_at: new Date().toISOString(),
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          conversation_id: conversationId ?? '',
          role: 'assistant',
          content: 'Erro de conexao. Tente novamente.',
          has_images: false,
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setStreaming(false)
      setStreamingText('')
    }
  }

  const handleTransfer = async () => {
    if (!conversationId || transferring) return
    setTransferring(true)
    try {
      const result = await api.post<{ transferred: boolean; reason?: string; link?: string }>(
        `/widget/conversations/${conversationId}/transfer`
      )
      if (result.transferred && result.link) {
        window.open(result.link, '_blank')
      }
    } catch {
      // silent fail
    } finally {
      setTransferring(false)
    }
  }

  const appName = brandData?.app_name ?? brand.app_name
  const primaryColor = brandData?.primary_color ?? brand.primary_color

  if (maintenance && settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: `hsl(var(--primary) / 0.1)` }}
          >
            <MessageSquare className="h-6 w-6" style={{ color: `hsl(var(--primary))` }} />
          </div>
          <h2 className="text-lg font-semibold">{appName}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{settings.maintenance_message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-transparent">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white"
            style={{ background: primaryColor }}
          >
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">{appName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Assistente virtual — como posso ajudar?</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-soft">
          <div ref={scrollRef} className="h-[400px] space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && settings && (
              <div className="prose prose-sm max-w-none text-sm">
                <MarkdownRenderer content={settings.welcome_message} />
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
                  style={{
                    background: m.role === 'assistant' ? primaryColor : undefined,
                    color: m.role === 'assistant' ? 'white' : undefined,
                  }}
                >
                  {m.role === 'assistant' ? <Sparkles className="h-3.5 w-3.5" /> : 'Eu'}
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                    m.role === 'user'
                      ? 'rounded-tr-sm text-white'
                      : 'rounded-tl-sm bg-muted'
                  )}
                  style={m.role === 'user' ? { background: primaryColor } : undefined}
                >
                  {m.role === 'assistant' ? (
                    <MarkdownRenderer content={m.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                  {m.confidence_level && m.role === 'assistant' && (
                    <div className="mt-2 flex items-center gap-2 border-t border-border/40 pt-1.5">
                      <ConfidenceBadge level={m.confidence_level} score={m.confidence} />
                      <span className="text-[10px] text-muted-foreground">{formatTime(m.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="flex gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: primaryColor }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm">
                  {streamingText ? <MarkdownRenderer content={streamingText} /> : <TypingDots />}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            {settings?.support_link && (
              <div className="mb-2 flex items-center justify-between">
                <button
                  onClick={handleTransfer}
                  disabled={!conversationId || streaming || transferring}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
                >
                  <PhoneCall className="h-3 w-3" />
                  {transferring ? 'Transferindo...' : 'Falar com humano'}
                </button>
                {settings.support_phone && (
                  <a
                    href={`tel:${settings.support_phone}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {settings.support_phone}
                  </a>
                )}
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Digite sua mensagem..."
                className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={streaming}
              />
              <button
                onClick={send}
                disabled={!input.trim() || streaming}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-50"
                style={{ background: primaryColor }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 px-1 text-center text-[10px] text-muted-foreground">
              Powered by {appName} · IA · RAG
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-muted-foreground hover:underline">
            Acesso interno (gestor/operador)
          </Link>
        </div>
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
    </span>
  )
}
