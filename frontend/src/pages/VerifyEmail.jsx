import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useResendVerification } from '../hooks/useResendVerification.js'
import AuthShell from '../components/AuthShell.jsx'
import FormField from '../components/FormField.jsx'
import Spinner from '../components/Spinner.jsx'
import { ROUTES } from '../constants/routes.js'
import './VerifyEmail.css'

const SUCCESS_REDIRECT_MS = 1500
const TAKEN_ERROR_CODES = ['EMAIL_TAKEN', 'USERNAME_TAKEN']

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { verifyEmailAndLogin } = useAuth()
  const [status, setStatus]     = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const { resend, isLoading: resendLoading, isDone: resendDone, error: resendError } = useResendVerification()

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
        setTimeout(() => navigate(ROUTES.HOME, { replace: true }), SUCCESS_REDIRECT_MS)
      } else {
        setStatus('error')
        setErrorMsg(result.error || 'Link inválido ou expirado. Solicite um novo abaixo.')
        setErrorCode(result.code || '')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = (e) => {
    e.preventDefault()
    resend(resendEmail)
  }

  return (
    <AuthShell>
      {status === 'loading' && (
        <div className="verify-content">
          <Spinner size="lg" label="Confirmando sua conta" />
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

          {TAKEN_ERROR_CODES.includes(errorCode) ? (
            <Link to={ROUTES.LOGIN} className="btn-verify-primary">Ir para o login</Link>
          ) : resendDone ? (
            <p className="verify-resend-done">
              Se houver um cadastro pendente com este email, um novo link foi enviado.
            </p>
          ) : (
            <form onSubmit={handleResend} className="verify-resend-form">
              <FormField
                id="resend-email"
                type="email"
                label="Reenviar link de verificação"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={resendLoading}
                autoComplete="email"
                error={resendError}
              />
              <button type="submit" disabled={resendLoading} className="btn-verify-primary">
                {resendLoading ? 'Enviando...' : 'Reenviar email'}
              </button>
            </form>
          )}

          <Link to={ROUTES.LOGIN} className="btn-verify-secondary">Voltar ao login</Link>
        </div>
      )}
    </AuthShell>
  )
}

export default VerifyEmail
