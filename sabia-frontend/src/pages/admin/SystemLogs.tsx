import { useEffect, useState } from 'react'
import { Activity, Search, Filter } from 'lucide-react'
import { api } from '@/lib/api'
import type { SystemLog, LogLevel } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { formatDateTime, cn } from '@/lib/utils'

const levelConfig: Record<LogLevel, { label: string; variant: 'default' | 'info' | 'warning' | 'destructive' }> = {
  info: { label: 'Info', variant: 'info' },
  warning: { label: 'Aviso', variant: 'warning' },
  error: { label: 'Erro', variant: 'destructive' },
  critical: { label: 'Crítico', variant: 'destructive' },
}

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | LogLevel>('all')
  const [selected, setSelected] = useState<SystemLog | null>(null)

  useEffect(() => {
    api.get<SystemLog[]>('/admin/system-logs').then(setLogs).finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter((l) => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false
    if (search.trim()) {
      const s = search.toLowerCase()
      return (
        l.message.toLowerCase().includes(s) ||
        l.context.toLowerCase().includes(s)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs do Sistema"
        description="Erros, avisos e eventos — útil para diagnóstico"
        icon={<Activity className="h-5 w-5" />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar mensagem ou contexto..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(['all', 'info', 'warning', 'error', 'critical'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setLevelFilter(s)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  levelFilter === s ? 'bg-card shadow-soft' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s === 'all' ? 'Todos' : levelConfig[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nível</TableHead>
              <TableHead>Contexto</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum log encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(l)}
                >
                  <TableCell>
                    <Badge variant={levelConfig[l.level].variant}>
                      {levelConfig[l.level].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.context}</TableCell>
                  <TableCell className="max-w-md truncate">{l.message}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(l.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhe do log</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={levelConfig[selected.level].variant}>
                  {levelConfig[selected.level].label}
                </Badge>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{selected.context}</code>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Mensagem</div>
                <p>{selected.message}</p>
              </div>
              {Boolean(selected.payload) && (
                <div>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">Payload</div>
                  <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {formatDateTime(selected.created_at)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
