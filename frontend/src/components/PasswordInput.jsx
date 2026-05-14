import { useState } from 'react'
import './PasswordInput.css'

const PasswordInput = ({ id, value, onChange, disabled, placeholder = '••••••••', minLength = 8, autoComplete = 'current-password', required = true, ...rest }) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-input">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        minLength={minLength}
        autoComplete={autoComplete}
        {...rest}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
        title={visible ? 'Esconder senha' : 'Mostrar senha'}
        tabIndex={-1}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  )
}

export default PasswordInput
