import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessagesSquare, Download, X, MessageSquare, Sparkles, User } from 'lucide-react'
import { api } from '@/lib/api'
import type { Conversation, Message } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import { StarRating } from '@/components/common/StarRating'
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge'
import { downloadText, formatDateTime, formatTime, cn } from '@/lib/utils'

export function WidgetConversations() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'closed' | 'transferred' | 'out_of_hours' | 'no_answer'>('all')

  useEffect(() => {
    api.get<Conversation[]>('/admin/widget-conversations').then(setConversations).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) {
      const conv = conversations.find((c) => c.id === id)
      if (conv) openConversation(conv)
    }
  }, [searchParams, conversations])

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'closed') return c.is_closed
      return c.transfer_status === statusFilter
    })
  }, [conversations, statusFilter])

  const openConversation = async (conv: Conversation) => {
    setSelected(conv)
    const msgs = await api.get<Message[]>(`/conversations/${conv.id}/messages`)
    setMessages(msgs)
  }

  const handleExport = async (conv: Conversation) => {
    const txt = await api.get<string>(`/admin/widget-conversations/${conv.id}/export`)
    downloadText(`widget-${conv.id}.txt`, txt)
  }

  const statusBadge = (c: Conversation) => {
    if (c.transfer_status === 'transferred')
      return <Badge variant="warning">Transferido</Badge>
    if (c.transfer_status === 'out_of_hours')
      return <Badge variant="info">Fora do horário</Badge>
    if (c.transfer_status === 'no_answer')
      return <Badge variant="destructive">Sem resposta</Badge>
    if (c.is_closed) return <Badge variant="success">Encerrada</Badge>
    return <Badge variant="secondary">Em andamento</Badge>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chats do Widget"
        description="Conversas públicas via widget flutuante"
        icon={<MessagesSquare className="h-5 w-5" />}
      />

      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(['all', 'closed', 'transferred', 'out_of_hours', 'no_answer'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              statusFilter === s ? 'bg-card shadow-soft' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s === 'all' ? 'Todos' : s === 'closed' ? 'Encerrados' : s === 'transferred' ? 'Transferidos' : s === 'out_of_hours' ? 'Fora horário' : 'Sem resposta'}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead>Início</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma conversa
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => openConversation(c)}
                >
                  <TableCell className="max-w-xs truncate font-medium">{c.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.user_name}</TableCell>
                  <TableCell>{statusBadge(c)}</TableCell>
                  <TableCell>
                    {c.rating ? <StarRating value={c.rating} readOnly size="sm" /> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(c.created_at)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleExport(c)} title="Exportar TXT">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {selected?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    m.role === 'user'
                      ? 'bg-secondary/15 text-secondary'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2.5',
                    m.role === 'user'
                      ? 'rounded-tr-sm bg-secondary text-secondary-foreground'
                      : 'rounded-tl-sm bg-muted'
                  )}
                >
                  {m.role === 'assistant' ? (
                    <MarkdownRenderer content={m.content} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  )}
                  {m.confidence_level && (
                    <div className="mt-2 flex items-center gap-2 border-t border-border/50 pt-1.5">
                      <ConfidenceBadge level={m.confidence_level} score={m.confidence} />
                      <span className="text-[10px] text-muted-foreground">{formatTime(m.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
