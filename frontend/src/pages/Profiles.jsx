import { useState, useEffect, useRef } from 'react'
import { createProfile, updateProfile, changeEmail, setAdultContent, uploadAvatar } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotify } from '../contexts/NotificationContext.jsx'
import './Profiles.css'

const Profiles = () => {
  const { user, profile, updateProfile: updateAuthProfile, refreshUser } = useAuth()
  const { toast } = useNotify()
  const [loading, setLoading] = useState(false)
  const [section, setSection] = useState(null) // null | 'profile' | 'email'
  const avatarInputRef = useRef(null)

  const [formName, setFormName]           = useState('')
  const [formBirthDate, setFormBirthDate] = useState('')
  const [formEmail, setFormEmail]         = useState('')

  useEffect(() => {
    if (profile) setFormName(profile.name)
    if (user?.birthDate) setFormBirthDate(user.birthDate.split('T')[0])
  }, [profile, user])

  const isAdult = () => {
    if (!user?.birthDate) return false
    const age = Math.floor((Date.now() - new Date(user.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    return age >= 18
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
      setSection(null)
      toast.success('Perfil salvo com sucesso')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar perfil')
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
      setSection(null)
      toast.success('Email atualizado. Verifique sua caixa de entrada.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar email')
    } finally {
      setLoading(false)
    }
  }

  const handleAdultContent = async (enabled) => {
    setLoading(true)
    try {
      const res = await setAdultContent(enabled)
      updateAuthProfile(res.data.profile)
      toast.success(enabled ? 'Conteúdo adulto ativado' : 'Conteúdo adulto desativado')
    } catch (err) {
      const code = err.response?.data?.code
      if (code === 'UNDERAGE' || code === 'BIRTHDATE_REQUIRED') {
        toast.error(err.response.data.error)
      } else {
        toast.error('Erro ao atualizar preferência')
      }
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
      toast.error(err.response?.data?.error || 'Erro ao enviar foto')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="profiles-page">
      <div className="profiles-container">
        <h2 className="profiles-title">Meu Perfil</h2>

        <div className="profile-section">
          <div className="profile-section-avatar">
            <div className="profile-avatar" onClick={() => avatarInputRef.current?.click()} title="Trocar foto">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" />
              ) : (
                <div className="avatar-placeholder">
                  {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="avatar-overlay">Trocar</div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
              disabled={loading}
            />
            <p className="avatar-name">{profile?.name}</p>
            <p className="avatar-stats">
              {profile?._count?.movies ?? 0} {profile?._count?.movies === 1 ? 'item' : 'itens'} na lista
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
                onClick={() => { setFormEmail(user?.email ?? ''); setSection(section === 'email' ? null : 'email') }}
              >
                Alterar
              </button>
            </div>
          </div>

          {section === 'email' && (
            <form onSubmit={handleChangeEmail} className="profile-form-inline profile-form-inline--inset">
              <div className="form-row">
                <label>Novo email</label>
                <input
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
                <button type="button" onClick={() => setSection(null)} disabled={loading} className="btn-cancel">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="profile-section">
          <div className="section-header">
            <h3 className="section-title">Dados pessoais</h3>
            {section !== 'profile' && (
              <button className="btn-link-small" onClick={() => setSection('profile')}>Editar</button>
            )}
          </div>

          {section === 'profile' ? (
            <form onSubmit={handleSaveProfile} className="profile-form-inline">
              <div className="form-row">
                <label>Nome de exibição</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="form-input"
                  disabled={loading}
                  required
                />
              </div>
              <div className="form-row">
                <label>Data de nascimento</label>
                <input
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                  className="form-input"
                  disabled={loading}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-actions">
                <button type="submit" disabled={loading} className="btn-save">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" onClick={() => setSection(null)} disabled={loading} className="btn-cancel">
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

        {isAdult() && (
          <div className="profile-section">
            <h3 className="section-title">Preferências</h3>
            <div className="profile-info-row profile-info-row--toggle">
              <div>
                <span className="info-label">Conteúdo adulto (+18)</span>
                <p className="info-hint">Exibe resultados classificados como adultos na busca e descoberta.</p>
              </div>
              <button
                className={`btn-toggle ${profile?.allowAdultContent ? 'btn-toggle--on' : ''}`}
                onClick={() => handleAdultContent(!profile?.allowAdultContent)}
                disabled={loading}
              >
                {profile?.allowAdultContent ? 'Ativado' : 'Desativado'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profiles
