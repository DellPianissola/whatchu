import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { verifyEmail, resendVerificationPublic } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import WatchuLogo from '../components/WatchuLogo.jsx'
import './VerifyEmail.css'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const [status, setStatus]     = useState('loading') // loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const { refreshUser }         = useAuth()

  // Subestado do formulário de reenvio (visível só na branch error)
  const [resendEmail, setResendEmail]   = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone]     = useState(false)
  const [resendError, setResendError]   = useState('')

  // Guard contra double-invoke do useEffect em React StrictMode (dev). Sem isso,
  // a 1ª chamada consome o token (sucesso) e a 2ª falha — o setStatus('error')
  // da 2ª sobrescreve o success da 1ª e a tela mostra erro mesmo verificando.
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

    verifyEmail(token)
      .then(() => {
        setStatus('success')
        refreshUser?.()
      })
      .catch((err) => {
        setStatus('error')
        setErrorMsg(
          err.response?.data?.error || 'Link inválido ou expirado. Solicite um novo abaixo.'
        )
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
            <p>Verificando seu email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verify-content">
            <div className="verify-icon verify-icon--success">✓</div>
            <h2>Email verificado!</h2>
            <p>Sua conta está confirmada. Agora você tem acesso completo à plataforma.</p>
            <Link to="/" className="btn-verify-primary">Ir para o início</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="verify-content">
            <div className="verify-icon verify-icon--error">✕</div>
            <h2>Verificação falhou</h2>
            <p>{errorMsg}</p>

            {resendDone ? (
              <p className="verify-resend-done">
                Se o email estiver cadastrado e ainda não verificado, você receberá um novo link em breve.
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

            <Link to="/" className="btn-verify-secondary">Voltar ao início</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail
