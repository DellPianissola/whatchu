import { useEffect, useState } from 'react'

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

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch { /* quota cheia ou storage indisponível: estado fica só em memória */ }
  }, [key, value])

  return [value, setValue]
}
