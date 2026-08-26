import { useEffect, useState } from 'react'
import { Shield, Download, Search } from 'lucide-react'
import { api } from '@/lib/api'
import type { AuditLog } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
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
import { downloadCsv, formatDateTime } from '@/lib/utils'

const actionLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'destructive' | 'success' | 'info' }> = {
  'article.create': { label: 'Criar artigo', variant: 'success' },
  'article.update': { label: 'Atualizar artigo', variant: 'info' },
  'article.archive': { label: 'Arquivar artigo', variant: 'warning' },
  'article.revert': { label: 'Reverter versão', variant: 'info' },
  'user.create': { label: 'Criar usuário', variant: 'success' },
  'user.update': { label: 'Atualizar usuário', variant: 'info' },
  'user.deactivate': { label: 'Desativar usuário', variant: 'destructive' },
  'settings.ai.change': { label: 'Alterar config IA', variant: 'warning' },
  'settings.widget.change': { label: 'Alterar config widget', variant: 'warning' },
  'settings.brand.change': { label: 'Alterar white label', variant: 'warning' },
  'settings.maintenance.toggle': { label: 'Modo manutenção', variant: 'destructive' },
  'category.create': { label: 'Criar categoria', variant: 'success' },
  'category.update': { label: 'Atualizar categoria', variant: 'info' },
  'category.delete': { label: 'Excluir categoria', variant: 'destructive' },
  'knowledge_gap.resolve': { label: 'Resolver lacuna', variant: 'success' },
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  useEffect(() => {
    api.get<AuditLog[]>('/admin/audit-logs').then(setLogs).finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      l.action.toLowerCase().includes(s) ||
      (l.user_name ?? '').toLowerCase().includes(s) ||
      (l.entity_type ?? '').toLowerCase().includes(s)
    )
  })

  const handleExport = () => {
    downloadCsv('auditoria.csv', [
      ['Data', 'Usuário', 'Ação', 'Entidade', 'IP'],
      ...filtered.map((l) => [
        formatDateTime(l.created_at),
        l.user_name ?? '',
        l.action,
        l.entity_type ?? '',
        l.ip_address ?? '',
      ]),
    ])
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log de Auditoria"
        description="Todas as ações administrativas rastreadas"
        icon={<Shield className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por ação, usuário ou entidade..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ação</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => {
                const cfg = actionLabels[l.action] ?? { label: l.action, variant: 'secondary' as const }
                return (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(l)}
                  >
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{l.user_name ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.entity_type} {l.entity_id && `#${l.entity_id}`}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.ip_address ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(l.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })
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
              <div>
                <span className="text-muted-foreground">Ação:</span>{' '}
                <Badge>{actionLabels[selected.action]?.label ?? selected.action}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Usuário:</span> {selected.user_name}
              </div>
              <div>
                <span className="text-muted-foreground">IP:</span>{' '}
                <code className="rounded bg-muted px-1 text-xs">{selected.ip_address}</code>
              </div>
              <div>
                <span className="text-muted-foreground">User-Agent:</span>
                <p className="mt-1 text-xs text-muted-foreground break-all">{selected.user_agent}</p>
              </div>
              {(Boolean(selected.old_value) || Boolean(selected.new_value)) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">Antes</div>
                    <pre className="rounded-lg bg-destructive/5 border border-destructive/20 p-2 text-[11px] overflow-x-auto">
                      {JSON.stringify(selected.old_value ?? {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">Depois</div>
                    <pre className="rounded-lg bg-success/5 border border-success/20 p-2 text-[11px] overflow-x-auto">
                      {JSON.stringify(selected.new_value ?? {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
