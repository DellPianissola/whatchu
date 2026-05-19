import { useState, useRef } from 'react'
import { createProfile, updateProfile, changeEmail, uploadAvatar, apiErrorMessage } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import { pluralize, todayISODate } from '../utils/content.js'
import { AVATAR_ACCEPT } from '../constants/ui.js'
import './Profiles.css'

const SECTIONS = { PROFILE: 'profile', EMAIL: 'email' }

const Profiles = () => {
  const { user, profile, updateProfile: updateAuthProfile, refreshUser } = useAuth()
  const { toast } = useNotify()
  const [loading, setLoading] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const avatarInputRef = useRef(null)

  const [formName, setFormName]           = useState('')
  const [formBirthDate, setFormBirthDate] = useState('')
  const [formEmail, setFormEmail]         = useState('')

  const closeSection = () => setEditingSection(null)

  const openProfileSection = () => {
    setFormName(profile?.name ?? '')
    setFormBirthDate(user?.birthDate ? user.birthDate.split('T')[0] : '')
    setEditingSection(SECTIONS.PROFILE)
  }

  const openEmailSection = () => {
    setFormEmail(user?.email ?? '')
    setEditingSection(SECTIONS.EMAIL)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { name: formName }
      if (formBirthDate) payload.birthDate = formBirthDate
      if (profile) {
        await updateProfile(null, payload)
      } else {
        await createProfile(payload)
      }
      await refreshUser()
      closeSection()
      toast.success('Perfil salvo com sucesso')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao salvar perfil'))
    } finally {
      setLoading(false)
    }
  }

  const handleChangeEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await changeEmail(formEmail)
      await refreshUser()
      closeSection()
      toast.success('Email atualizado. Verifique sua caixa de entrada.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao atualizar email'))
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('avatar', file)
    setLoading(true)
    try {
      const res = await uploadAvatar(formData)
      updateAuthProfile(res.data.profile)
      toast.success('Foto atualizada')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao enviar foto'))
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const movieCount = profile?._count?.movies ?? 0

  return (
    <div className="profiles-page">
      <div className="profiles-container">
        <h2 className="profiles-title">Meu Perfil</h2>

        <div className="profile-section">
          <div className="profile-section-avatar">
            <button
              type="button"
              className="profile-avatar profile-avatar--button"
              onClick={() => avatarInputRef.current?.click()}
              title="Trocar foto"
              aria-label="Trocar foto"
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" />
              ) : (
                <div className="avatar-placeholder">
                  {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="avatar-overlay" aria-hidden="true">Trocar</div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
              disabled={loading}
              aria-label="Selecionar nova foto de perfil"
            />
            <p className="avatar-name">{profile?.name}</p>
            <p className="avatar-stats">
              {movieCount} {pluralize(movieCount, 'item', 'itens')} na lista
            </p>
          </div>

          <div className="section-divider" />

          <h3 className="section-title">Conta</h3>

          <div className="profile-info-row">
            <span className="info-label">Usuário</span>
            <span className="info-value">{user?.username}</span>
          </div>

          <div className="profile-info-row profile-info-row--email">
            <span className="info-label">Email</span>
            <div className="info-value-group">
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="email-actions">
              <button
                className="btn-link-small"
                onClick={() => editingSection === SECTIONS.EMAIL ? closeSection() : openEmailSection()}
              >
                Alterar
              </button>
            </div>
          </div>

          {editingSection === SECTIONS.EMAIL && (
            <form onSubmit={handleChangeEmail} className="profile-form-inline profile-form-inline--inset">
              <div className="form-row">
                <label htmlFor="new-email">Novo email</label>
                <input
                  id="new-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="form-input"
                  disabled={loading}
                  required
                />
              </div>
              <p className="form-hint-text">
                Você receberá um link de confirmação no novo endereço.
              </p>
              <div className="form-actions">
                <button type="submit" disabled={loading} className="btn-save">
                  {loading ? 'Salvando...' : 'Confirmar troca'}
                </button>
                <button type="button" onClick={closeSection} disabled={loading} className="btn-cancel">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="profile-section">
          <div className="section-header">
            <h3 className="section-title">Dados pessoais</h3>
            {editingSection !== SECTIONS.PROFILE && (
              <button className="btn-link-small" onClick={openProfileSection}>Editar</button>
            )}
          </div>

          {editingSection === SECTIONS.PROFILE ? (
            <form onSubmit={handleSaveProfile} className="profile-form-inline">
              <div className="form-row">
                <label htmlFor="profile-name">Nome de exibição</label>
                <input
                  id="profile-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="form-input"
                  disabled={loading}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="profile-birth">Data de nascimento</label>
                <input
                  id="profile-birth"
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                  className="form-input"
                  disabled={loading}
                  max={todayISODate()}
                />
              </div>
              <div className="form-actions">
                <button type="submit" disabled={loading} className="btn-save">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" onClick={closeSection} disabled={loading} className="btn-cancel">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="profile-info-row">
                <span className="info-label">Nome</span>
                <span className="info-value">{profile?.name ?? '—'}</span>
              </div>
              <div className="profile-info-row">
                <span className="info-label">Nascimento</span>
                <span className="info-value">
                  {user?.birthDate
                    ? new Date(user.birthDate).toLocaleDateString('pt-BR')
                    : <span className="info-value--muted">não informado</span>}
                </span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default Profiles
