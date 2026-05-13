import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { resendVerificationPublic } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import WatchuLogo from '../components/WatchuLogo.jsx'
import './VerifyEmail.css'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { verifyEmailAndLogin } = useAuth()
  const [status, setStatus]     = useState('loading') // loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [errorCode, setErrorCode] = useState('')

  // Subestado do formulário de reenvio (visível só na branch error)
  const [resendEmail, setResendEmail]   = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone]     = useState(false)
  const [resendError, setResendError]   = useState('')

  // Guard contra double-invoke do useEffect em React StrictMode (dev).
  const verifyAttempted = useRef(false)

  useEffect(() => {
    if (verifyAttempted.current) return
    verifyAttempted.current = true

    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('Link de verificação inválido.')
      return
    }

    verifyEmailAndLogin(token).then((result) => {
      if (result.success) {
        setStatus('success')
        // Login automático: redireciona pra Home após breve confirmação visual
        setTimeout(() => navigate('/', { replace: true }), 1500)
      } else {
        setStatus('error')
        setErrorMsg(result.error || 'Link inválido ou expirado. Solicite um novo abaixo.')
        setErrorCode(result.code || '')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = async (e) => {
    e.preventDefault()
    setResendError('')
    setResendLoading(true)
    try {
      await resendVerificationPublic(resendEmail)
      setResendDone(true)
    } catch (err) {
      setResendError(err.response?.data?.error || 'Não foi possível reenviar. Tente novamente em alguns minutos.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-brand">
          <WatchuLogo size={40} />
          <span>What<span className="verify-chu">chu</span></span>
        </div>

        {status === 'loading' && (
          <div className="verify-content">
            <div className="verify-spinner" />
            <p>Confirmando sua conta...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verify-content">
            <div className="verify-icon verify-icon--success">✓</div>
            <h2>Tudo certo!</h2>
            <p>Sua conta foi criada e você já está logado. Redirecionando...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="verify-content">
            <div className="verify-icon verify-icon--error">✕</div>
            <h2>Verificação falhou</h2>
            <p>{errorMsg}</p>

            {/* USERNAME_TAKEN ou EMAIL_TAKEN: já tem User com esses dados — sugere login. */}
            {(errorCode === 'EMAIL_TAKEN' || errorCode === 'USERNAME_TAKEN') ? (
              <Link to="/login" className="btn-verify-primary">Ir para o login</Link>
            ) : resendDone ? (
              <p className="verify-resend-done">
                Se houver um cadastro pendente com este email, um novo link foi enviado.
              </p>
            ) : (
              <form onSubmit={handleResend} className="verify-resend-form">
                <label htmlFor="resend-email">Reenviar link de verificação</label>
                <input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={resendLoading}
                  autoComplete="email"
                />
                {resendError && <span className="verify-resend-error">{resendError}</span>}
                <button type="submit" disabled={resendLoading} className="btn-verify-primary">
                  {resendLoading ? 'Enviando...' : 'Reenviar email'}
                </button>
              </form>
            )}

            <Link to="/login" className="btn-verify-secondary">Voltar ao login</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail
