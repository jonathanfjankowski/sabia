import { useEffect, useState } from 'react'
import { Type, Save, Plus, X, MessageSquare, Clock, Phone, Webhook, Wrench } from 'lucide-react'
import { api } from '@/lib/api'
import type { WidgetSettings as WidgetSettingsType } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TipTapEditor } from '@/components/editor/TipTapEditor'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import { toast } from '@/stores/toast'

export function WidgetSettingsPage() {
  const [settings, setSettings] = useState<WidgetSettingsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [domainInput, setDomainInput] = useState('')

  useEffect(() => {
    api.get<WidgetSettingsType>('/admin/settings/widget').then(setSettings).finally(() => setLoading(false))
  }, [])

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/admin/settings/widget', settings)
      toast.success('Configurações do widget salvas')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const addDomain = () => {
    const d = domainInput.trim().toLowerCase()
    if (!d) return
    if (settings.allowed_domains.includes(d)) {
      toast.warning('Domínio já cadastrado')
      return
    }
    setSettings({ ...settings, allowed_domains: [...settings.allowed_domains, d] })
    setDomainInput('')
  }

  const removeDomain = (d: string) => {
    setSettings({
      ...settings,
      allowed_domains: settings.allowed_domains.filter((x) => x !== d),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações do Widget"
        description="Mensagem de boas-vindas, horário de suporte, notificações Teams e embed"
        icon={<Type className="h-5 w-5" />}
        actions={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        }
      />

      <Tabs defaultValue="welcome">
        <TabsList>
          <TabsTrigger value="welcome">Boas-vindas</TabsTrigger>
          <TabsTrigger value="support">Suporte humano</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="embed">Embed & Manutenção</TabsTrigger>
        </TabsList>

        <TabsContent value="welcome" className="space-y-4">
          <Card className="space-y-3 p-5">
            <Label>Mensagem de boas-vindas (TipTap)</Label>
            <TipTapEditor
              value={settings.welcome_message}
              onChange={(md) => setSettings({ ...settings, welcome_message: md })}
              minHeight={140}
            />
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Preview</div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <MarkdownRenderer content={settings.welcome_message} />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="sup-link" className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Link do suporte humano
              </Label>
              <Input
                id="sup-link"
                value={settings.support_link}
                onChange={(e) => setSettings({ ...settings, support_link: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                Placeholders <code className="rounded bg-muted px-1">{`{NOME}`}</code> e{' '}
                <code className="rounded bg-muted px-1">{`{EMAIL}`}</code> são substituídos automaticamente.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sup-start" className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Horário início
                </Label>
                <Input
                  id="sup-start"
                  type="time"
                  value={settings.support_start_time}
                  onChange={(e) => setSettings({ ...settings, support_start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-end" className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Horário fim
                </Label>
                <Input
                  id="sup-end"
                  type="time"
                  value={settings.support_end_time}
                  onChange={(e) => setSettings({ ...settings, support_end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sup-phone" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                Telefone fora do horário
              </Label>
              <Input
                id="sup-phone"
                value={settings.support_phone}
                onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                placeholder="+55 (41) 4000-1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sup-out">Mensagem fora do horário</Label>
              <Textarea
                id="sup-out"
                rows={3}
                value={settings.out_of_hours_message}
                onChange={(e) => setSettings({ ...settings, out_of_hours_message: e.target.value })}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card className="space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="teams-url" className="flex items-center gap-2">
                <Webhook className="h-3.5 w-3.5" />
                Webhook do Teams
              </Label>
              <Input
                id="teams-url"
                value={settings.teams_webhook_url}
                onChange={(e) => setSettings({ ...settings, teams_webhook_url: e.target.value })}
                placeholder="https://outlook.office.com/webhook/..."
              />
            </div>

            <div className="space-y-3">
              <Toggle
                checked={settings.teams_notify_transfer}
                onChange={(v) => setSettings({ ...settings, teams_notify_transfer: v })}
                label="Notificar transferência para humano"
                description="Envia mensagem no Teams quando uma conversa é transferida"
              />
              <Toggle
                checked={settings.teams_notify_gap}
                onChange={(v) => setSettings({ ...settings, teams_notify_gap: v })}
                label="Notificar lacuna de conhecimento"
                description="Envia mensagem quando uma pergunta não tem resposta na base"
              />
              <Toggle
                checked={settings.teams_notify_out_of_hours}
                onChange={(v) => setSettings({ ...settings, teams_notify_out_of_hours: v })}
                label="Notificar fora do horário"
                description="Envia mensagem quando uma solicitação ocorre fora do horário"
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-4">
          <Card className="space-y-3 p-5">
            <div className="space-y-2">
              <Label>Domínios autorizados para embed</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="app.bsoft.com.br"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addDomain()
                    }
                  }}
                />
                <Button variant="outline" onClick={addDomain}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.allowed_domains.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs"
                  >
                    <code>{d}</code>
                    <button
                      onClick={() => removeDomain(d)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {settings.allowed_domains.length === 0 && (
                  <span className="text-xs text-muted-foreground">Nenhum domínio cadastrado</span>
                )}
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold">Modo manutenção</h3>
            </div>
            <Toggle
              checked={settings.maintenance_mode}
              onChange={(v) => setSettings({ ...settings, maintenance_mode: v })}
              label="Ativar modo manutenção"
              description="Widget exibe mensagem de manutenção em vez do chat"
            />
            <div className="space-y-2">
              <Label htmlFor="maint-msg">Mensagem de manutenção</Label>
              <Textarea
                id="maint-msg"
                rows={2}
                value={settings.maintenance_message}
                onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
