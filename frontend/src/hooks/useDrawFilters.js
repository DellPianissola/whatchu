import { useState, useEffect, useMemo } from 'react'
import { getExternalGenres } from '../services/api.js'
import { useStreamingProviders } from './useStreamingProviders.js'
import { ALL_TYPES } from '../components/TypeFilterPills.jsx'

export const useDrawFilters = () => {
  const { options: streamingOptions } = useStreamingProviders()
  const [filterTypes, setFilterTypes] = useState(ALL_TYPES)
  const [filterGenres, setFilterGenres] = useState([])
  const [filterProviders, setFilterProviders] = useState([])
  const [genresByType, setGenresByType] = useState({ MOVIE: [], SERIES: [] })

  useEffect(() => {
    let cancelled = false
    Promise.all([getExternalGenres('movie'), getExternalGenres('series')])
      .then(([movie, series]) => { if (!cancelled) setGenresByType({ MOVIE: movie, SERIES: series }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const availableGenres = useMemo(() => {
    const set = new Set()
    filterTypes.forEach(t => (genresByType[t] || []).forEach(g => set.add(g)))
    return [...set].sort()
  }, [filterTypes, genresByType])

  const selectTypes = (next) => {
    setFilterTypes(next)
    setFilterGenres([])
  }

  return {
    filterTypes, setFilterTypes, selectTypes,
    filterGenres, setFilterGenres,
    filterProviders, setFilterProviders,
    availableGenres, streamingOptions,
  }
}
