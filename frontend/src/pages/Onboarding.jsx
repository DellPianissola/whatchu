import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { markOnboarded } from '../services/api.js'
import Search from './Search.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { ROUTES } from '../constants/routes.js'
import { ONBOARDING_TRANSITION_MS } from '../constants/ui.js'
import './Onboarding.css'

const Onboarding = () => {
  const navigate = useNavigate()
  const { updateProfile } = useAuth()
  const { toast } = useNotify()
  const [transitioning, setTransitioning] = useState(false)
  const [skipDialogOpen, setSkipDialogOpen] = useState(false)

  const goHome = () => navigate(ROUTES.HOME, { replace: true })

  const finish = async ({ withTransition = true } = {}) => {
    try {
      const updatedProfile = await markOnboarded()
      updateProfile(updatedProfile)

      if (withTransition) {
        setTransitioning(true)
        setTimeout(goHome, ONBOARDING_TRANSITION_MS)
      } else {
        goHome()
      }
    } catch (error) {
      console.error('Erro ao concluir onboarding:', error)
      toast.error('Erro ao concluir. Tente novamente.')
    }
  }

  const handleSkipConfirm = () => {
    setSkipDialogOpen(false)
    finish({ withTransition: false }) // skip não merece a tela comemorativa
  }

  return (
    <>
      <Search
        mode="onboarding"
        onComplete={() => finish({ withTransition: true })}
        onSkip={() => setSkipDialogOpen(true)}
      />

      <ConfirmDialog
        open={skipDialogOpen}
        title="Pular o onboarding?"
        message="Sem itens na lista, o sorteio não vai funcionar. Você pode adicionar filmes a qualquer momento pela tela de busca."
        confirmLabel="Pular mesmo assim"
        cancelLabel="Voltar"
        variant="primary"
        onConfirm={handleSkipConfirm}
        onCancel={() => setSkipDialogOpen(false)}
      />

      {transitioning && (
        <div className="onboarding-transition" onClick={goHome}>
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
