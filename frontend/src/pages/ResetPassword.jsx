import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { resetPassword as resetPasswordApi } from '../services/api.js'
import WatchuLogo from '../components/WatchuLogo.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import './Login.css'

const MIN_LENGTH = 8

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [done, setDone]                       = useState(false)

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="auth-brand">
                <WatchuLogo size={44} />
                <h1>What<span className="auth-chu">chu</span></h1>
              </div>
            </div>
            <div className="error-message">
              Link inválido. Solicite uma nova redefinição de senha.
            </div>
            <div className="login-footer">
              <p><Link to="/forgot-password">Solicitar novo link</Link></p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < MIN_LENGTH) {
      setError(`A senha deve ter no mínimo ${MIN_LENGTH} caracteres`)
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      await resetPasswordApi(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível redefinir a senha. O link pode ter expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="auth-brand">
              <WatchuLogo size={44} />
              <h1>What<span className="auth-chu">chu</span></h1>
            </div>
            <p>Definir nova senha</p>
          </div>

          {done ? (
            <div className="forgot-success">
              <p>Senha redefinida com sucesso!</p>
              <p className="forgot-hint">Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="password">Nova senha</label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    minLength={MIN_LENGTH}
                    autoComplete="new-password"
                  />
                  <small className="form-hint">Mínimo de {MIN_LENGTH} caracteres</small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirmar nova senha</label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    minLength={MIN_LENGTH}
                    autoComplete="new-password"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-login">
                  {loading ? 'Redefinindo...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}

          <div className="login-footer">
            <p><Link to="/login">← Voltar para o login</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
