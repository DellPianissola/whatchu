import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { APP_VERSION } from '../../lib/version.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf-8')
)

describe('APP_VERSION', () => {
  it('deve refletir a versão do package.json do backend', () => {
    expect(APP_VERSION).toBe(pkg.version)
  })

  it('deve seguir formato semver (com sufixo opcional tipo -alpha)', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/)
  })
})
