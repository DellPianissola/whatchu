import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import AuthShell from '../components/AuthShell.jsx'
import AuthSuccessMessage from '../components/AuthSuccessMessage.jsx'
import FormField from '../components/FormField.jsx'
import DateInput from '../components/DateInput.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { useResendVerification } from '../hooks/useResendVerification.js'
import { validatePassword } from '../utils/validation.js'
import { ROUTES } from '../constants/routes.js'
import { MIN_PASSWORD_LENGTH } from '../constants/ui.js'
import './Register.css'

const MIN_USERNAME_LENGTH = 3

const Register = () => {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const { register } = useAuth()
  const { resend, isLoading: isResending, isDone: didResend } = useResendVerification()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const passwordError = validatePassword(password, confirmPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)
    const result = await register(email, username, password, birthDate || null)
    if (result.success) {
      setRegistered(true)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  if (registered) {
    return (
      <AuthShell>
        <AuthSuccessMessage title="Verifique seu email">
          <p>
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Clique no link para concluir o cadastro — você será logado automaticamente.
          </p>
          <p className="registered-hint">
            O link expira em 24 horas. Não recebeu? Verifique a caixa de spam, ou{' '}
            {didResend ? (
              <span>já reenviamos — confira novamente em alguns instantes.</span>
            ) : (
              <button
                type="button"
                className="btn-link"
                onClick={() => resend(email)}
                disabled={isResending}
              >
                {isResending ? 'reenviando...' : 'clique aqui para reenviar'}
              </button>
            )}
          </p>
          <p className="registered-hint">
            <Link to={ROUTES.LOGIN}>← Voltar para o login</Link>
          </p>
        </AuthSuccessMessage>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      subtitle="Crie sua conta"
      footer={<p>Já tem uma conta? <Link to={ROUTES.LOGIN}>Entre aqui</Link></p>}
    >
      <ErrorMessage>{error}</ErrorMessage>

      <form onSubmit={handleSubmit} className="register-form">
        <FormField
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          disabled={loading}
        />

        <FormField
          id="username"
          label="Nome de usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="seu_usuario"
          required
          disabled={loading}
          minLength={MIN_USERNAME_LENGTH}
        />

        <DateInput
          id="birthDate"
          label="Data de nascimento"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          disabled={loading}
        />

        <FormField
          id="password"
          label="Senha"
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

        <FormField id="confirmPassword" label="Confirmar senha">
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

        <button type="submit" disabled={loading} className="btn-register">
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
    </AuthShell>
  )
}

export default Register
