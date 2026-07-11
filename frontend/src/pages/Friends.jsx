import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Users, Check, X } from 'lucide-react'
import {
  getFriends,
  sendFriendInvite,
  respondFriendInvite,
  removeFriend,
  apiErrorMessage,
} from '../services/api.js'
import { useNotify } from '../contexts/NotificationContext.jsx'
import Avatar from '../components/Avatar.jsx'
import Spinner from '../components/Spinner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import IconButton from '../components/IconButton.jsx'
import './Friends.css'

const EMPTY_DATA = { friends: [], pendingReceived: [], pendingSent: [] }

const FriendRow = ({ friendship, children }) => (
  <li className="friend-row">
    <Avatar src={friendship.profile.avatarUrl} name={friendship.profile.name} size={40} />
    <div className="friend-row-info">
      <span className="friend-row-name">{friendship.profile.name}</span>
      <span className="friend-row-username">@{friendship.profile.username}</span>
    </div>
    <div className="friend-row-actions">{children}</div>
  </li>
)

const Friends = () => {
  const { toast } = useNotify()
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [sending, setSending] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [respondingId, setRespondingId] = useState(null)

  const refresh = useCallback(async () => {
    try {
      setData(await getFriends())
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao carregar amigos'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { refresh() }, [refresh])

  const handleInvite = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await sendFriendInvite(username.trim())
      toast.success('Convite enviado')
      setUsername('')
      await refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao enviar convite'))
    } finally {
      setSending(false)
    }
  }

  const handleRespond = async (friendship, accept) => {
    setRespondingId(friendship.id)
    try {
      await respondFriendInvite(friendship.id, accept)
      toast.success(accept
        ? `Agora você e ${friendship.profile.name} são amigos`
        : 'Convite recusado')
      await refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao responder convite'))
    } finally {
      setRespondingId(null)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await removeFriend(removeTarget.id)
      toast.success(removeTarget.status === 'PENDING' ? 'Convite cancelado' : 'Amizade desfeita')
      setRemoveTarget(null)
      await refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao remover'))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="friends-page">
      <div className="friends-container">
        <h2 className="friends-title">Amigos</h2>
        <p className="friends-subtitle">
          Adicione amigos para sortear o que assistir levando em conta as listas de todo mundo.
        </p>

        <section className="friends-card">
          <h3 className="friends-card-title">Adicionar amigo</h3>
          <form onSubmit={handleInvite} className="friends-invite-form">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="friends-input"
              placeholder="username do amigo"
              aria-label="Username do amigo"
              autoComplete="off"
              disabled={sending}
              required
            />
            <button type="submit" className="friends-invite-btn" disabled={sending || !username.trim()}>
              <UserPlus size={16} />
              {sending ? 'Enviando...' : 'Convidar'}
            </button>
          </form>
          <p className="friends-hint">
            O username é o mesmo usado no login — peça o dele pro seu amigo.
          </p>
        </section>

        {loading ? (
          <div className="friends-loading"><Spinner size="lg" /></div>
        ) : (
          <>
            {data.pendingReceived.length > 0 && (
              <section className="friends-card">
                <h3 className="friends-card-title">Convites recebidos</h3>
                <ul className="friends-list">
                  {data.pendingReceived.map((f) => (
                    <FriendRow key={f.id} friendship={f}>
                      <IconButton
                        icon={<Check size={18} />}
                        label={`Aceitar convite de ${f.profile.name}`}
                        onClick={() => handleRespond(f, true)}
                        disabled={respondingId === f.id}
                        className="friend-action friend-action--accept"
                      />
                      <IconButton
                        icon={<X size={18} />}
                        label={`Recusar convite de ${f.profile.name}`}
                        onClick={() => handleRespond(f, false)}
                        disabled={respondingId === f.id}
                        className="friend-action friend-action--decline"
                      />
                    </FriendRow>
                  ))}
                </ul>
              </section>
            )}

            <section className="friends-card">
              <h3 className="friends-card-title">
                Meus amigos{data.friends.length > 0 && ` · ${data.friends.length}`}
              </h3>
              {data.friends.length === 0 ? (
                <EmptyState
                  icon={<Users size={36} />}
                  title="Nenhum amigo ainda"
                  description="Convide alguém pelo username pra desbloquear o sorteio em grupo."
                />
              ) : (
                <ul className="friends-list">
                  {data.friends.map((f) => (
                    <FriendRow key={f.id} friendship={f}>
                      <button className="friend-row-remove" onClick={() => setRemoveTarget(f)}>
                        Desfazer
                      </button>
                    </FriendRow>
                  ))}
                </ul>
              )}
            </section>

            {data.pendingSent.length > 0 && (
              <section className="friends-card">
                <h3 className="friends-card-title">Convites enviados</h3>
                <ul className="friends-list">
                  {data.pendingSent.map((f) => (
                    <FriendRow key={f.id} friendship={f}>
                      <span className="friend-pending-badge">Pendente</span>
                      <button className="friend-row-remove" onClick={() => setRemoveTarget(f)}>
                        Cancelar
                      </button>
                    </FriendRow>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={removeTarget?.status === 'PENDING' ? 'Cancelar convite' : 'Desfazer amizade'}
        message={removeTarget?.status === 'PENDING'
          ? `Cancelar o convite para ${removeTarget?.profile.name}?`
          : `Desfazer a amizade com ${removeTarget?.profile.name}? Vocês vão parar de aparecer no sorteio em grupo um do outro.`}
        confirmLabel={removeTarget?.status === 'PENDING' ? 'Cancelar convite' : 'Desfazer'}
        cancelLabel="Voltar"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
        isLoading={removing}
      />
    </div>
  )
}

export default Friends
