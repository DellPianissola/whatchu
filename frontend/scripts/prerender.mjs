import { readFile, writeFile, rm } from 'node:fs/promises'

const DIST = new URL('../dist/', import.meta.url)
const SSR_DIST = new URL('../dist-ssr/', import.meta.url)
const EMPTY_ROOT = '<div id="root"></div>'

const { renderLanding } = await import(new URL('entry-server.js', SSR_DIST))

const shell = await readFile(new URL('index.html', DIST), 'utf-8')
if (!shell.includes(EMPTY_ROOT)) {
  throw new Error(`prerender: ${EMPTY_ROOT} não encontrado em dist/index.html`)
}

await writeFile(new URL('app.html', DIST), shell)
await writeFile(
  new URL('index.html', DIST),
  shell.replace(EMPTY_ROOT, `<div id="root">${renderLanding()}</div>`),
)
await rm(SSR_DIST, { recursive: true, force: true })
