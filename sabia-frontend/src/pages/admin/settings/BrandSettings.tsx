import { useEffect, useState } from 'react'
import { Settings2, Save, RotateCcw, Palette, Type, Upload, Check } from 'lucide-react'
import { api } from '@/lib/api'
import type { BrandSettings as BrandType } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBrandStore, applyBrand } from '@/stores/brand'
import { toast } from '@/stores/toast'
import { cn } from '@/lib/utils'

const PRESETS = [
  { name: 'Laranja Vibrante', primary: '#FF6B35', secondary: '#EA580C' },
  { name: 'Laranja Suave', primary: '#F97316', secondary: '#C2410C' },
  { name: 'Laranja Queimado', primary: '#EA580C', secondary: '#9A3412' },
  { name: 'Coral', primary: '#FB7185', secondary: '#E11D48' },
  { name: 'Roxo', primary: '#8B5CF6', secondary: '#6D28D9' },
  { name: 'Azul', primary: '#3B82F6', secondary: '#1D4ED8' },
  { name: 'Esmeralda', primary: '#10B981', secondary: '#047857' },
  { name: 'Vermelho', primary: '#EF4444', secondary: '#B91C1C' },
]

const FONTS = ['Inter', 'Roboto', 'Open Sans'] as const

export function BrandSettings() {
  const [brand, setBrand] = useState<BrandType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { setBrand: setLocalBrand, brand: localBrand } = useBrandStore()

  useEffect(() => {
    api.get<BrandType>('/admin/settings/brand').then(setBrand).finally(() => setLoading(false))
  }, [])

  // Pré-visualização ao vivo: aplica nas variáveis CSS conforme o usuário edita
  useEffect(() => {
    if (brand) applyBrand(brand)
  }, [brand])

  if (loading || !brand) {
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
      const saved = await api.put<BrandType>('/admin/settings/brand', brand)
      setLocalBrand(saved)
      applyBrand(saved)
      toast.success('White label salvo')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const reset: BrandType = {
      app_name: 'Sabiá',
      logo_url: '',
      favicon_url: '',
      primary_color: '#FF6B35',
      secondary_color: '#EA580C',
      font: 'Inter',
    }
    setBrand(reset)
    applyBrand(reset)
    toast.info('Pré-visualização resetada — clique em Salvar para confirmar')
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setBrand({ ...brand, logo_url: reader.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="White Label"
        description="Personalize a identidade visual — aplicado em tempo real"
        icon={<Settings2 className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Resetar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Identidade */}
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Identidade</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-name">Nome do sistema</Label>
              <Input
                id="brand-name"
                value={brand.app_name}
                onChange={(e) => setBrand({ ...brand, app_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select
                value={brand.font}
                onValueChange={(v: BrandType['font']) => setBrand({ ...brand, font: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Logo</Label>
                <label className="flex aspect-video cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 hover:bg-accent/30">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain p-3"
                    />
                  ) : (
                    <div className="text-center text-xs text-muted-foreground">
                      <Upload className="mx-auto mb-1 h-5 w-5" />
                      PNG ou SVG
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>
              <div className="space-y-2">
                <Label>Favicon</Label>
                <label className="flex aspect-video cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 hover:bg-accent/30">
                  {brand.favicon_url ? (
                    <img
                      src={brand.favicon_url}
                      alt="Favicon"
                      className="max-h-full max-w-full object-contain p-3"
                    />
                  ) : (
                    <div className="text-center text-xs text-muted-foreground">
                      <Upload className="mx-auto mb-1 h-5 w-5" />
                      ICO ou PNG
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/x-icon"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      const r = new FileReader()
                      r.onload = () => setBrand({ ...brand, favicon_url: r.result as string })
                      r.readAsDataURL(f)
                    }}
                  />
                </label>
              </div>
            </div>
          </Card>

          {/* Cores */}
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Cores</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor primária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brand.primary_color}
                    onChange={(e) => setBrand({ ...brand, primary_color: e.target.value })}
                    className="h-10 w-12 rounded-lg border border-input bg-background p-1"
                  />
                  <Input
                    value={brand.primary_color}
                    onChange={(e) => setBrand({ ...brand, primary_color: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor secundária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brand.secondary_color}
                    onChange={(e) => setBrand({ ...brand, secondary_color: e.target.value })}
                    className="h-10 w-12 rounded-lg border border-input bg-background p-1"
                  />
                  <Input
                    value={brand.secondary_color}
                    onChange={(e) => setBrand({ ...brand, secondary_color: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Predefinições rápidas</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() =>
                      setBrand({ ...brand, primary_color: p.primary, secondary_color: p.secondary })
                    }
                    className={cn(
                      'group rounded-lg border border-border p-2 text-left transition-colors hover:border-primary/40',
                      brand.primary_color.toUpperCase() === p.primary.toUpperCase() &&
                        'border-primary ring-2 ring-ring'
                    )}
                  >
                    <div className="flex gap-1">
                      <span
                        className="h-6 w-6 rounded"
                        style={{ backgroundColor: p.primary }}
                      />
                      <span
                        className="h-6 w-6 rounded"
                        style={{ backgroundColor: p.secondary }}
                      />
                    </div>
                    <div className="mt-1.5 text-[11px] font-medium leading-tight">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
              Preview ao vivo
            </div>
            <div className="space-y-4 p-4">
              {/* Mock sidebar */}
              <div className="flex h-44 overflow-hidden rounded-lg border border-border">
                <div className="flex w-24 flex-col items-center gap-1 border-r border-border bg-sidebar p-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                      <path
                        d="M12 4c-1.5 0-2.7 1.2-2.7 2.7 0 .6.2 1.2.5 1.7-1.2.5-2 1.7-2 3.1 0 1.9 1.6 3.2 3.6 3.2.7 0 1.3-.1 1.8-.4.3.6.9 1.1 1.6 1.1.9 0 1.7-.8 1.7-1.7 0-.4-.1-.8-.4-1.1.7-.5 1.1-1.3 1.1-2.3 0-1.7-1.4-3-3.1-3-.3 0-.5 0-.8.1.3-.4.5-.8.5-1.3 0-1.5-1.2-2.7-2.7-2.7z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div className="mt-1 h-1.5 w-10 rounded bg-primary/30" />
                  <div className="h-1.5 w-10 rounded bg-muted" />
                  <div className="h-1.5 w-10 rounded bg-muted" />
                </div>
                <div className="flex-1 bg-background p-3">
                  <div className="mb-2 h-3 w-20 rounded bg-foreground/10" />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-primary/15 px-2 py-1 text-[9px] font-medium text-primary">
                        Ativo
                      </div>
                      <div className="h-1.5 flex-1 rounded bg-muted" />
                    </div>
                    <div className="h-1.5 w-3/4 rounded bg-muted" />
                    <div className="h-1.5 w-2/3 rounded bg-muted" />
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    <div className="rounded-md bg-primary px-2 py-1 text-[9px] font-medium text-primary-foreground">
                      Botão
                    </div>
                    <div className="rounded-md border border-border px-2 py-1 text-[9px]">
                      Outline
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock chat bubble */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                    </svg>
                  </div>
                  <div className="rounded-lg rounded-tl-sm bg-primary px-2.5 py-1.5 text-[10px] text-primary-foreground">
                    Olá! Sou o {brand.app_name}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Aplicado a:
                </div>
                <div className="mt-1 text-xs text-foreground">
                  Sidebar · Botões · Badges · Links · Foco
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
