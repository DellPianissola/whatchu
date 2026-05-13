import { ValidationError } from './httpErrors.js'

// Política de senha — fonte única de verdade. Frontend deve refletir o mesmo MIN_LENGTH.
export const MIN_PASSWORD_LENGTH = 8

export const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`)
  }
}
