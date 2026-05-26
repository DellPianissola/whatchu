import { useEffect, useState } from 'react'

const getMatch = (query) =>
  typeof window !== 'undefined' && window.matchMedia(query).matches

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => getMatch(query))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}
