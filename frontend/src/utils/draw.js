import { luckyDraw } from '../services/api.js'
import { DRAW_DELAY_MS } from '../constants/ui.js'

export const performLuckyDraw = async ({ types, genres, providers }, { toast, setDrawing, setResult }) => {
  setDrawing(true)
  setResult(null)
  try {
    await new Promise(resolve => setTimeout(resolve, DRAW_DELAY_MS))
    const movie = await luckyDraw({ types, genres, providers })
    if (movie) {
      setResult(movie)
    } else {
      toast.info('Não rolou achar nada com esses filtros. Tente outros gêneros ou tipos.')
    }
  } catch {
    toast.error('Erro ao sortear. Tente novamente.')
  } finally {
    setDrawing(false)
  }
}
