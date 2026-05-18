import { usePagination } from '../hooks/usePagination'
import './Pagination.css'

const Pagination = ({ current, total, onChange }) => {
  const { pages, isFirst, isLast } = usePagination(current, total)

  const go = (page) => {
    if (page < 1 || page > total || page === current) return
    onChange(page)
  }

  return (
    <nav className="ui-pagination" aria-label="Paginação">
      <button
        type="button"
        className="ui-pagination-btn"
        onClick={() => go(1)}
        disabled={isFirst}
        aria-label="Primeira página"
      >« Início</button>

      <button
        type="button"
        className="ui-pagination-btn"
        onClick={() => go(current - 1)}
        disabled={isFirst}
        aria-label="Página anterior"
      >‹ Anterior</button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={`ui-pagination-btn ui-pagination-btn--page ${page === current ? 'ui-pagination-btn--active' : ''}`}
          onClick={() => go(page)}
          aria-label={`Página ${page}`}
          aria-current={page === current ? 'page' : undefined}
        >{page}</button>
      ))}

      <button
        type="button"
        className="ui-pagination-btn"
        onClick={() => go(current + 1)}
        disabled={isLast}
        aria-label="Próxima página"
      >Próximo ›</button>

      <button
        type="button"
        className="ui-pagination-btn"
        onClick={() => go(total)}
        disabled={isLast}
        aria-label="Última página"
      >Último »</button>
    </nav>
  )
}

export default Pagination
