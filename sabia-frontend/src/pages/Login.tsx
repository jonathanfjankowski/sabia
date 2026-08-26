import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useBrandStore } from '@/stores/brand'
import { applyBrand } from '@/stores/brand'
import type { Profile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/stores/toast'

export function Login() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const brand = useBrandStore((s) => s.brand)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  applyBrand(brand)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post<{ success: boolean; user: { id: string; email: string; profile?: Profile }; token: string }>('/auth/login', {
        email,
        password,
      })
      const profile = res.user.profile
      const flatUser: Profile = profile
        ? { ...profile, email: res.user.email }
        : ({ id: res.user.id, email: res.user.email, full_name: '', role: 'operador', is_active: true } as Profile)
      setSession(flatUser, res.token)
      toast.success('Login realizado')
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 to-muted/10 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">{brand.app_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso interno</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email.trim() || !password.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Entrar
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Use <code className="rounded bg-muted px-1">gestor@sabia.test</code> / <code className="rounded bg-muted px-1">demo</code> (gestor) ou <code className="rounded bg-muted px-1">operador@sabia.test</code> / <code className="rounded bg-muted px-1">demo</code> (operador)
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {brand.app_name} · Versão interna
        </p>
      </div>
    </div>
  )
}
