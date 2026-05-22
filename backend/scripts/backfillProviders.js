import { MovieType } from '@prisma/client'
import { prisma } from '../config/database.js'
import tmdbService from '../services/tmdb.js'
import { extractStreamingProviderIds } from '../lib/streamingProviders.js'

const THROTTLE_MS = 100

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const fetchProviders = async (movie) => {
  const details = movie.type === MovieType.SERIES
    ? await tmdbService.getSeriesDetails(movie.externalId)
    : await tmdbService.getMovieDetails(movie.externalId)
  return extractStreamingProviderIds(details.watchProviders)
}

const run = async () => {
  const movies = await prisma.movie.findMany({
    where: {
      externalId: { not: null },
      providersUpdatedAt: null,
    },
    select: { id: true, type: true, externalId: true, title: true },
  })

  console.log(`Backfill: ${movies.length} movies para processar`)

  let ok = 0
  let fail = 0

  for (const movie of movies) {
    try {
      const providers = await fetchProviders(movie)
      await prisma.movie.update({
        where: { id: movie.id },
        data: { providers, providersUpdatedAt: new Date() },
      })
      ok++
      console.log(`✓ [${ok + fail}/${movies.length}] ${movie.title} → ${providers.length} provider(s)`)
    } catch (err) {
      fail++
      console.error(`✗ [${ok + fail}/${movies.length}] ${movie.title} (${movie.externalId}): ${err.message}`)
    }
    await sleep(THROTTLE_MS)
  }

  console.log(`\nFim: ${ok} sucesso, ${fail} falha`)
  await prisma.$disconnect()
}

run().catch((err) => {
  console.error('Backfill abortado:', err)
  prisma.$disconnect().finally(() => process.exit(1))
})
