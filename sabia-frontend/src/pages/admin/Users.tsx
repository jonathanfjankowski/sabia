import { useEffect, useState } from 'react'
import { Plus, Users as UsersIcon, MoreVertical, Shield, UserCog, Trash2, Mail } from 'lucide-react'
import { api } from '@/lib/api'
import type { Profile, Role } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/stores/toast'
import { initials, formatDateTime } from '@/lib/utils'
import { useApiError } from '@/hooks/useApiError'
import { useNavigate } from 'react-router-dom'

export function Users() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [creating, setCreating] = useState(false)
  const { handleError } = useApiError()
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    api.get<Profile[]>('/admin/users')
      .then(setUsers)
      .catch((err) => handleError(err, 'Erro ao carregar usuários'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const toggleActive = async (u: Profile) => {
    try {
      await api.put(`/admin/users/${u.id}`, { is_active: !u.is_active })
      toast.success(u.is_active ? 'Usuário desativado' : 'Usuário ativado')
      load()
    } catch (err) {
      handleError(err, 'Erro ao alterar status do usuário')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gestão de perfis e permissões"
        icon={<UsersIcon className="h-5 w-5" />}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Novo usuário
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-10" />
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
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'gestor' ? 'default' : 'secondary'}>
                      {u.role === 'gestor' ? (
                        <>
                          <Shield className="h-3 w-3" /> Gestor
                        </>
                      ) : (
                        <>
                          <UserCog className="h-3 w-3" /> Operador
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? 'success' : 'secondary'}>
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(u.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(u)}>
                          <UserCog className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleActive(u)}
                          className={u.is_active ? 'text-destructive focus:text-destructive' : ''}
                        >
                          {u.is_active ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <UserDialog
        open={creating}
        onOpenChange={setCreating}
        user={null}
        onSaved={() => {
          setCreating(false)
          load()
        }}
      />
      <UserDialog
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        user={editing}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />
    </div>
  )
}

function UserDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  user: Profile | null
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('operador')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const { handleError } = useApiError()

  useEffect(() => {
    if (user) {
      setFullName(user.full_name)
      setEmail(user.email)
      setRole(user.role)
      setIsActive(user.is_active)
    } else {
      setFullName('')
      setEmail('')
      setRole('operador')
      setIsActive(true)
    }
  }, [user, open])

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.warning('Nome e e-mail são obrigatórios')
      return
    }
    setSaving(true)
    try {
      const payload = { full_name: fullName, email, role, is_active: isActive }
      if (user) {
        await api.put(`/admin/users/${user.id}`, payload)
        toast.success('Usuário atualizado')
      } else {
        await api.post('/admin/users', payload)
        toast.success('Usuário criado')
      }
      onSaved()
    } catch (err) {
      handleError(err, user ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Nome completo</Label>
            <Input
              id="user-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex.: Ana Silva"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="user-email"
                type="email"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana.silva@bsoft.com.br"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v: Role) => setRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operador">Operador (acesso a KB + Chat)</SelectItem>
                <SelectItem value="gestor">Gestor (acesso total + admin)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="user-active" className="cursor-pointer">
                Usuário ativo
              </Label>
              <p className="text-xs text-muted-foreground">Inativos não conseguem fazer login</p>
            </div>
            <Switch id="user-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
