import { ArticleForm } from '@/components/admin/ArticleForm'
import { useParams } from 'react-router-dom'

export function ArticleEditor() {
  const { id } = useParams<{ id?: string }>()
  const isCreating = !id
  // Mostra botão "Publicar" tanto na criação quanto na edição
  return <ArticleForm mode={isCreating ? "create" : "edit"} showPublishButton={true} />
}