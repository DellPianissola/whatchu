import { useState } from 'react'
import { resendVerificationPublic, apiErrorMessage } from '../services/api'

const FALLBACK_ERROR = 'Não foi possível reenviar. Tente novamente em alguns minutos.'

export const useResendVerification = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState(null)

  const resend = async (email) => {
    setError(null)
    setIsLoading(true)
    try {
      await resendVerificationPublic(email)
      setIsDone(true)
    } catch (err) {
      setError(apiErrorMessage(err, FALLBACK_ERROR))
    } finally {
      setIsLoading(false)
    }
  }

  return { resend, isLoading, isDone, error }
}
