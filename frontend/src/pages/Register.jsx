import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import WatchuLogo from '../components/WatchuLogo.jsx'
import './Register.css'

const Register = () => {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validações
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    const result = await register(email, username, password)

    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }

    setLoading(false)
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
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
              <small className="form-hint">Mínimo de 6 caracteres</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar senha</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
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

