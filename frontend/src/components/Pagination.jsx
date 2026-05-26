import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
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
      >
        <ChevronsLeft size={16} />
        <span className="ui-pagination-text">Início</span>
      </button>

      <button
        type="button"
        className="ui-pagination-btn"
        onClick={() => go(current - 1)}
        disabled={isFirst}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} />
        <span className="ui-pagination-text">Anterior</span>
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={`ui-pagination-btn ${page === current ? 'ui-pagination-btn--active' : ''}`}
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
      >
        <span className="ui-pagination-text">Próximo</span>
        <ChevronRight size={16} />
      </button>

      <button
        type="button"
        className="ui-pagination-btn"
        onClick={() => go(total)}
        disabled={isLast}
        aria-label="Última página"
      >
        <span className="ui-pagination-text">Último</span>
        <ChevronsRight size={16} />
      </button>
    </nav>
  )
}

export default Pagination
