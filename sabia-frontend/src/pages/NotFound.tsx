import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        A página que você procura não existe ou foi movida.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Voltar para o início</Link>
      </Button>
    </div>
  )
}
