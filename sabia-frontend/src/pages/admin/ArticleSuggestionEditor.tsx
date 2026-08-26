import { useNavigate, Link, useSearchParams, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArticleForm } from '@/components/admin/ArticleForm'
import { api } from '@/lib/api'
import type { Category } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { toast } from '@/stores/toast'
import { ArrowLeft, MessageSquare } from 'lucide-react'

export function ArticleSuggestionEditor() {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => {})

    if (id) {
      // Apenas para validar se a sugestão existe
      api.get(`/article-suggestions/${id}`).catch(() => {})
    }
    setLoading(false)
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  const handleSaved = (suggestionId: string) => {
    navigate(`/article-suggestions/${suggestionId}`, { replace: true })
  }

  return (
    <div className="pb-10">
      <PageHeader
        title={id ? 'Editar sugestão' : 'Nova sugestão'}
        description={id ? 'Atualize sua sugestão antes da revisão' : 'Envie uma sugestão de artigo para revisão dos gestores'}
        icon={<MessageSquare className="h-5 w-5" />}
        actions={
          <Link to="/article-suggestions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Button>
          </Link>
        }
      />

      <ArticleForm
        mode={id ? 'suggestion-create' : 'suggestion-create'}
        id={id}
        categories={categories}
        onSaved={handleSaved}
        showPublishButton={false}
        actionButtonText="Enviar para revisão"
      />
    </div>
  )
}