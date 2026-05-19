import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset, apiErrorMessage } from '../services/api.js'
import AuthShell from '../components/AuthShell.jsx'
import AuthSuccessMessage from '../components/AuthSuccessMessage.jsx'
import FormField from '../components/FormField.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { ROUTES } from '../constants/routes.js'
import './Login.css'

const FALLBACK_ERROR = 'Não foi possível processar a solicitação. Tente novamente.'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSubmitted(true)
    } catch (err) {
      setError(apiErrorMessage(err, FALLBACK_ERROR))
    } finally {
      setLoading(false)
    }
  }

  const footer = <p><Link to={ROUTES.LOGIN}>← Voltar para o login</Link></p>

  if (submitted) {
    return (
      <AuthShell subtitle="Recuperar acesso" footer={footer}>
        <AuthSuccessMessage title="Verifique seu email">
          <p>
            Se o email <strong>{email}</strong> estiver cadastrado, enviaremos um link
            para redefinir sua senha em alguns instantes.
          </p>
          <p className="forgot-hint">
            Verifique também sua caixa de spam. O link expira em 30 minutos.
          </p>
        </AuthSuccessMessage>
      </AuthShell>
    )
  }

  return (
    <AuthShell subtitle="Recuperar acesso" footer={footer}>
      <ErrorMessage>{error}</ErrorMessage>

      <form onSubmit={handleSubmit} className="login-form">
        <FormField
          id="email"
          type="email"
          label="Email da conta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          disabled={loading}
          autoComplete="email"
        />

        <button type="submit" disabled={loading} className="btn-login">
          {loading ? 'Enviando...' : 'Enviar link de redefinição'}
        </button>
      </form>
    </AuthShell>
  )
}

export default ForgotPassword
