import { AlertCircle, Lock, ArrowLeft, Home } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface ForbiddenProps {
  message?: string
  resource?: string
}

export function Forbidden({ message, resource }: ForbiddenProps) {
  const navigate = useNavigate()

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/kb')
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Lock className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Acesso negado</CardTitle>
          <CardDescription className="text-muted-foreground">
            {message || `Você não tem permissão para acessar ${resource || 'esta página'}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-center text-muted-foreground">
            <AlertCircle className="mx-auto mb-2 h-5 w-5 text-destructive" />
            <p>Se você acredita que isso é um erro, entre em contato com o administrador do sistema.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGoBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button asChild className="flex-1">
              <Link to="/kb">
                <Home className="mr-2 h-4 w-4" />
                Início
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}