import { useEffect, useRef, useState } from 'react'

const read = (key, initial) => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? initial : JSON.parse(raw)
  } catch {
    return initial
  }
}

export const useLocalStorageState = (key, initial) => {
  const [value, setValue] = useState(() => read(key, initial))
  const keyRef = useRef(key)

  useEffect(() => {
    // Key dinâmica (ex.: escopada por profile carregado async): re-ler a key
    // nova em vez de gravar nela o valor da key antiga — senão sobrescreve.
    if (keyRef.current !== key) {
      keyRef.current = key
      setValue(read(key, initial))
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch { /* quota cheia ou storage indisponível: estado fica só em memória */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value])

  return [value, setValue]
}
