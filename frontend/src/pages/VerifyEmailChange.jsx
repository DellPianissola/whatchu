import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { verifyEmailChange, apiErrorMessage } from '../services/api.js'
import AuthShell from '../components/AuthShell.jsx'
import Spinner from '../components/Spinner.jsx'
import { ROUTES } from '../constants/routes.js'
import './VerifyEmail.css'

const SUCCESS_REDIRECT_MS = 1500

const VerifyEmailChange = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated, refreshUser } = useAuth()
  const [status, setStatus]     = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // Guard contra double-invoke do useEffect em React StrictMode (dev).
  const verifyAttempted = useRef(false)

  useEffect(() => {
    if (verifyAttempted.current) return
    verifyAttempted.current = true

    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('Link de confirmação inválido.')
      return
    }

    verifyEmailChange(token)
      .then(async () => {
        if (isAuthenticated) await refreshUser()
        setStatus('success')
        setTimeout(
          () => navigate(isAuthenticated ? ROUTES.PROFILES : ROUTES.LOGIN, { replace: true }),
          SUCCESS_REDIRECT_MS,
        )
      })
      .catch((err) => {
        setStatus('error')
        setErrorMsg(apiErrorMessage(err, 'Link inválido ou expirado.'))
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthShell>
      {status === 'loading' && (
        <div className="verify-content">
          <Spinner size="lg" label="Confirmando troca de email" />
          <p>Confirmando a troca do seu email...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="verify-content">
          <div className="verify-icon verify-icon--success">✓</div>
          <h2>Email atualizado!</h2>
          <p>
            {isAuthenticated
              ? 'Redirecionando para o seu perfil...'
              : 'Faça login com o novo email.'}
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="verify-content">
          <div className="verify-icon verify-icon--error">✕</div>
          <h2>Confirmação falhou</h2>
          <p>{errorMsg}</p>
          <Link to={isAuthenticated ? ROUTES.PROFILES : ROUTES.LOGIN} className="btn-verify-secondary">
            {isAuthenticated ? 'Voltar ao perfil' : 'Voltar ao login'}
          </Link>
        </div>
      )}
    </AuthShell>
  )
}

export default VerifyEmailChange
