import { MIN_PASSWORD_LENGTH } from '../constants/ui'

export const validatePassword = (password, confirm) => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`
  }
  if (password !== confirm) {
    return 'As senhas não coincidem'
  }
  return null
}
