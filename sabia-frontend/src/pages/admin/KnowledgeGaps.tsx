import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleHelp, CheckCircle2, Plus, Filter } from 'lucide-react'
import { api } from '@/lib/api'
import type { KnowledgeGap, ConversationSource } from '@/types'
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime } from '@/lib/utils'
import { toast } from '@/stores/toast'
import { useApiError } from '@/hooks/useApiError'

export function KnowledgeGaps() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const navigate = useNavigate()
  const { handleError } = useApiError()

  const load = () => {
    setLoading(true)
    api.get<KnowledgeGap[]>('/admin/knowledge-gaps')
      .then(setGaps)
      .catch((err) => handleError(err, 'Erro ao carregar lacunas'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = gaps.filter((g) => {
    if (filter === 'all') return true
    if (filter === 'open') return !g.resolved
    return g.resolved
  })

  const handleResolve = async (id: number) => {
    try {
      await api.put(`/admin/knowledge-gaps/${id}/resolve`)
      toast.success('Lacuna marcada como resolvida')
      load()
    } catch (err) {
      handleError(err, 'Erro ao resolver lacuna')
    }
  }

  const handleCreateArticle = (gap: KnowledgeGap) => {
    // Navega para editor de artigo com título pré-preenchido
    navigate(`/admin/articles/new?title=${encodeURIComponent(gap.question)}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lacunas de Conhecimento"
        description="Perguntas sem resposta — oportunidades de melhoria da base"
        icon={<CircleHelp className="h-5 w-5" />}
      />

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(['all', 'open', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === s ? 'bg-card shadow-soft' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'Todas' : s === 'open' ? 'Em aberto' : 'Resolvidas'}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pergunta</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma lacuna encontrada
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.question}</TableCell>
                  <TableCell>
                    <Badge variant={g.source === 'widget' ? 'info' : 'secondary'}>
                      {g.source === 'widget' ? 'Widget' : g.source === 'direct' ? 'Interno' : 'KB'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {g.resolved ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" /> Resolvida
                      </Badge>
                    ) : (
                      <Badge variant="warning">Em aberto</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRelativeTime(g.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateArticle(g)}
                      >
                        <Plus className="h-4 w-4" />
                        Criar artigo
                      </Button>
                      {!g.resolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolve(g.id)}
                        >
                          Resolver
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
