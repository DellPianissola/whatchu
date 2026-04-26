import { useState, useEffect } from 'react'
import { getProfiles, createProfile, updateProfile } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import './Profiles.css'

const Profiles = () => {
  const { profile, updateProfile: updateAuthProfile } = useAuth()
  const { toast } = useNotify()
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '' })

  useEffect(() => {
    if (profile) {
      setFormData({ name: profile.name })
    }
  }, [profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      if (profile) {
        // Atualiza perfil existente
        const response = await updateProfile(formData)
        updateAuthProfile(response.data.profile)
      } else {
        // Cria novo perfil
        const response = await createProfile(formData)
        updateAuthProfile(response.data.profile)
      }
      setShowForm(false)
      toast.success('Perfil salvo com sucesso')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error(error.response?.data?.error || 'Erro ao salvar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    if (profile) {
      setFormData({ name: profile.name })
    }
  }

  return (
    <div className="profiles-page">
      <div className="profiles-container">
        <div className="profiles-header">
          <h2>Meu Perfil</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-create"
            >
              {profile ? '✏️ Editar' : '➕ Criar Perfil'}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="profile-form">
            <h3>{profile ? 'Editar Perfil' : 'Criar Perfil'}</h3>
            <input
              type="text"
              placeholder="Nome do perfil"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="form-input"
              disabled={loading}
            />
            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-save">
                {loading ? 'Salvando...' : profile ? 'Atualizar' : 'Criar'}
              </button>
              <button type="button" onClick={handleCancel} disabled={loading} className="btn-cancel">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {!showForm && (
          <>
            {loading ? (
              <div className="loading">Carregando...</div>
            ) : !profile ? (
              <div className="empty-state">
                <p>Nenhum perfil criado ainda</p>
                <p className="empty-hint">Crie um perfil para começar a adicionar filmes!</p>
              </div>
            ) : (
              <div className="profile-card-single">
                <div className="profile-avatar">
                  <div className="avatar-placeholder">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <h3>{profile.name}</h3>
                <p className="profile-stats">
                  {profile._count?.movies || 0} filme{profile._count?.movies !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Profiles

