import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerUser,
  loginUser,
  getMe,
  refreshTokens,
} from '../../services/auth.js'
import { truncateAll } from '../helpers/db.js'
import { createUser as createUserFactory } from '../helpers/factories.js'
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../lib/httpErrors.js'

describe('auth service', () => {
  beforeEach(() => truncateAll())

  // ─── registerUser ──────────────────────────────────────────────────────────

  describe('registerUser', () => {
    it('cria user + profile e devolve tokens', async () => {
      const result = await registerUser({
        email: 'user@test.com', username: 'testuser', password: 'senha123',
      })
      expect(result.user.username).toBe('testuser')
      expect(result.user.password).toBeUndefined() // campo oculto pelo select
      expect(result.profile).toBeDefined()
      expect(result.accessToken).toMatch(/^eyJ/)
      expect(result.refreshToken).toMatch(/^eyJ/)
    })

    it('lança ValidationError quando faltam campos obrigatórios', async () => {
      await expect(
        registerUser({ email: '', username: '', password: '' })
      ).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para email com formato inválido', async () => {
      await expect(
        registerUser({ email: 'nao-um-email', username: 'u', password: '123456' })
      ).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para senha com menos de 6 caracteres', async () => {
      await expect(
        registerUser({ email: 'a@b.com', username: 'u', password: '123' })
      ).rejects.toThrow(ValidationError)
    })

    it('lança ConflictError para username duplicado', async () => {
      await createUserFactory({ username: 'dupuser' })
      await expect(
        registerUser({ email: 'x@y.com', username: 'dupuser', password: 'senha123' })
      ).rejects.toThrow(ConflictError)
    })
  })

  // ─── loginUser ────────────────────────────────────────────────────────────

  describe('loginUser', () => {
    it('devolve user, profile e tokens com credenciais corretas', async () => {
      // Usa registerUser para garantir senha hasheada com bcrypt real
      await registerUser({ email: 'l@t.com', username: 'loginuser', password: 'senha123' })
      const result = await loginUser({ username: 'loginuser', password: 'senha123' })
      expect(result.user.username).toBe('loginuser')
      expect(result.accessToken).toBeDefined()
      expect(result.profile).toBeDefined()
    })

    it('lança ValidationError quando faltam campos', async () => {
      await expect(loginUser({ username: '', password: '' })).rejects.toThrow(ValidationError)
    })

    it('lança UnauthorizedError para usuário inexistente', async () => {
      await expect(
        loginUser({ username: 'naoexiste', password: 'senha123' })
      ).rejects.toThrow(UnauthorizedError)
    })

    it('lança UnauthorizedError para senha incorreta', async () => {
      await registerUser({ email: 'l2@t.com', username: 'errasenha', password: 'correta123' })
      await expect(
        loginUser({ username: 'errasenha', password: 'errada' })
      ).rejects.toThrow(UnauthorizedError)
    })
  })

  // ─── getMe ────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('devolve dados públicos do user com profile', async () => {
      const { user } = await registerUser({
        email: 'me@t.com', username: 'meuser', password: 'senha123',
      })
      const me = await getMe(user.id)
      expect(me.username).toBe('meuser')
      expect(me.password).toBeUndefined()
      expect(me.profile).toBeDefined()
      expect(me.profile._count.movies).toBe(0)
    })

    it('lança NotFoundError para userId inexistente', async () => {
      await expect(
        getMe('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError)
    })
  })

  // ─── refreshTokens ────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('gera novos tokens com refresh token válido', async () => {
      const { refreshToken } = await registerUser({
        email: 'r@t.com', username: 'refreshuser', password: 'senha123',
      })
      const tokens = await refreshTokens(refreshToken)
      expect(tokens.accessToken).toMatch(/^eyJ/)
      expect(tokens.refreshToken).toMatch(/^eyJ/)
    })

    it('lança UnauthorizedError quando não há refresh token', async () => {
      await expect(refreshTokens(undefined)).rejects.toThrow(UnauthorizedError)
    })

    it('lança UnauthorizedError para token com assinatura inválida', async () => {
      await expect(refreshTokens('token.invalido.assinatura')).rejects.toThrow(UnauthorizedError)
    })

    it('lança UnauthorizedError quando access token é passado como refresh token', async () => {
      // accessToken não tem type: 'refresh' no payload
      const { accessToken } = await registerUser({
        email: 'at@t.com', username: 'atuser', password: 'senha123',
      })
      await expect(refreshTokens(accessToken)).rejects.toThrow(UnauthorizedError)
    })
  })
})
