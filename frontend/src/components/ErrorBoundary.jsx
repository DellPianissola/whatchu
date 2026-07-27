import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import Button from './Button.jsx'
import { trackException } from '../services/analytics.js'

class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('Erro não tratado na interface:', error, info)
    // Sem isso, tela quebrada de usuário real não deixa rastro nenhum.
    trackException(error?.message ?? String(error))
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <EmptyState
        icon={<AlertTriangle size={40} />}
        title="Algo quebrou por aqui"
        description="A gente não conseguiu montar essa tela. Recarregar costuma resolver."
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        }
      />
    )
  }
}

export default ErrorBoundary
