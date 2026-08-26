import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function bootstrap() {
  // Inicia MSW ANTES de renderizar o app para que a primeira requisição seja interceptada.
  // Apenas em desenvolvimento (ou quando explicitamente habilitado via VITE_MSW_ENABLED).
  if (import.meta.env.DEV && import.meta.env.VITE_MSW_ENABLED !== 'false') {
    try {
      const { worker } = await import('@/mocks/browser')
      await worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: { url: '/mockServiceWorker.js' },
        quiet: true,
      })
    } catch (e) {
      console.warn('MSW init failed', e)
    }
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

bootstrap()
