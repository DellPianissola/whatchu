import './Button.css'

const Button = ({
  variant = 'filter',
  size = 'md',
  active = false,
  pill = false,
  icon,
  fullWidth = false,
  disabled = false,
  as: Component = 'button',
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    pill ? 'ui-btn--pill' : '',
    active ? 'ui-btn--active' : '',
    fullWidth ? 'ui-btn--full' : '',
    className,
  ].filter(Boolean).join(' ')

  const content = (
    <>
      {icon && <span className="ui-btn-icon">{icon}</span>}
      <span className="ui-btn-text">{children}</span>
    </>
  )

  if (Component === 'button') {
    return (
      <button className={classes} disabled={disabled} {...rest}>
        {content}
      </button>
    )
  }

  return (
    <Component className={classes} aria-disabled={disabled || undefined} {...rest}>
      {content}
    </Component>
  )
}

export default Button
