import { describe, it, expect, beforeEach } from 'vitest'
import bcrypt from 'bcrypt'
import {
  registerUser,
  loginUser,
  getMe,
  refreshTokens,
  verifyEmail,
  resendVerificationEmail,
  resendVerificationEmailByEmail,
  requestPasswordReset,
  resetPassword,
} from '../../services/auth.js'
import { truncateAll, prisma } from '../helpers/db.js'
import {
  createUser as createUserFactory,
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

    it('lança ValidationError para senha com menos de 8 caracteres', async () => {
      await expect(
        registerUser({ email: 'a@b.com', username: 'u', password: '1234567' })
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

  // ─── registerUser (email verification) ───────────────────────────────────

  describe('registerUser — verificação de email', () => {
    it('cria VerificationToken do tipo EMAIL_VERIFICATION ao registrar', async () => {
      const { user } = await registerUser({
        email: 'reg@verify.com', username: 'regverify', password: 'senha123',
      })
      const token = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'EMAIL_VERIFICATION' },
      })
      expect(token).not.toBeNull()
      expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('registra usuário com emailVerified = false por padrão', async () => {
      const { user } = await registerUser({
        email: 'unverified@t.com', username: 'unverifieduser', password: 'senha123',
      })
      expect(user.emailVerified).toBe(false)
    })
  })

  // ─── verifyEmail ──────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('marca emailVerified = true e remove o token', async () => {
      const { user } = await registerUser({
        email: 'vmail@t.com', username: 'verifyok', password: 'senha123',
      })
      const tokenRecord = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'EMAIL_VERIFICATION' },
      })
      await verifyEmail(tokenRecord.token)
      const updated = await prisma.user.findUnique({ where: { id: user.id } })
      expect(updated.emailVerified).toBe(true)
      const deletedToken = await prisma.verificationToken.findUnique({
        where: { token: tokenRecord.token },
      })
      expect(deletedToken).toBeNull()
    })

    it('lança ValidationError para token inexistente', async () => {
      await expect(verifyEmail('token-que-nao-existe')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para token expirado', async () => {
      const user = await createUserFactory({ username: 'expiredverify' })
      await createVerificationToken(user.id, {
        token: 'expired-verify-token',
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() - 1000),
      })
      await expect(verifyEmail('expired-verify-token')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para token de tipo errado (ex: PASSWORD_RESET)', async () => {
      const user = await createUserFactory({ username: 'wrongtypeverify' })
      await createVerificationToken(user.id, {
        token: 'wrong-type-verify-token',
        type: 'PASSWORD_RESET',
      })
      await expect(verifyEmail('wrong-type-verify-token')).rejects.toThrow(ValidationError)
    })
  })

  // ─── resendVerificationEmail ──────────────────────────────────────────────

  describe('resendVerificationEmail', () => {
    it('cria novo token e invalida o anterior', async () => {
      const { user } = await registerUser({
        email: 'resend@t.com', username: 'resenduser', password: 'senha123',
      })
      const first = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'EMAIL_VERIFICATION' },
      })
      await resendVerificationEmail(user.id)
      const tokens = await prisma.verificationToken.findMany({
        where: { userId: user.id, type: 'EMAIL_VERIFICATION' },
      })
      expect(tokens).toHaveLength(1)
      expect(tokens[0].token).not.toBe(first.token)
    })

    it('lança ValidationError se o email já está verificado', async () => {
      const user = await createUserFactory({ username: 'alreadyverified', emailVerified: true })
      await expect(resendVerificationEmail(user.id)).rejects.toThrow(ValidationError)
    })

    it('lança NotFoundError para userId inexistente', async () => {
      await expect(
        resendVerificationEmail('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError)
    })
  })

  // ─── requestPasswordReset ─────────────────────────────────────────────────

  describe('requestPasswordReset', () => {
    it('cria token PASSWORD_RESET quando o email está verificado', async () => {
      const user = await createUserFactory({
        username: 'resetok', email: 'resetok@t.com', emailVerified: true,
      })
      await requestPasswordReset('resetok@t.com')
      const token = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'PASSWORD_RESET' },
      })
      expect(token).not.toBeNull()
    })

    // Opção C: reset é permitido mesmo sem verificação prévia. Clicar no link
    // prova posse do email; resetPassword marca emailVerified = true como efeito.
    it('cria token PASSWORD_RESET mesmo quando o email não está verificado', async () => {
      const user = await createUserFactory({
        username: 'resetunverified', email: 'unv@t.com', emailVerified: false,
      })
      await expect(requestPasswordReset('unv@t.com')).resolves.toBeUndefined()
      const token = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'PASSWORD_RESET' },
      })
      expect(token).not.toBeNull()
    })

    it('retorna silenciosamente para email inexistente (anti-enumeração)', async () => {
      await expect(
        requestPasswordReset('naoexiste@t.com')
      ).resolves.toBeUndefined()
      const count = await prisma.verificationToken.count()
      expect(count).toBe(0)
    })

    it('substitui token anterior se já existe um pendente', async () => {
      const user = await createUserFactory({
        username: 'resettwice', email: 'twice@t.com', emailVerified: true,
      })
      await requestPasswordReset('twice@t.com')
      await requestPasswordReset('twice@t.com')
      const tokens = await prisma.verificationToken.findMany({
        where: { userId: user.id, type: 'PASSWORD_RESET' },
      })
      expect(tokens).toHaveLength(1)
    })
  })

  // ─── resendVerificationEmailByEmail (público) ────────────────────────────

  describe('resendVerificationEmailByEmail', () => {
    it('cria novo token EMAIL_VERIFICATION para usuário não verificado', async () => {
      const user = await createUserFactory({
        username: 'resendpub', email: 'resendpub@t.com', emailVerified: false,
      })
      await resendVerificationEmailByEmail('resendpub@t.com')
      const token = await prisma.verificationToken.findFirst({
        where: { userId: user.id, type: 'EMAIL_VERIFICATION' },
      })
      expect(token).not.toBeNull()
    })

    it('retorna silenciosamente quando o email já está verificado (anti-enumeração)', async () => {
      const user = await createUserFactory({
        username: 'resendverified', email: 'rv@t.com', emailVerified: true,
      })
      await expect(
        resendVerificationEmailByEmail('rv@t.com')
      ).resolves.toBeUndefined()
      const tokens = await prisma.verificationToken.findMany({
        where: { userId: user.id, type: 'EMAIL_VERIFICATION' },
      })
      expect(tokens).toHaveLength(0)
    })

    it('retorna silenciosamente para email inexistente (anti-enumeração)', async () => {
      await expect(
        resendVerificationEmailByEmail('naoexiste@t.com')
      ).resolves.toBeUndefined()
      const count = await prisma.verificationToken.count()
      expect(count).toBe(0)
    })

    it('retorna silenciosamente quando email é vazio ou nulo', async () => {
      await expect(resendVerificationEmailByEmail('')).resolves.toBeUndefined()
      await expect(resendVerificationEmailByEmail(undefined)).resolves.toBeUndefined()
    })
  })

  // ─── resetPassword ────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('altera a senha e remove o token', async () => {
      const user = await createUserFactory({ username: 'resetpw', emailVerified: true })
      await createVerificationToken(user.id, {
        token: 'valid-reset-token',
        type: 'PASSWORD_RESET',
      })
      await resetPassword('valid-reset-token', 'novaSenha456')
      const updated = await prisma.user.findUnique({ where: { id: user.id } })
      const passwordChanged = await bcrypt.compare('novaSenha456', updated.password)
      expect(passwordChanged).toBe(true)
      const token = await prisma.verificationToken.findUnique({
        where: { token: 'valid-reset-token' },
      })
      expect(token).toBeNull()
    })

    // Opção C: reset bem-sucedido prova posse do email → marca emailVerified.
    it('marca emailVerified = true mesmo se o usuário ainda não tinha verificado', async () => {
      const user = await createUserFactory({ username: 'resetunv', emailVerified: false })
      await createVerificationToken(user.id, {
        token: 'reset-unv-token',
        type: 'PASSWORD_RESET',
      })
      await resetPassword('reset-unv-token', 'novaSenha456')
      const updated = await prisma.user.findUnique({ where: { id: user.id } })
      expect(updated.emailVerified).toBe(true)
    })

    it('limpa também tokens EMAIL_VERIFICATION pendentes do usuário', async () => {
      const user = await createUserFactory({ username: 'resetcleanup', emailVerified: false })
      await createVerificationToken(user.id, {
        token: 'reset-cleanup-token',
        type: 'PASSWORD_RESET',
      })
      await createVerificationToken(user.id, {
        token: 'pending-verify-token',
        type: 'EMAIL_VERIFICATION',
      })
      await resetPassword('reset-cleanup-token', 'novaSenha456')
      const remaining = await prisma.verificationToken.count({ where: { userId: user.id } })
      expect(remaining).toBe(0)
    })

    it('lança ValidationError para token inexistente', async () => {
      await expect(resetPassword('nao-existe', 'novaSenha456')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para token expirado', async () => {
      const user = await createUserFactory({ username: 'expiredreset' })
      await createVerificationToken(user.id, {
        token: 'expired-reset-token',
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() - 1000),
      })
      await expect(resetPassword('expired-reset-token', 'novaSenha456')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para token de tipo errado (ex: EMAIL_VERIFICATION)', async () => {
      const user = await createUserFactory({ username: 'wrongtypereset' })
      await createVerificationToken(user.id, {
        token: 'wrong-type-reset-token',
        type: 'EMAIL_VERIFICATION',
      })
      await expect(resetPassword('wrong-type-reset-token', 'novaSenha456')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para nova senha fraca (menos de 8 caracteres)', async () => {
      const user = await createUserFactory({ username: 'weakpw', emailVerified: true })
      await createVerificationToken(user.id, {
        token: 'weak-pw-token',
        type: 'PASSWORD_RESET',
      })
      await expect(resetPassword('weak-pw-token', '123')).rejects.toThrow(ValidationError)
    })
  })
})
