/**
 * Testes de integração para o serviço de storage (upload de avatar).
 *
 * O cliente MinIO/S3 é mockado — apenas a lógica de validação e a persistência
 * no banco são exercitadas com DB real.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { uploadAvatar } from '../../services/storage.js'
import { truncateAll, prisma } from '../helpers/db.js'
import {
  createUser,
  createProfile as createProfileFactory,
} from '../helpers/factories.js'
import { ValidationError, NotFoundError } from '../../lib/httpErrors.js'

// Mocka o cliente S3/MinIO para não precisar de infraestrutura real nos testes.
// O módulo real ficará em backend/lib/storageClient.js.
vi.mock('../../lib/storageClient.js', () => ({
  uploadFile: vi.fn().mockResolvedValue('http://minio.local/avatars/mocked-avatar.jpg'),
}))

const makeBuffer = (sizeInBytes) => Buffer.alloc(sizeInBytes, 'a')
const MB = 1024 * 1024

describe('storage service', () => {
  beforeEach(() => truncateAll())

  // ─── uploadAvatar ─────────────────────────────────────────────────────────

  describe('uploadAvatar', () => {
    it('salva avatarUrl no perfil e devolve o perfil atualizado', async () => {
      const user    = await createUser()
      await createProfileFactory(user.id)
      const buffer  = makeBuffer(100 * 1024) // 100 KB
      const updated = await uploadAvatar(user.id, buffer, 'image/jpeg')
      expect(updated.avatarUrl).toBe('http://minio.local/avatars/mocked-avatar.jpg')
      const dbProfile = await prisma.profile.findUnique({ where: { userId: user.id } })
      expect(dbProfile.avatarUrl).toBe('http://minio.local/avatars/mocked-avatar.jpg')
    })

    it('aceita image/png', async () => {
      const user = await createUser({ username: 'pnguser' })
      await createProfileFactory(user.id)
      const buffer = makeBuffer(50 * 1024)
      await expect(uploadAvatar(user.id, buffer, 'image/png')).resolves.toBeDefined()
    })

    it('aceita image/webp', async () => {
      const user = await createUser({ username: 'webpuser' })
      await createProfileFactory(user.id)
      const buffer = makeBuffer(50 * 1024)
      await expect(uploadAvatar(user.id, buffer, 'image/webp')).resolves.toBeDefined()
    })

    it('lança ValidationError para tipo de arquivo não permitido', async () => {
      const user = await createUser({ username: 'gifuser' })
      await createProfileFactory(user.id)
      const buffer = makeBuffer(50 * 1024)
      await expect(uploadAvatar(user.id, buffer, 'image/gif')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para arquivo maior que 5 MB', async () => {
      const user = await createUser({ username: 'bigfile' })
      await createProfileFactory(user.id)
      const buffer = makeBuffer(6 * MB)
      await expect(uploadAvatar(user.id, buffer, 'image/jpeg')).rejects.toThrow(ValidationError)
    })

    it('lança ValidationError para buffer vazio', async () => {
      const user = await createUser({ username: 'emptyfile' })
      await createProfileFactory(user.id)
      await expect(uploadAvatar(user.id, Buffer.alloc(0), 'image/jpeg')).rejects.toThrow(ValidationError)
    })

    it('lança NotFoundError quando o usuário não tem perfil', async () => {
      const user   = await createUser({ username: 'noprofile' })
      const buffer = makeBuffer(100 * 1024)
      await expect(uploadAvatar(user.id, buffer, 'image/jpeg')).rejects.toThrow(NotFoundError)
    })
  })
})
