import { useEffect, useState } from 'react'
import { Plus, Folder, Edit, Trash2, Save, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Category } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/stores/toast'

const ICONS = ['folder', 'receipt', 'truck', 'users', 'plug', 'file', 'settings', 'book', 'help']

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    api.get<Category[]>('/admin/categories').then(setCategories).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta categoria? Artigos relacionados ficarão sem categoria.')) return
    try {
      await api.del(`/admin/categories/${id}`)
      toast.success('Categoria excluída')
      load()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Organize os artigos por tema"
        icon={<Folder className="h-5 w-5" />}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Nova categoria
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id} className="group p-4">
              <div className="flex items-start justify-between">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${c.color}20`, color: c.color }}
                >
                  <CategoryIcon name={c.icon} className="h-5 w-5" />
                </div>
                <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(c.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h3 className="mt-3 font-semibold">{c.name}</h3>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="font-mono" style={{ color: c.color }}>
                  {c.color}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">ordem {c.sort_order}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CategoryDialog
        open={creating}
        onOpenChange={setCreating}
        category={null}
        onSaved={() => {
          setCreating(false)
          load()
        }}
      />
      <CategoryDialog
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        category={editing}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />
    </div>
  )
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  category: Category | null
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#FF6B35')
  const [icon, setIcon] = useState('folder')
  const [sortOrder, setSortOrder] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (category) {
      setName(category.name)
      setDescription(category.description ?? '')
      setColor(category.color)
      setIcon(category.icon)
      setSortOrder(category.sort_order)
    } else {
      setName('')
      setDescription('')
      setColor('#FF6B35')
      setIcon('folder')
      setSortOrder(1)
    }
  }, [category, open])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.warning('Nome é obrigatório')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        description,
        color,
        icon,
        sort_order: sortOrder,
      }
      if (category) {
        await api.put(`/admin/categories/${category.id}`, payload)
        toast.success('Categoria atualizada')
      } else {
        await api.post('/admin/categories', payload)
        toast.success('Categoria criada')
      }
      onSaved()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nome</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Fiscal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Descrição</Label>
            <Textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cat-color">Cor</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-input bg-background p-1"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-order">Ordem</Label>
              <Input
                id="cat-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ícone</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICONS.map((ic) => (
                  <SelectItem key={ic} value={ic}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={ic} className="h-3.5 w-3.5" />
                      {ic}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
