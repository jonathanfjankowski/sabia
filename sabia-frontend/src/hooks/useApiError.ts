import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/stores/toast'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '@/lib/api'

/**
 * Hook para tratar erros da API de forma amigável
 * - 401: Desloga o usuário e redireciona para login
 * - 403: Mostra toast amigável
 * - 500: Mostra toast de erro genérico
 */
export function useApiError() {
  const clearAuth = useAuthStore((s) => s.clear)
  const navigate = useNavigate()

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      if (error instanceof ApiError) {
        switch (error.status) {
          case 401: {
            // Token inválido/expirado - desloga e redireciona
            clearAuth()
            toast.error('Sessão expirada', 'Faça login novamente para continuar')
            navigate('/login', { replace: true })
            break
          }
          case 403: {
            // Sem permissão - mostra mensagem amigável
            const message =
              customMessage ||
              (typeof error.body === 'object' && error.body !== null && 'message' in error.body
                ? String((error.body as { message: string }).message)
                : 'Você não tem permissão para realizar esta ação')
            toast.error('Acesso negado', message)
            break
          }
          case 404: {
            toast.warning('Não encontrado', customMessage || 'O recurso solicitado não existe')
            break
          }
          case 422: {
            // Erro de validação
            const body = error.body as Record<string, string[]> | undefined
            if (body && typeof body === 'object') {
              const messages = Object.values(body).flat()
              toast.error('Erro de validação', messages.join(', ') || 'Verifique os dados informados')
            } else {
              toast.error('Erro de validação', customMessage || 'Verifique os dados informados')
            }
            break
          }
          case 429: {
            toast.warning('Muitas requisições', 'Aguarde um momento antes de tentar novamente')
            break
          }
          case 500: {
            console.error('Erro interno do servidor:', error)
            toast.error(
              'Erro interno',
              'Ocorreu um erro inesperado. Tente novamente ou contate o suporte.'
            )
            break
          }
          default: {
            toast.error(
              'Erro',
              customMessage || error.message || 'Ocorreu um erro inesperado'
            )
          }
        }
      } else if (error instanceof Error) {
        toast.error('Erro', customMessage || error.message)
      } else {
        toast.error('Erro', customMessage || 'Ocorreu um erro inesperado')
      }
    },
    [clearAuth, navigate]
  )

  return { handleError }
}

/**
 * Hook para fazer chamadas à API com tratamento de erro automático
 */
export function useApiCall() {
  const { handleError } = useApiError()

  const call = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options?: { onError?: (error: unknown) => void; errorMessage?: string }
    ): Promise<T | null> => {
      try {
        return await fn()
      } catch (error) {
        handleError(error, options?.errorMessage)
        options?.onError?.(error)
        return null
      }
    },
    [handleError]
  )

  return { call }
}