import { ValidationError } from './httpErrors.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isValidEmail = (value) => typeof value === 'string' && EMAIL_RE.test(value)

export const validateEmail = (value) => {
  if (!isValidEmail(value)) throw new ValidationError('Email inválido')
}

export const validateBirthDate = (value) => {
  const date = new Date(value)
  if (isNaN(date.getTime()))   throw new ValidationError('Data de nascimento inválida')
  if (date > new Date())       throw new ValidationError('Data de nascimento não pode ser no futuro')
  return date
}
