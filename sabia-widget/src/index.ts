/**
 * Sabiá Widget - Embeddable support chat script
 *
 * Usage:
 *   <script src="sabia-widget.js" data-token="w-xxx" data-api-url="https://api.example.com"></script>
 *
 * Features:
 * - Shadow DOM isolation (no CSS conflicts)
 * - Fixed bottom-right position
 * - postMessage API for open/close
 * - Token-based auth via iframe query param
 */

interface WidgetConfig {
  token: string
  apiUrl: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  primaryColor?: string
}

function getConfig(): WidgetConfig {
  const script = document.currentScript as HTMLScriptElement | null
  if (!script) {
    console.error('[Sabiá Widget] No script element found')
    throw new Error('Widget script not found')
  }

  const token = script.dataset.token
  const apiUrl = script.dataset.apiUrl ?? 'https://api.bsoft.com.br'

  if (!token) {
    console.error('[Sabiá Widget] data-token attribute is required')
    throw new Error('Missing data-token')
  }

  return {
    token,
    apiUrl: apiUrl.replace(/\/+$/, ''),
    position: (script.dataset.position as WidgetConfig['position']) ?? 'bottom-right',
    primaryColor: script.dataset.primaryColor,
  }
}

function createShadowHost(): HTMLDivElement {
  const host = document.createElement('div')
  host.id = 'sabia-widget-host'
  host.style.cssText = `
    all: initial;
    position: fixed;
    z-index: 2147483647;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `
  document.body.appendChild(host)
  return host
}

function createIframe(config: WidgetConfig): HTMLIFrameElement {
  const iframe = document.createElement('iframe')
  iframe.id = 'sabia-widget-iframe'
  iframe.src = `${config.apiUrl}/widget?t=${encodeURIComponent(config.token)}`
  iframe.allow = 'clipboard-read; clipboard-write'
  iframe.style.cssText = `
    all: initial;
    border: none;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    width: 380px;
    height: 560px;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
    pointer-events: auto;
    background: white;
    display: none;
  `

  // Position
  const pos = config.position ?? 'bottom-right'
  const positions: Record<string, string> = {
    'bottom-right': 'bottom: 20px; right: 20px;',
    'bottom-left': 'bottom: 20px; left: 20px;',
    'top-right': 'top: 20px; right: 20px;',
    'top-left': 'top: 20px; left: 20px;',
  }
  iframe.style.cssText += positions[pos]

  if (config.primaryColor) {
    iframe.style.border = `2px solid ${config.primaryColor}`
  }

  return iframe
}

function createToggleButton(config: WidgetConfig): HTMLButtonElement {
  const button = document.createElement('button')
  button.id = 'sabia-widget-toggle'
  button.setAttribute('aria-label', 'Abrir chat de suporte')
  button.style.cssText = `
    all: initial;
    position: fixed;
    z-index: 2147483646;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    pointer-events: auto;
    background: ${config.primaryColor ?? '#6366f1'};
  `

  // SVG icon (message square)
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `

  // Hover effect
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.08)'
    button.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
  })
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)'
    button.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
  })

  return button
}

function setupPostMessage(iframe: HTMLIFrameElement): void {
  window.addEventListener('message', (event) => {
    if (event.source !== iframe.contentWindow) return

    const data = event.data
    if (!data || typeof data !== 'object' || !data.type) return

    switch (data.type) {
      case 'sabia:widget:close':
        closeWidget()
        break
      case 'sabia:widget:open':
        openWidget()
        break
    }
  })
}

let isOpen = false
let iframe: HTMLIFrameElement | null = null
let toggleButton: HTMLButtonElement | null = null

function openWidget(): void {
  if (iframe && toggleButton) {
    iframe.style.display = 'block'
    toggleButton.style.display = 'none'
    isOpen = true
  }
}

function closeWidget(): void {
  if (iframe && toggleButton) {
    iframe.style.display = 'none'
    toggleButton.style.display = 'flex'
    isOpen = false
  }
}

function toggleWidget(): void {
  if (isOpen) {
    closeWidget()
  } else {
    openWidget()
  }
}

// Public API
declare global {
  interface Window {
    SabiáWidget: {
      open: () => void
      close: () => void
      toggle: () => void
      isOpen: () => boolean
    }
  }
}

function init(): void {
  try {
    const config = getConfig()

    // Create shadow host for isolation
    const host = createShadowHost()
    const shadow = host.attachShadow({ mode: 'closed' })

    // Create elements
    iframe = createIframe(config)
    toggleButton = createToggleButton(config)

    // Toggle on button click
    toggleButton.addEventListener('click', toggleWidget)

    // Setup postMessage
    setupPostMessage(iframe)

    // Append to shadow DOM
    shadow.appendChild(iframe)
    shadow.appendChild(toggleButton)

    // Expose public API
    window.SabiáWidget = {
      open: openWidget,
      close: closeWidget,
      toggle: toggleWidget,
      isOpen: () => isOpen,
    }

    // Handle responsive resize
    const handleResize = () => {
      if (iframe) {
        const maxWidth = Math.min(380, window.innerWidth - 24)
        const maxHeight = Math.min(560, window.innerHeight - 24)
        iframe.style.maxWidth = `${maxWidth}px`
        iframe.style.maxHeight = `${maxHeight}px`
      }
    }
    window.addEventListener('resize', handleResize)

    console.log('[Sabiá Widget] Initialized successfully')
  } catch (error) {
    console.error('[Sabiá Widget] Initialization failed:', error)
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

export {}