import { Film, Tv } from 'lucide-react'
import './StatPills.css'

const StatPills = ({ movies = 0, series = 0, className = '' }) => (
  <div className={`ui-stat-pills ${className}`.trim()}>
    <span className="ui-stat-pill ui-stat-pill--movie" title={`${movies} ${movies === 1 ? 'filme' : 'filmes'}`}>
      <Film size={14} /> {movies}
    </span>
    <span className="ui-stat-pill ui-stat-pill--series" title={`${series} ${series === 1 ? 'série' : 'séries'}`}>
      <Tv size={14} /> {series}
    </span>
  </div>
)

export default StatPills
