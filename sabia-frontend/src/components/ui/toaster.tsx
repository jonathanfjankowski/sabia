import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { useToastStore } from '@/stores/toast'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const variantIcon = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
}

const variantIconColor = {
  default: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant = 'default', duration }) => {
        const Icon = variantIcon[variant]
        return (
          <Toast
            key={id}
            variant={variant}
            duration={duration}
            onOpenChange={(open) => {
              if (!open) dismiss(id)
            }}
          >
            <div className="flex items-start gap-3">
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', variantIconColor[variant])} />
              <div className="grid gap-0.5">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
