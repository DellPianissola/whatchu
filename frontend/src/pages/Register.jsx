import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import WatchuLogo from '../components/WatchuLogo.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import './Register.css'

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
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validações
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
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
      <div className="register-page">
        <div className="register-container">
          <div className="register-card">
            <div className="register-header">
              <div className="auth-brand">
                <WatchuLogo size={44} />
                <h1>What<span className="auth-chu">chu</span></h1>
              </div>
            </div>
            <div className="registered-success">
              <div className="registered-icon">✓</div>
              <h2>Conta criada!</h2>
              <p>
                Enviamos um email para <strong>{email}</strong>.
                Clique no link para verificar sua conta.
              </p>
              <p className="registered-hint">
                Não recebeu? Verifique a caixa de spam ou{' '}
                <button className="btn-link" onClick={() => navigate('/')}>
                  acesse o app
                </button>{' '}
                e reenvie pelo banner de aviso.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <div className="auth-brand">
              <WatchuLogo size={44} />
              <h1>What<span className="auth-chu">chu</span></h1>
            </div>
            <p>Crie sua conta</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">Nome de usuário</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seu_usuario"
                required
                disabled={loading}
                minLength={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="birthDate">Data de nascimento</label>
              <input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={loading}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                minLength={8}
                autoComplete="new-password"
              />
              <small className="form-hint">Mínimo de 8 caracteres</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar senha</label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-register">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <div className="register-footer">
            <p>
              Já tem uma conta? <Link to="/login">Entre aqui</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register

