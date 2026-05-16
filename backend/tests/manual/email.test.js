import { describe, it, expect } from 'vitest'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailChangeVerification,
} from '../../services/email.js'

const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO
const HAS_CONFIG = !!(process.env.RESEND_API_KEY && TEST_EMAIL_TO)

const fakeToken = (label) => `manual-${label}-${Date.now()}`

describe.skipIf(!HAS_CONFIG)('email service (manual — dispara emails REAIS)', () => {
  it('sendVerificationEmail entrega ao Resend', async () => {
    const result = await sendVerificationEmail(TEST_EMAIL_TO, fakeToken('verify'))
    expect(result?.error).toBeFalsy()
    expect(result?.data?.id).toEqual(expect.any(String))
  })

  it('sendPasswordResetEmail entrega ao Resend', async () => {
    const result = await sendPasswordResetEmail(TEST_EMAIL_TO, fakeToken('reset'))
    expect(result?.error).toBeFalsy()
    expect(result?.data?.id).toEqual(expect.any(String))
  })

  it('sendEmailChangeVerification entrega ao Resend', async () => {
    const result = await sendEmailChangeVerification(TEST_EMAIL_TO, fakeToken('change'))
    expect(result?.error).toBeFalsy()
    expect(result?.data?.id).toEqual(expect.any(String))
  })
})

describe.skipIf(HAS_CONFIG)('email service (manual — pulado)', () => {
  it('pulado: defina RESEND_API_KEY e TEST_EMAIL_TO pra rodar', () => {
    expect(true).toBe(true)
  })
})
