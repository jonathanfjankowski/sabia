import { cn } from '@/lib/utils'

interface ConfidenceBadgeProps {
  level?: 'high' | 'low' | 'none'
  score?: number
  className?: string
}

export function ConfidenceBadge({ level, score, className }: ConfidenceBadgeProps) {
  if (!level) return null
  const config = {
    high: {
      label: 'Alta confiança',
      color: 'bg-success/10 text-success border-success/20',
    },
    low: {
      label: 'Baixa confiança',
      color: 'bg-warning/10 text-warning border-warning/20',
    },
    none: {
      label: 'Sem correspondência',
      color: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  }
  const c = config[level]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        c.color,
        className
      )}
      title={score !== undefined ? `Score: ${score.toFixed(3)}` : undefined}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {c.label}
    </span>
  )
}
