import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  fallback: ReactNode
  children: ReactNode
}

export class ErrorBoundary extends Component<Props, { hasError: boolean }> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    // Registra erro no console ou serviço
    console.error('ErrorBoundary caught an error:', error)
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Também pode registrar o erro em um serviço de relatório de erros
    console.error('Uncaught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}