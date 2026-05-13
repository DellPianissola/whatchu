import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../services/api.js'
import WatchuLogo from '../components/WatchuLogo.jsx'
import './Login.css'

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
      setError(err.response?.data?.error || 'Não foi possível processar a solicitação. Tente novamente.')
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
            <p>Recuperar acesso</p>
          </div>

          {submitted ? (
            <div className="forgot-success">
              <p>
                Se o email <strong>{email}</strong> estiver cadastrado, enviaremos um link
                para redefinir sua senha em alguns instantes.
              </p>
              <p className="forgot-hint">
                Verifique também sua caixa de spam. O link expira em 30 minutos.
              </p>
            </div>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="email">Email da conta</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-login">
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
            </>
          )}

          <div className="login-footer">
            <p>
              <Link to="/login">← Voltar para o login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
