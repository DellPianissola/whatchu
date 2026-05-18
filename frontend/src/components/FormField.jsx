import { useId } from 'react'
import './FormField.css'

const FormField = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  required = false,
  disabled = false,
  autoComplete,
  className = '',
  inputClassName = '',
  inputRef,
  children,
  ...rest
}) => {
  const generatedId = useId()
  const fieldId = id || generatedId
  const describedById = error ? `${fieldId}-error` : (hint ? `${fieldId}-hint` : undefined)

  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && (
        <label htmlFor={fieldId} className="ui-field-label">
          {label}
          {required && <span className="ui-field-required" aria-hidden="true"> *</span>}
        </label>
      )}

      {children ? (
        children({ id: fieldId, 'aria-describedby': describedById, 'aria-invalid': !!error || undefined })
      ) : (
        <input
          id={fieldId}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          ref={inputRef}
          aria-describedby={describedById}
          aria-invalid={!!error || undefined}
          className={`ui-field-input ${inputClassName}`.trim()}
          {...rest}
        />
      )}

      {error && (
        <span id={`${fieldId}-error`} className="ui-field-error" role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${fieldId}-hint`} className="ui-field-hint">{hint}</span>
      )}
    </div>
  )
}

export default FormField
