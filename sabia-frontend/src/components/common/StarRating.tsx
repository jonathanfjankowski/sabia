import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value?: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  className?: string
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
}

export function StarRating({
  value = 0,
  onChange,
  size = 'md',
  readOnly = false,
  className,
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(null)}
          onClick={() => !readOnly && onChange?.(star)}
          className={cn(
            'transition-colors',
            !readOnly && 'hover:scale-110 cursor-pointer',
            readOnly && 'cursor-default'
          )}
          aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              sizeMap[size],
              star <= display
                ? 'fill-warning text-warning'
                : 'fill-transparent text-muted-foreground/40'
            )}
          />
        </button>
      ))}
    </div>
  )
}
