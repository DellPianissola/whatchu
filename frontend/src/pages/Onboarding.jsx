import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { markOnboarded } from '../services/api.js'
import Search from './Search.jsx'
import './Onboarding.css'

const Onboarding = () => {
  const navigate = useNavigate()
  const { updateProfile } = useAuth()
  const { toast } = useNotify()
  const [transitioning, setTransitioning] = useState(false)
  const [skipDialogOpen, setSkipDialogOpen] = useState(false)

  // Conclui (ou skipa) → marca onboardedAt no backend e leva pro Home
  const finish = async ({ withTransition = true } = {}) => {
    try {
      const response = await markOnboarded()
      updateProfile(response.data.profile)

      if (withTransition) {
        setTransitioning(true)
        setTimeout(() => navigate('/', { replace: true }), 1400)
      } else {
        navigate('/', { replace: true })
      }
    } catch (error) {
      console.error('Erro ao concluir onboarding:', error)
      toast.error('Erro ao concluir. Tente novamente.')
    }
  }

  const handleSkipConfirm = () => {
    setSkipDialogOpen(false)
    // Skip pula sem transição comemorativa (não tem o que comemorar)
    finish({ withTransition: false })
  }

  return (
    <>
      <Search
        mode="onboarding"
        onComplete={() => finish({ withTransition: true })}
        onSkip={() => setSkipDialogOpen(true)}
      />

      {skipDialogOpen && (
        <div className="onboarding-modal-backdrop" onClick={() => setSkipDialogOpen(false)}>
          <div className="onboarding-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Pular o onboarding?</h3>
            <p>
              Sem itens na lista, o sorteio não vai funcionar. Você pode adicionar
              filmes a qualquer momento pela tela de busca.
            </p>
            <div className="onboarding-modal-actions">
              <button
                type="button"
                className="onboarding-modal-secondary"
                onClick={() => setSkipDialogOpen(false)}
              >
                Voltar
              </button>
              <button
                type="button"
                className="onboarding-modal-primary"
                onClick={handleSkipConfirm}
              >
                Pular mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}

      {transitioning && (
        <div className="onboarding-transition" onClick={() => navigate('/', { replace: true })}>
          <div className="onboarding-transition-content">
            <div className="onboarding-transition-emoji">🎉</div>
            <h2>Pronto pra começar!</h2>
            <p>Sua lista está montada. Vamos sortear?</p>
          </div>
        </div>
      )}
    </>
  )
}

export default Onboarding
