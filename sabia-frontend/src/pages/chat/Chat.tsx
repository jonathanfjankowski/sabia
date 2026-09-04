import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Send,
  Paperclip,
  X,
  Sparkles,
  Square,
  Star,
  Download,
  RefreshCw,
  MessageSquare,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  FileText,
  CircleAlert,
  History,
} from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { api } from '@/lib/api'
import type { Conversation, Message } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge'
import { StarRating } from '@/components/common/StarRating'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatRelativeTime, formatTime, initials, downloadText } from '@/lib/utils'
import { toast } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'

export function Chat() {
  const user = useAuthStore((s) => s.user)
  // Timeout de resposta configurado pelo gestor (IA → Conexão)
  const [chatTimeoutMs, setChatTimeoutMs] = useState<number | undefined>(undefined)
  useEffect(() => {
    api
      .get<{ stream_timeout_seconds: number }>('/chat/config')
      .then((r) => setChatTimeoutMs(r.stream_timeout_seconds * 1000))
      .catch(() => {})
  }, [])

  const {
    messages,
    isStreaming,
    streamingText,
    conversationId,
    error: chatError,
    send,
    stop,
    reset,
    setMessages,
    setConversationId,
  } = useChat({ endpoint: '/chat', timeoutMs: chatTimeoutMs })

  const [input, setInput] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [pendingRating, setPendingRating] = useState(false)
  const [rated, setRated] = useState<number | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({})

  /* ---------------- Histórico de conversas ---------------- */
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<Conversation[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const all = await api.get<Conversation[]>('/conversations')
      // O painel é do chat interno: ignora conversas de origem widget/kb
      setHistory(all.filter((c) => c.source === 'direct'))
    } catch {
      toast.error('Erro ao carregar histórico')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const toggleHistory = () => {
    const next = !historyOpen
    setHistoryOpen(next)
    if (next) loadHistory()
  }

  const handleOpenConversation = async (conv: Conversation) => {
    if (isStreaming || loadingConvId) return
    setLoadingConvId(conv.id)
    try {
      const msgs = await api.get<Message[]>(`/conversations/${conv.id}/messages`)
      setMessages(msgs)
      setConversationId(conv.id)
      // Conversa já avaliada não deve reapresentar o prompt de avaliação
      setRated(conv.rating ?? null)
      setPendingRating(false)
      setFeedback({})
      isAtBottomRef.current = true
      setHistoryOpen(false)
    } catch {
      toast.error('Erro ao carregar conversa')
    } finally {
      setLoadingConvId(null)
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastAssistantRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  /* ---------------- Auto-resize textarea ---------------- */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  /* ---------------- Auto scroll when near bottom ---------------- */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior })
  }, [])

  useEffect(() => {
    if (isAtBottomRef.current) scrollToBottom(messages.length > 1 ? 'smooth' : 'auto')
  }, [messages, streamingText, scrollToBottom])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distance < 100
    isAtBottomRef.current = atBottom
    setShowScrollBtn(!atBottom && messages.length > 0)
  }, [messages.length])

  /* ---------------- Rating prompt trigger ---------------- */
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (
      last &&
      last.role === 'assistant' &&
      !isStreaming &&
      !pendingRating &&
      rated === null &&
      messages.length >= 2
    ) {
      const hasUserMsg = messages.some((m) => m.role === 'user')
      if (hasUserMsg) {
        const t = setTimeout(() => setPendingRating(true), 400)
        return () => clearTimeout(t)
      }
    }
  }, [messages, isStreaming, pendingRating, rated])

  /* ---------------- Send ---------------- */
  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    isAtBottomRef.current = true
    const imgs = [...images]
    setImages([])
    await send(text, imgs, undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ---------------- File handling ---------------- */
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (arr.length === 0) {
      toast.warning('Apenas imagens são suportadas')
      return
    }
    if (images.length + arr.length > 5) {
      toast.warning('Máximo de 5 imagens por mensagem')
      return
    }
    for (const file of arr) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error(`${file.name} excede 4MB`)
        continue
      }
      const reader = new FileReader()
      reader.onload = () => setImages((prev) => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    }
  }, [images.length])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    if (fileRef.current) fileRef.current.value = ''
  }

  /* ---------------- Drag & drop + paste ---------------- */
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (const it of items) {
      if (it.kind === 'file') {
        const f = it.getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length) {
      e.preventDefault()
      addFiles(files)
    }
  }

  /* ---------------- Actions ---------------- */
  const handleRate = async (rating: number) => {
    setRated(rating)
    setPendingRating(false)
    if (!conversationId) return
    try {
      await api.post(`/conversations/${conversationId}/close`, { rating })
      toast.success('Avaliação registrada. Obrigado!')
    } catch {
      toast.error('Erro ao registrar avaliação')
    }
  }

  const handleExport = async () => {
    if (!conversationId) return
    try {
      const txt = await api.get<string>(`/conversations/${conversationId}/export`)
      downloadText(`conversa-${conversationId}.txt`, txt)
    } catch {
      toast.error('Erro ao exportar')
    }
  }

  const handleNewConversation = () => {
    reset()
    setRated(null)
    setPendingRating(false)
    setFeedback({})
    setImages([])
    setInput('')
    isAtBottomRef.current = true
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Mensagem copiada')
  }

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedback((prev) => ({ ...prev, [id]: type }))
    toast.success(type === 'up' ? 'Obrigado pelo feedback!' : 'Vamos melhorar essa resposta')
  }

  const handleRegenerate = async () => {
    if (isStreaming) return
    isAtBottomRef.current = true

    const reversed = [...messages].reverse()
    const reverseIndex = reversed.findIndex((m) => m.role === 'user')
    if (reverseIndex !== -1) {
      const lastUserMsgIndex = messages.length - 1 - reverseIndex
      const userMsg = messages[lastUserMsgIndex]
      
      setMessages((prev) => prev.slice(0, lastUserMsgIndex))
      await send(userMsg.content, userMsg.images ?? [], undefined)
    }
  }

  const charCount = input.length
  const maxChars = 2000
  const overLimit = charCount > maxChars

  const isEmpty = messages.length === 0 && !isStreaming
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex h-[calc(100vh-6rem)] flex-col">
        <PageHeader
          title="Chat com IA"
          description="Nível interno · Acesso a artigos confidenciais"
          icon={<MessageSquare className="h-5 w-5" />}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={toggleHistory}>
                <History className="h-3.5 w-3.5" />
                Histórico
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!conversationId}>
                <Download className="h-3.5 w-3.5" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewConversation}>
                <RefreshCw className="h-3.5 w-3.5" />
                Nova
              </Button>
            </>
          }
        />

        <Card
          className={cn(
            'relative mt-3 flex min-h-0 flex-1 flex-col overflow-hidden border-border/60 p-0 transition-all',
            isDragging && 'border-primary border-2 border-dashed bg-primary/5'
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setIsDragging(false)
          }}
          onDrop={onDrop}
        >
          {/* Decorative background */}
          <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
            <div className="absolute -top-24 -left-16 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-secondary/5 blur-3xl" />
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="relative z-10 flex-1 space-y-3 overflow-y-auto bg-transparent px-4 py-4 sm:px-6 sm:py-5"
          >
            {isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Como posso ajudar?</h2>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Digite sua dúvida ou anexe uma imagem para começar.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isLastAssistant = m.role === 'assistant' && m.id === lastAssistant?.id
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    user={user?.full_name ?? 'Você'}
                    ref={isLastAssistant ? lastAssistantRef : null}
                    onCopy={() => handleCopy(m.content)}
                    feedback={feedback[String(m.id)]}
                    onFeedback={(t) => handleFeedback(String(m.id), t)}
                    canRegenerate={isLastAssistant && !isStreaming && idx === messages.length - 1}
                    onRegenerate={handleRegenerate}
                  />
                )
              })
            )}

            {isStreaming && <StreamingBubble text={streamingText} />}

            {chatError && !isStreaming && (
              <div className="mx-auto flex max-w-md items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive animate-fade-in-up">
                <CircleAlert className="h-4 w-4 shrink-0" />
                {chatError}
              </div>
            )}

            {pendingRating && rated === null && !isStreaming && (
              <RatingPrompt onRate={handleRate} onSkip={() => setPendingRating(false)} />
            )}

            {rated !== null && (
              <div className="mx-auto max-w-sm rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-center text-xs animate-fade-in-up">
                <div className="mb-1 flex justify-center">
                  <StarRating value={rated} readOnly size="sm" />
                </div>
                <span className="text-muted-foreground">Obrigado! Conversa encerrada.</span>
              </div>
            )}
          </div>

          {/* Scroll to bottom FAB */}
          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 animate-fade-in-up rounded-full border border-border bg-card/90 p-1.5 shadow-md backdrop-blur transition hover:scale-105 hover:bg-card"
              aria-label="Rolar para o final"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Composer */}
          <div className="relative z-10 border-t border-border/60 bg-card/80 px-3 py-2 backdrop-blur sm:px-4">
            {images.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {images.map((src, i) => (
                  <div key={i} className="group relative">
                    <img
                      src={src}
                      alt={`Anexo ${i + 1}`}
                      className="h-14 w-14 rounded-md border border-border object-cover transition group-hover:scale-105"
                    />
                    <button
                      onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition hover:scale-110"
                      aria-label="Remover imagem"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              className={cn(
                'flex items-end gap-1.5 rounded-xl border bg-background/60 p-1.5 transition-all',
                'focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_var(--primary)/10] focus-within:bg-background',
                overLimit && 'border-destructive/60'
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFile}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileRef.current?.click()}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    disabled={isStreaming}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Anexar imagem</TooltipContent>
              </Tooltip>

              <Textarea
                ref={textareaRef}
                placeholder="Digite sua dúvida..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={onPaste}
                rows={1}
                className="max-h-32 min-h-[32px] flex-1 resize-none border-0 bg-transparent p-1 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isStreaming}
              />

              {isStreaming ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" size="icon" onClick={stop} className="h-8 w-8 shrink-0">
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Parar geração</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || overLimit}
                      size="icon"
                      className="h-8 w-8 shrink-0 transition-all disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enviar (Enter)</TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between px-2 text-[10px] text-muted-foreground">
              <span className="hidden sm:inline">
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Enter</kbd> envia ·{' '}
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Shift+Enter</kbd> quebra linha
              </span>
              <span className="sm:hidden">Enter envia · Shift+Enter quebra linha</span>
              
              <div className="flex items-center gap-2">
                <span className={cn(overLimit && 'font-medium text-destructive')}>
                  {charCount}/{maxChars}
                </span>
                <span className="hidden items-center gap-1 sm:flex">
                  <Paperclip className="h-3 w-3" />
                  {images.length}/5
                </span>
              </div>
            </div>
          </div>

          {isDragging && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary bg-card/80 px-8 py-6 shadow-xl">
                <Paperclip className="h-6 w-6 text-primary" />
                <p className="text-xs font-medium">Solte as imagens aqui</p>
              </div>
            </div>
          )}

          {/* Painel de histórico de conversas */}
          {historyOpen && (
            <div className="absolute inset-y-0 right-0 z-30 flex w-72 animate-fade-in-up flex-col border-l border-border/60 bg-background/95 backdrop-blur sm:w-80">
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <History className="h-3.5 w-3.5 text-primary" />
                  Histórico
                </div>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Fechar histórico"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {historyLoading ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">Carregando…</p>
                ) : history.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    Nenhuma conversa ainda.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {history.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => handleOpenConversation(c)}
                          disabled={loadingConvId !== null || isStreaming}
                          className={cn(
                            'w-full rounded-lg border px-2.5 py-2 text-left transition disabled:opacity-50',
                            c.id === conversationId
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-transparent hover:border-border hover:bg-muted/40'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-medium text-foreground">
                              {c.title || 'Sem título'}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatRelativeTime(c.created_at)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={cn(
                                'rounded px-1 py-0.5 text-[9px]',
                                c.is_closed ? 'bg-muted text-muted-foreground' : 'bg-success/15 text-success'
                              )}
                            >
                              {c.is_closed ? 'Encerrada' : 'Aberta'}
                            </span>
                            {c.rating ? <StarRating value={c.rating} readOnly size="sm" /> : null}
                            {loadingConvId === c.id && (
                              <span className="text-[9px] text-muted-foreground">carregando…</span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </TooltipProvider>
  )
}

/* ============================================================
   MESSAGE BUBBLE
   ============================================================ */
const MessageBubble = ({
  message,
  user,
  ref,
  onCopy,
  feedback,
  onFeedback,
  canRegenerate,
  onRegenerate,
}: {
  message: Message
  user: string
  ref?: React.Ref<HTMLDivElement>
  onCopy: () => void
  feedback?: 'up' | 'down'
  onFeedback: (type: 'up' | 'down') => void
  canRegenerate?: boolean
  onRegenerate: () => void
}) => {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopyClick = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      ref={ref}
      className={cn(
        'group flex items-start gap-2 animate-fade-in-up',
        isUser && 'flex-row-reverse'
      )}
    >
      <Avatar
        className={cn(
          'h-7 w-7 shrink-0 ring-1 ring-background',
          isUser ? 'bg-secondary/20' : 'bg-gradient-to-br from-primary to-primary/70'
        )}
      >
        <AvatarFallback
          className={cn(
            'text-[10px] font-medium',
            isUser ? 'bg-secondary/15 text-secondary' : 'bg-transparent text-primary-foreground'
          )}
        >
          {isUser ? initials(user) || 'U' : <Sparkles className="h-3.5 w-3.5" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex max-w-[85%] flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground',
            isUser && 'flex-row-reverse'
          )}
        >
          <span className="font-medium text-foreground/70">
            {isUser ? user.split(' ')[0] : 'Assistente IA'}
          </span>
          <span>·</span>
          <time dateTime={String(message.created_at)}>{formatTime(message.created_at)}</time>
        </div>

        <div
          className={cn(
            'relative rounded-xl px-3 py-2 text-sm shadow-sm transition-shadow',
            isUser
              ? 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm border border-border/60 bg-card group-hover:shadow-md'
          )}
        >
          {message.has_images && message.images && message.images.length > 0 && (
            <div
              className={cn(
                'flex flex-wrap gap-1.5',
                message.content && 'mb-2 border-b border-border/40 pb-2'
              )}
            >
              {message.images.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={src}
                    alt={`Anexo ${i + 1}`}
                    className="h-20 w-20 rounded-md border border-border object-cover transition hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}

          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:mb-1 prose-headings:mt-2 prose-pre:my-2 prose-pre:rounded-md prose-pre:border prose-pre:border-border prose-pre:bg-zinc-950 prose-code:before:hidden prose-code:after:hidden prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.8em] prose-code:font-medium prose-a:text-primary prose-img:rounded-md prose-blockquote:border-l-primary prose-blockquote:py-0 prose-blockquote:my-1 prose-table:overflow-hidden prose-th:bg-muted prose-th:px-2 prose-th:py-1 prose-td:border-t prose-td:border-border prose-td:px-2 prose-td:py-1">
              <MarkdownRenderer content={message.content} />
            </div>
          )}

          {!isUser && (message.confidence_level || message.sources?.length) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
              <ConfidenceBadge level={message.confidence_level} score={message.confidence} />
              {message.sources && message.sources.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {message.sources.slice(0, 3).map((src, i) => (
                    <a
                      key={i}
                      href={`/articles/${src.article_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[9px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      title={src.title}
                    >
                      <FileText className="h-2.5 w-2.5" />
                      <span className="max-w-[100px] truncate">{src.title}</span>
                    </a>
                  ))}
                  {message.sources.length > 3 && (
                    <span className="px-1 py-0.5 text-[9px] text-muted-foreground">
                      +{message.sources.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {!isUser && (
          <div className="flex items-center gap-0.5 px-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopyClick}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            </button>

            <button
              onClick={() => onFeedback('up')}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded transition',
                feedback === 'up' ? 'bg-success/15 text-success' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-label="Resposta útil"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => onFeedback('down')}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded transition',
                feedback === 'down' ? 'bg-destructive/15 text-destructive' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-label="Resposta não útil"
            >
              <ThumbsDown className="h-3 w-3" />
            </button>

            {canRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   STREAMING BUBBLE
   ============================================================ */
function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 animate-fade-in-up">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/30 blur-md" />
        <Avatar className="relative h-7 w-7 bg-gradient-to-br from-primary to-primary/70 ring-1 ring-background">
          <AvatarFallback className="bg-transparent text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex max-w-[85%] flex-col gap-1">
        <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground/70">Assistente IA</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="relative flex h-1 w-1">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
              <span className="relative inline-flex h-1 w-1 rounded-full bg-success" />
            </span>
            <span className="text-success">Pensando…</span>
          </span>
        </div>

        <div className="relative overflow-hidden rounded-xl rounded-tl-sm border border-primary/30 bg-card p-2.5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />

          {text ? (
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-pre:rounded-md prose-pre:border prose-pre:border-border prose-pre:bg-zinc-950 prose-code:before:hidden prose-code:after:hidden prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.8em]">
              <MarkdownRenderer content={text} />
              <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-primary align-middle" />
            </div>
          ) : (
            <div className="flex items-center gap-1 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce-dot [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce-dot [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce-dot" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   RATING PROMPT
   ============================================================ */
function RatingPrompt({
  onRate,
  onSkip,
}: {
  onRate: (n: number) => void
  onSkip: () => void
}) {
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-card px-4 py-2.5 text-center shadow-sm animate-fade-in-up">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
        Como avalia este atendimento?
      </div>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onRate(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            className="transition-transform hover:scale-110"
            aria-label={`${n} estrelas`}
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                (hover ?? 0) >= n ? 'fill-warning text-warning' : 'fill-transparent text-muted-foreground/40'
              )}
            />
          </button>
        ))}
      </div>
      <button
        onClick={onSkip}
        className="text-[10px] text-muted-foreground transition hover:text-foreground hover:underline"
      >
        Pular avaliação
      </button>
    </div>
  )
}