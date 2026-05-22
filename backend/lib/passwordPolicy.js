import { ValidationError } from './httpErrors.js'

export const MIN_PASSWORD_LENGTH = 8
export const BCRYPT_ROUNDS = 10

export const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`)
  }
}
