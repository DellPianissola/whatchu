import { useState, useEffect, useMemo } from 'react'
import { getStreamingProviders } from '../services/api.js'

export const useStreamingProviders = () => {
  const [providers, setProviders] = useState([])

  useEffect(() => {
    let cancelled = false
    getStreamingProviders()
      .then((list) => { if (!cancelled) setProviders(list || []) })
      .catch(() => { if (!cancelled) setProviders([]) })
    return () => { cancelled = true }
  }, [])

  const options = useMemo(
    () => providers.map((p) => ({ value: p.key, label: p.name })),
    [providers]
  )

  return { providers, options }
}
