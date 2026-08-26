import { useEffect, useState } from 'react'
import {
  Activity,
  Bot,
  Webhook,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { HealthStatus } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime } from '@/lib/utils'

export function Health() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<HealthStatus>('/admin/health').then(setHealth).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Saúde do Sistema" icon={<Activity className="h-5 w-5" />} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (!health) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saúde do Sistema"
        description="Monitor de dependências e indicadores em tempo real"
        icon={<Activity className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* AI Provider */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <Badge variant={health.ai_connected ? 'success' : 'destructive'}>
              {health.ai_connected ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Online
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" /> Offline
                </>
              )}
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold">Provedor de IA</div>
            <div className="text-xs text-muted-foreground capitalize">{health.ai_provider}</div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Cpu className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Req. 24h:</span>
            <span className="font-semibold tabular-nums">{health.ai_requests_24h}</span>
          </div>
        </Card>

        {/* Teams Webhook */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Webhook className="h-5 w-5" />
            </div>
            <Badge variant={health.teams_webhook_configured ? 'success' : 'secondary'}>
              {health.teams_webhook_configured ? 'Configurado' : 'Não configurado'}
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold">Webhook Teams</div>
            {health.teams_last_send && (
              <div className="text-xs text-muted-foreground">
                Último envio: {formatRelativeTime(health.teams_last_send)}
              </div>
            )}
          </div>
          {health.teams_last_status && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              {health.teams_last_status === 'success' ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  <span className="text-success">Sucesso</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 text-destructive" />
                  <span className="text-destructive">Falhou</span>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Maintenance */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Wrench className="h-5 w-5" />
            </div>
            <Badge variant={health.maintenance_mode ? 'warning' : 'success'}>
              {health.maintenance_mode ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold">Modo Manutenção</div>
            <div className="text-xs text-muted-foreground">
              {health.maintenance_mode
                ? 'Sistema em manutenção'
                : 'Sistema operando normalmente'}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent critical errors */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold">Erros recentes</h3>
        </div>
        {health.recent_critical_errors.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/5 px-3 py-4 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Nenhum erro crítico nas últimas 24h
          </div>
        ) : (
          <div className="space-y-2">
            {health.recent_critical_errors.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <Badge
                  variant={log.level === 'critical' ? 'destructive' : 'warning'}
                  className="mt-0.5"
                >
                  {log.level}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{log.context}</span>
                    <span className="text-xs text-muted-foreground">
                      · {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
