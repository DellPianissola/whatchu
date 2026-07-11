import './Avatar.css'

// Sem `size`, as dimensões vêm do CSS de quem usa (ex.: media queries do UserMenu).
const Avatar = ({ src, name, size = null, className = '' }) => (
  <span
    className={`ui-avatar ${className}`.trim()}
    style={size ? { width: size, height: size, fontSize: size * 0.45 } : undefined}
    aria-hidden="true"
  >
    {src ? (
      <img src={src} alt="" loading="lazy" />
    ) : (
      <span className="ui-avatar-fallback">
        {name?.trim()?.charAt(0)?.toUpperCase() ?? '?'}
      </span>
    )}
  </span>
)

export default Avatar
