import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Download, Filter } from 'lucide-react'
import { api } from '@/lib/api'
import type { RatingEntry } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StarRating } from '@/components/common/StarRating'
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { downloadCsv, formatDateTime } from '@/lib/utils'

export function Ratings() {
  const [ratings, setRatings] = useState<RatingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState<'all' | 'direct' | 'widget'>('all')
  const navigate = useNavigate()

  useEffect(() => {
    api.get<RatingEntry[]>('/admin/ratings').then(setRatings).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => ratings.filter((r) => sourceFilter === 'all' || r.source === sourceFilter),
    [ratings, sourceFilter]
  )

  const avg = filtered.length
    ? filtered.reduce((s, r) => s + r.rating, 0) / filtered.length
    : 0

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: filtered.filter((r) => r.rating === star).length,
  }))

  const handleExport = () => {
    downloadCsv('avaliacoes.csv', [
      ['Conversa', 'Usuário', 'Canal', 'Nota', 'Título', 'Data'],
      ...filtered.map((r) => [
        r.conversation_id,
        r.user_name,
        r.source,
        r.rating,
        r.title ?? '',
        formatDateTime(r.created_at),
      ]),
    ])
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avaliações"
        description="Notas 1–5 de conversas internas e do widget"
        icon={<Star className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Média geral
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">{avg.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
          <StarRating value={Math.round(avg)} readOnly size="sm" className="mt-1" />
        </Card>
        <Card className="p-4 sm:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Distribuição
          </div>
          <div className="mt-3 space-y-1.5">
            {distribution.map(({ star, count }) => {
              const pct = filtered.length ? (count / filtered.length) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-muted-foreground">{star} estrela{star > 1 ? 's' : ''}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-warning transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(['all', 'direct', 'widget'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                sourceFilter === s ? 'bg-card shadow-soft' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'direct' ? 'Interno' : 'Widget'}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conversa</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Data</TableHead>
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
                  Nenhuma avaliação
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin/widget-conversations?id=${r.conversation_id}`)}
                >
                  <TableCell className="max-w-xs truncate">{r.title ?? r.conversation_id}</TableCell>
                  <TableCell className="text-xs">{r.user_name}</TableCell>
                  <TableCell>
                    <Badge variant={r.source === 'widget' ? 'info' : 'secondary'}>
                      {r.source === 'widget' ? 'Widget' : 'Interno'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StarRating value={r.rating} readOnly size="sm" />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(r.created_at)}
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
