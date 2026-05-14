import { describe, it, expect, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'
import {
  registerUser,
  loginUser,
  getMe,
  refreshTokens,
  verifyEmail,
  resendVerificationEmailByEmail,
  requestPasswordReset,
  resetPassword,
  cleanupExpiredPendingRegistrations,
} from '../../services/auth.js'
import { truncateAll, prisma } from '../helpers/db.js'
import {
  createUser as createUserFactory,
  createPendingRegistration,
  createVerificationToken,
} from '../helpers/factories.js'
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
    it('cria PendingRegistration (NÃO cria User) e retorna { pending: true, email }', async () => {
      const result = await registerUser({
        email: 'user@test.com', username: 'testuser', password: 'senha12345',
      })
      expect(result).toEqual({ pending: true, email: 'user@test.com' })

      const userCount = await prisma.user.count()
      expect(userCount).toBe(0)

      const pending = await prisma.pendingRegistration.findFirst({
        where: { email: 'user@test.com', username: 'testuser' },
      })
      expect(pending).not.toBeNull()
      expect(pending.token).toMatch(/^[a-f0-9]{64}$/)
      expect(pending.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('não retorna tokens de acesso/refresh (usuário só loga após verificar)', async () => {
      const result = await registerUser({
        email: 'noauth@test.com', username: 'noauth', password: 'senha12345',
      })
      expect(result.accessToken).toBeUndefined()
      expect(result.refreshToken).toBeUndefined()
    })

    it('lança ConflictError se username já está em uso por um User real', async () => {
      await createUserFactory({ username: 'taken', email: 'taken@test.com' })
      await expect(
        registerUser({ email: 'other@test.com', username: 'taken', password: 'senha12345' })
      ).rejects.toThrow(ConflictError)
    })

    it('silencia (resposta genérica) quando o email já pertence a um User real — anti-enum', async () => {
      await createUserFactory({ username: 'existing', email: 'dup@test.com' })
      const result = await registerUser({
        email: 'dup@test.com', username: 'otherusername', password: 'senha12345',
      })
      expect(result).toEqual({ pending: true, email: 'dup@test.com' })
      const pending = await prisma.pendingRegistration.findFirst({ where: { email: 'dup@test.com' } })
      expect(pending).toBeNull()
    })

    it('permite N Pendings paralelos com o mesmo email (usernames diferentes)', async () => {
      await registerUser({ email: 'multi@test.com', username: 'user_a', password: 'senha12345' })
      await registerUser({ email: 'multi@test.com', username: 'user_b', password: 'senha12345' })
      const count = await prisma.pendingRegistration.count({ where: { email: 'multi@test.com' } })
      expect(count).toBe(2)
    })

    it('substitui Pending anterior se mesmo (email, username) — re-cadastro idempotente', async () => {
      await registerUser({ email: 'redo@test.com', username: 'redo', password: 'senha12345' })
      const before = await prisma.pendingRegistration.findFirst({ where: { email: 'redo@test.com' } })

      await registerUser({ email: 'redo@test.com', username: 'redo', password: 'senha12345' })
      const all = await prisma.pendingRegistration.findMany({ where: { email: 'redo@test.com' } })
      expect(all).toHaveLength(1)
      expect(all[0].token).not.toBe(before.token)
    })

    it('lança ValidationError para email inválido', async () => {
      await expect(
        registerUser({ email: 'nao-email', username: 'u', password: 'senha12345' })
      ).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para senha com menos de 8 caracteres', async () => {
      await expect(
        registerUser({ email: 'a@b.com', username: 'u', password: '1234567' })
      ).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para campos obrigatórios faltantes', async () => {
      await expect(
        registerUser({ email: '', username: '', password: '' })
      ).rejects.toThrow(ValidationError)
    })
  })

  // ─── verifyEmail ───────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('materializa User + Profile a partir do Pending e devolve tokens (login automático)', async () => {
      await createPendingRegistration({
        email: 'verify@test.com', username: 'verifyuser', token: 'valid-token-1',
      })

      const result = await verifyEmail('valid-token-1')

      expect(result.user.email).toBe('verify@test.com')
      expect(result.user.username).toBe('verifyuser')
      expect(result.user.password).toBeUndefined()
      expect(result.profile).toBeDefined()
      expect(result.accessToken).toMatch(/^eyJ/)
      expect(result.refreshToken).toMatch(/^eyJ/)

      const leftover = await prisma.pendingRegistration.findUnique({ where: { token: 'valid-token-1' } })
      expect(leftover).toBeNull()
    })

    it('limpa todos os outros Pendings com mesmo email (corrida — primeiro a verificar vence)', async () => {
      await createPendingRegistration({ email: 'race@test.com', username: 'user_a', token: 'tok-a' })
      await createPendingRegistration({ email: 'race@test.com', username: 'user_b', token: 'tok-b' })
      await createPendingRegistration({ email: 'race@test.com', username: 'user_c', token: 'tok-c' })

      await verifyEmail('tok-a')

      const remaining = await prisma.pendingRegistration.count({ where: { email: 'race@test.com' } })
      expect(remaining).toBe(0)
    })

    it('lança ConflictError se outro User com mesmo email materializou primeiro', async () => {
      await createUserFactory({ email: 'taken@test.com', username: 'owner' })
      await createPendingRegistration({
        email: 'taken@test.com', username: 'attacker', token: 'attacker-token',
      })

      await expect(verifyEmail('attacker-token')).rejects.toThrow(ConflictError)

      const leftover = await prisma.pendingRegistration.findUnique({ where: { token: 'attacker-token' } })
      expect(leftover).toBeNull()
    })

    it('lança ConflictError se username do Pending já foi tomado por outro User', async () => {
      await createUserFactory({ email: 'owner@test.com', username: 'sameuser' })
      await createPendingRegistration({
        email: 'novo@test.com', username: 'sameuser', token: 'collide-username',
      })

      await expect(verifyEmail('collide-username')).rejects.toThrow(ConflictError)
    })

    it('lança ValidationError para token inexistente', async () => {
      await expect(verifyEmail('nao-existe')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError e remove o Pending para token expirado', async () => {
      await createPendingRegistration({
        email: 'expired@test.com', username: 'expireduser',
        token: 'expired-token', expiresAt: new Date(Date.now() - 1000),
      })
      await expect(verifyEmail('expired-token')).rejects.toThrow(ValidationError)
      const leftover = await prisma.pendingRegistration.findUnique({ where: { token: 'expired-token' } })
      expect(leftover).toBeNull()
    })
  })

  // ─── resendVerificationEmailByEmail ───────────────────────────────────────

  describe('resendVerificationEmailByEmail', () => {
    it('renova token + expiresAt do Pending existente', async () => {
      const pending = await createPendingRegistration({
        email: 'resend@test.com', username: 'resendme', token: 'old-token',
      })

      await resendVerificationEmailByEmail('resend@test.com')

      const refreshed = await prisma.pendingRegistration.findUnique({ where: { id: pending.id } })
      expect(refreshed.token).not.toBe('old-token')
      expect(refreshed.expiresAt.getTime()).toBeGreaterThan(pending.expiresAt.getTime() - 1000)
    })

    it('silencia para email sem Pending (anti-enumeração)', async () => {
      await expect(resendVerificationEmailByEmail('naoexiste@test.com')).resolves.toBeUndefined()
      const count = await prisma.pendingRegistration.count()
      expect(count).toBe(0)
    })

    it('silencia se Pending expirou (anti-enumeração)', async () => {
      await createPendingRegistration({
        email: 'old@test.com', username: 'old',
        token: 'expired', expiresAt: new Date(Date.now() - 1000),
      })
      await expect(resendVerificationEmailByEmail('old@test.com')).resolves.toBeUndefined()
    })

    it('silencia quando email é vazio ou nulo', async () => {
      await expect(resendVerificationEmailByEmail('')).resolves.toBeUndefined()
      await expect(resendVerificationEmailByEmail(undefined)).resolves.toBeUndefined()
    })
  })

  // ─── loginUser ────────────────────────────────────────────────────────────

  describe('loginUser', () => {
    it('autentica User real com username + senha corretos', async () => {
      // Cria User via fluxo completo: register → verify
      await registerUser({ email: 'log@test.com', username: 'loguser', password: 'senha12345' })
      const pending = await prisma.pendingRegistration.findFirst({ where: { email: 'log@test.com' } })
      await verifyEmail(pending.token)

      const result = await loginUser({ username: 'loguser', password: 'senha12345' })
      expect(result.user.username).toBe('loguser')
      expect(result.accessToken).toMatch(/^eyJ/)
    })

    it('lança ValidationError quando faltam campos', async () => {
      await expect(loginUser({ username: '', password: '' })).rejects.toThrow(ValidationError)
    })

    it('lança UnauthorizedError para usuário inexistente', async () => {
      await expect(
        loginUser({ username: 'naoexiste', password: 'senha12345' })
      ).rejects.toThrow(UnauthorizedError)
    })

    it('lança UnauthorizedError para PendingRegistration (não tem User ainda — não pode logar)', async () => {
      await registerUser({ email: 'pend@test.com', username: 'penduser', password: 'senha12345' })
      // Sem verificar: continua só Pending
      await expect(
        loginUser({ username: 'penduser', password: 'senha12345' })
      ).rejects.toThrow(UnauthorizedError)
    })

    it('lança UnauthorizedError para senha incorreta', async () => {
      await createUserFactory({ username: 'wrongpw', password: 'correta12345' })
      await expect(
        loginUser({ username: 'wrongpw', password: 'errada' })
      ).rejects.toThrow(UnauthorizedError)
    })
  })

  // ─── getMe ────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('devolve dados públicos do user com profile', async () => {
      const user = await createUserFactory({ username: 'meuser', email: 'me@test.com' })
      await prisma.profile.create({ data: { userId: user.id, name: 'meuser' } })

      const me = await getMe(user.id)
      expect(me.username).toBe('meuser')
      expect(me.password).toBeUndefined()
      expect(me.profile).toBeDefined()
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
      await registerUser({ email: 'r@t.com', username: 'refresh', password: 'senha12345' })
      const pending = await prisma.pendingRegistration.findFirst({ where: { username: 'refresh' } })
      const { refreshToken } = await verifyEmail(pending.token)

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
  })

  // ─── requestPasswordReset ─────────────────────────────────────────────────

  describe('requestPasswordReset', () => {
    it('cria token PASSWORD_RESET para um User existente', async () => {
      const user = await createUserFactory({ username: 'rst', email: 'rst@test.com' })
      await requestPasswordReset('rst@test.com')

      const token = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'PASSWORD_RESET' },
      })
      expect(token).not.toBeNull()
    })

    it('silencia para email inexistente (anti-enumeração)', async () => {
      await expect(requestPasswordReset('nao@test.com')).resolves.toBeUndefined()
      expect(await prisma.verificationToken.count()).toBe(0)
    })

    it('silencia para email com apenas Pending (Pending não pode resetar)', async () => {
      await createPendingRegistration({ email: 'apenas@test.com', username: 'apenas' })
      await expect(requestPasswordReset('apenas@test.com')).resolves.toBeUndefined()
      expect(await prisma.verificationToken.count()).toBe(0)
    })

    it('substitui token anterior se já existe um pendente', async () => {
      const user = await createUserFactory({ username: 'twice', email: 'twice@test.com' })
      await requestPasswordReset('twice@test.com')
      await requestPasswordReset('twice@test.com')
      const tokens = await prisma.verificationToken.findMany({
        where: { userId: user.id, type: 'PASSWORD_RESET' },
      })
      expect(tokens).toHaveLength(1)
    })
  })

  // ─── resetPassword ────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('altera a senha e remove o token', async () => {
      const user = await createUserFactory({ username: 'resetpw' })
      await createVerificationToken(user.id, {
        token: 'valid-reset-token',
        type:  'PASSWORD_RESET',
      })
      await resetPassword('valid-reset-token', 'novaSenha456')
      const updated = await prisma.user.findUnique({ where: { id: user.id } })
      expect(await bcrypt.compare('novaSenha456', updated.password)).toBe(true)
      const leftover = await prisma.verificationToken.findUnique({ where: { token: 'valid-reset-token' } })
      expect(leftover).toBeNull()
    })

    it('lança ValidationError para token inexistente', async () => {
      await expect(resetPassword('nao-existe', 'novaSenha456')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para token expirado', async () => {
      const user = await createUserFactory({ username: 'expiredreset' })
      await createVerificationToken(user.id, {
        token: 'exp-reset', type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() - 1000),
      })
      await expect(resetPassword('exp-reset', 'novaSenha456')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para nova senha fraca', async () => {
      const user = await createUserFactory({ username: 'weakpw' })
      await createVerificationToken(user.id, {
        token: 'weak-pw-token', type: 'PASSWORD_RESET',
      })
      await expect(resetPassword('weak-pw-token', '123')).rejects.toThrow(ValidationError)
    })
  })

  // ─── cleanupExpiredPendingRegistrations ──────────────────────────────────

  describe('cleanupExpiredPendingRegistrations', () => {
    it('remove apenas Pendings vencidos', async () => {
      await createPendingRegistration({
        email: 'a@t.com', username: 'a', token: 't-alive',
        expiresAt: new Date(Date.now() + 60_000),
      })
      await createPendingRegistration({
        email: 'b@t.com', username: 'b', token: 't-expired-1',
        expiresAt: new Date(Date.now() - 1000),
      })
      await createPendingRegistration({
        email: 'c@t.com', username: 'c', token: 't-expired-2',
        expiresAt: new Date(Date.now() - 60_000),
      })

      const removed = await cleanupExpiredPendingRegistrations()
      expect(removed).toBe(2)

      const remaining = await prisma.pendingRegistration.findMany()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].token).toBe('t-alive')
    })

    it('retorna 0 quando não há vencidos', async () => {
      await createPendingRegistration({ email: 'x@t.com', username: 'x' })
      expect(await cleanupExpiredPendingRegistrations()).toBe(0)
    })
  })
})
