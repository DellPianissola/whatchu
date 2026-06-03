import pino from 'pino'

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST
const isProd = process.env.NODE_ENV === 'production'
const level = process.env.LOG_LEVEL || (isTest ? 'silent' : isProd ? 'info' : 'debug')

export const logger = pino({
  level,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    remove: true,
  },
})
