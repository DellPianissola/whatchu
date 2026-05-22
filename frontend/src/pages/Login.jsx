import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import AuthShell from '../components/AuthShell.jsx'
import FormField from '../components/FormField.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { ROUTES } from '../constants/routes.js'
import { MIN_PASSWORD_LENGTH } from '../constants/ui.js'
import './Login.css'

const Login = () => {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(identifier, password)

    if (result.success) {
      navigate(ROUTES.HOME)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  return (
    <AuthShell
      subtitle="Entre na sua conta"
      footer={<p>Não tem uma conta? <Link to={ROUTES.REGISTER}>Cadastre-se</Link></p>}
    >
      <ErrorMessage>{error}</ErrorMessage>

      <form onSubmit={handleSubmit} className="login-form">
        <FormField
          id="identifier"
          label="Email ou usuário"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="seu@email.com ou seu_usuario"
          required
          showRequiredMark={false}
          disabled={loading}
          autoComplete="username"
        />

        <FormField
          id="password"
          label="Senha"
          labelAddon={<Link to={ROUTES.FORGOT_PASSWORD} className="forgot-link">Esqueci minha senha</Link>}
        >
          {(fieldProps) => (
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="current-password"
              {...fieldProps}
            />
          )}
        </FormField>

        <button type="submit" disabled={loading} className="btn-login">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </AuthShell>
  )
}

export default Login
