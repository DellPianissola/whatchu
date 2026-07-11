// IDs do TMDB podem colidir entre movie e tv, então `type` entra na chave.
const identityKey = (movie) =>
  movie.externalId
    ? `ext:${movie.type}:${movie.externalId}`
    : `manual:${movie.type}:${movie.title.toLowerCase()}`

export const mergeByIdentity = (movies, primaryProfileId) => {
  const groups = new Map()
  for (const movie of movies) {
    const key = identityKey(movie)
    if (groups.has(key)) groups.get(key).push(movie)
    else groups.set(key, [movie])
  }
  return [...groups.values()].map((copies) => ({
    movie: copies.find((c) => c.addedById === primaryProfileId) ?? copies[0],
    copies,
  }))
}
