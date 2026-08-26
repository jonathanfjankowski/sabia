import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useThemeStore, applyTheme } from '@/stores/theme'
import { useBrandStore, applyBrand } from '@/stores/brand'

function App() {
  const mode = useThemeStore((s) => s.mode)
  const brand = useBrandStore((s) => s.brand)

  useEffect(() => {
    applyTheme(mode)
  }, [mode])

  useEffect(() => {
    applyBrand(brand)
  }, [brand])

  return (
    <TooltipProvider delayDuration={300}>
      <RouterProvider router={router} />
      <Toaster />
    </TooltipProvider>
  )
}

export default App
