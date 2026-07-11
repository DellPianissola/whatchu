import './NavBadge.css'

const NavBadge = ({ count, children }) => (
  <span className="ui-nav-badge-anchor">
    {children}
    {count > 0 && (
      <span className="ui-nav-badge" aria-label={`${count} convites pendentes`}>
        {count > 9 ? '9+' : count}
      </span>
    )}
  </span>
)

export default NavBadge
