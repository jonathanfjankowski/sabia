import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, User, Lock, AlertCircle } from 'lucide-react'
import type { ApiResponse, LoginResult } from '@/types'

const loginSchema = z.object({
  email: z.string().min(1, 'Usuário é obrigatório'),
  senha: z.string().min(1, 'Senha é obrigatória'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [tokenInvalidated, setTokenInvalidated] = useState(false)

  // Verifica se o token foi invalidado (usuário editado no manager)
  useEffect(() => {
    if (searchParams.get('reason') === 'token_invalidated') {
      setTokenInvalidated(true)
    }
  }, [searchParams])

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      senha: '',
    },
  })

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await api.post<ApiResponse<LoginResult>>('/api/auth/login', data)
      return response.data
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        const { requiresEmpresaSelection, availableEmpresas, accessToken, usuario } = response.data

        // Mapeia empresas para o formato correto do store
        const empresas = availableEmpresas?.map(e => ({
          id: e.id,
          razaoSocial: e.razaoSocial || e.nome,
          nomeFantasia: e.nomeFantasia,
          cnpj: e.cnpj,
          nome: e.nomeFantasia || e.razaoSocial || e.nome || 'Empresa'
        })) || []

        if (requiresEmpresaSelection && usuario && empresas.length > 0) {
          setAuth(accessToken!, usuario, empresas)
          navigate('/selecionar-empresa')
        } else if (accessToken && usuario && empresas.length === 1) {
          setAuth(accessToken, usuario, empresas)
          navigate('/dashboard')
        }
      } else {
        setError(response.message || 'Erro ao fazer login')
      }
    },
    onError: () => {
      setError('Erro ao conectar com o servidor')
    },
  })

  const onSubmit = (data: LoginFormData) => {
    setError(null)
    loginMutation.mutate(data)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        background: 'linear-gradient(135deg, #F0F7FF 0%, #E8F0FE 50%, #F0F7FF 100%)'
      }}
    >
      {/* Login Card */}
      <div
        className="w-full max-w-[500px] bg-white rounded-[20px] shadow-xl border border-gray-200 p-8 md:p-10"
        style={{
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)'
        }}
      >
        <div className="flex flex-col items-center space-y-6">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="ZyonERP"
            className="w-40 h-40 object-contain"
          />

          <p className="text-slate-500 text-sm">Faça login para acessar o sistema</p>

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-5">
            {/* Email/Username Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 tracking-wider ml-1">
                USUÁRIO
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <Input
                  type="text"
                  placeholder="Digite seu usuário"
                  className="h-12 pl-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  {...form.register('email')}
                  disabled={loginMutation.isPending}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 ml-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 tracking-wider ml-1">
                SENHA
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  className="h-12 pl-12 pr-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  {...form.register('senha')}
                  disabled={loginMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {form.formState.errors.senha && (
                <p className="text-sm text-red-500 ml-1">
                  {form.formState.errors.senha.message}
                </p>
              )}
            </div>

            {/* Token Invalidated Warning */}
            {tokenInvalidated && (
              <div className="p-4 text-sm text-amber-700 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Sessão encerrada</p>
                  <p className="text-amber-600">Seus dados foram atualizados. Por favor, faça login novamente.</p>
                </div>
              </div>
            )}

          {/* Error Message */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-13 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-500/30 disabled:opacity-70"
              disabled={loginMutation.isPending}
              style={{ height: '52px' }}
            >
              {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>

      {/* Version */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-400">
        Versão: 1.0.0
      </div>
    </div>
  )
}