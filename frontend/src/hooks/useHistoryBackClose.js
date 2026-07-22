import { useEffect, useRef } from 'react'

export const useHistoryBackClose = (active, onClose) => {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const pendingPop = useRef(false)

  useEffect(() => {
    if (!active) return

    // Remonte do StrictMode agenda o pop de limpeza logo antes deste setup:
    // cancela, pois vamos reaproveitar a entrada em vez de empilhar/estourar.
    pendingPop.current = false
    if (!window.history.state?.modalOpen) {
      window.history.pushState({ modalOpen: true }, '')
    }

    const handlePop = () => onCloseRef.current()
    window.addEventListener('popstate', handlePop)

    return () => {
      window.removeEventListener('popstate', handlePop)
      // Fechou por X/backdrop/Esc: a entrada empurrada ainda está no topo, então
      // desfaz. Se foi o botão voltar, o popstate já a removeu e o topo não é mais
      // o nosso marcador — aí não mexemos pra não voltar a tela. O back() é adiado
      // pra que, no remonte do StrictMode, o próximo setup cancele antes de estourar.
      if (window.history.state?.modalOpen) {
        pendingPop.current = true
        queueMicrotask(() => {
          if (pendingPop.current) {
            pendingPop.current = false
            window.history.back()
          }
        })
      }
    }
  }, [active])
}
