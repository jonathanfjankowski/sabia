import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, FileText, Eye, ThumbsUp, MoreVertical, Archive, Edit, FileEdit, RotateCcw, Send, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Article, Category } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime, cn } from '@/lib/utils'
import { toast } from '@/stores/toast'
import { useNavigate } from 'react-router-dom'

export function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all')
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get<Article[]>('/admin/articles'),
      api.get<Category[]>('/categories'),
    ])
      .then(([a, c]) => {
        setArticles(a)
        setCategories(c)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = articles.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (search.trim()) {
      const s = search.toLowerCase()
      return a.title.toLowerCase().includes(s) || (a.summary ?? '').toLowerCase().includes(s)
    }
    return true
  })

  const handleArchive = async (id: number) => {
    try {
      await api.del(`/admin/articles/${id}`)
      toast.success('Artigo arquivado')
      load()
    } catch {
      toast.error('Erro ao arquivar')
    }
  }

  const handleUpdateStatus = async (id: number, status: 'active') => {
    try {
      await api.put(`/admin/articles/${id}`, { status })
      toast.success(status === 'active' ? 'Artigo ativado' : 'Artigo desarquivado')
      load()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este artigo?')) return
    try {
      await api.del(`/admin/articles/${id}`)
      toast.success('Artigo excluído (pode ser restaurado)')
      load()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/admin/articles/${id}/restore`)
      toast.success('Artigo restaurado')
      load()
    } catch {
      toast.error('Erro ao restaurar')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Artigos"
        description="Gerencie o conteúdo da base de conhecimento"
        icon={<FileText className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/articles/import">
                <FileEdit className="h-4 w-4" />
                Importar MD
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/articles/new">
                <Plus className="h-4 w-4" />
                Novo artigo
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar artigo..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(['all', 'active', 'draft', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-card shadow-soft'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : s === 'draft' ? 'Rascunhos' : 'Arquivados'}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Útil</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum artigo encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => {
                const cat = categories.find((c) => c.id === a.category_id)
                return (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/admin/articles/${a.id}/edit`)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="line-clamp-1">{a.title}</span>
                        <Badge variant="outline" className="text-[10px]">v{a.version}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cat && (
                        <span className="text-xs" style={{ color: cat.color }}>
                          {cat.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.status === 'active'
                            ? 'success'
                            : a.status === 'draft'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {a.status === 'active' ? 'Ativo' : a.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.access_level === 'internal' ? 'default' : 'secondary'}>
                        {a.access_level === 'internal' ? 'Interno' : 'Público'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a.views_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.helpful_yes}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeTime(a.updated_at)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/articles/${a.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/kb/${a.slug}`}>
                              <Eye className="mr-2 h-4 w-4" /> Visualizar
                            </Link>
                          </DropdownMenuItem>
                          {a.deleted_at ? (
                            <>
                              <DropdownMenuItem onClick={() => handleRestore(a.id)} className="text-green-600 focus:text-green-600">
                                <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                              </DropdownMenuItem>
                            </>
                          ) : a.status === 'archived' ? (
                            <>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(a.id, 'active')}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Desarquivar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(a.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </>
                          ) : a.status === 'draft' ? (
                            <>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(a.id, 'active')}>
                                <Send className="mr-2 h-4 w-4" /> Ativar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(a.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleArchive(a.id)} className="text-destructive focus:text-destructive">
                                <Archive className="mr-2 h-4 w-4" /> Arquivar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(a.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
