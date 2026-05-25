import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { resetPassword as resetPasswordApi, apiErrorMessage } from '../services/api.js'
import AuthShell from '../components/AuthShell.jsx'
import AuthSuccessMessage from '../components/AuthSuccessMessage.jsx'
import FormField from '../components/FormField.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { validatePassword } from '../utils/validation.js'
import { ROUTES } from '../constants/routes.js'
import { CheckCircle2 } from 'lucide-react'
import { MIN_PASSWORD_LENGTH } from '../constants/ui.js'
import './Login.css'

const FALLBACK_ERROR = 'Não foi possível redefinir a senha. O link pode ter expirado.'
const REDIRECT_DELAY_MS = 2500

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [done, setDone]                       = useState(false)

  const loginFooter = <p><Link to={ROUTES.LOGIN}>← Voltar para o login</Link></p>

  if (!token) {
    return (
      <AuthShell footer={<p><Link to={ROUTES.FORGOT_PASSWORD}>Solicitar novo link</Link></p>}>
        <ErrorMessage>Link inválido. Solicite uma nova redefinição de senha.</ErrorMessage>
      </AuthShell>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const passwordError = validatePassword(password, confirmPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)
    try {
      await resetPasswordApi(token, password)
      setDone(true)
      setTimeout(() => navigate(ROUTES.LOGIN), REDIRECT_DELAY_MS)
    } catch (err) {
      setError(apiErrorMessage(err, FALLBACK_ERROR))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell subtitle="Definir nova senha" footer={loginFooter}>
        <AuthSuccessMessage icon={<CheckCircle2 size={48} strokeWidth={1.5} />} title="Senha redefinida com sucesso!">
          <p className="forgot-hint">Redirecionando para o login...</p>
        </AuthSuccessMessage>
      </AuthShell>
    )
  }

  return (
    <AuthShell subtitle="Definir nova senha" footer={loginFooter}>
      <ErrorMessage>{error}</ErrorMessage>

      <form onSubmit={handleSubmit} className="login-form">
        <FormField
          id="password"
          label="Nova senha"
          hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
        >
          {(fieldProps) => (
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              {...fieldProps}
            />
          )}
        </FormField>

        <FormField id="confirmPassword" label="Confirmar nova senha">
          {(fieldProps) => (
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              {...fieldProps}
            />
          )}
        </FormField>

        <button type="submit" disabled={loading} className="btn-login">
          {loading ? 'Redefinindo...' : 'Redefinir senha'}
        </button>
      </form>
    </AuthShell>
  )
}

export default ResetPassword
