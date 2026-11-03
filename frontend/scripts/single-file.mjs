// Turns `vite build` output into ONE self-contained HTML file (CSS, JS and the
// street photo inlined). Used for `npm run build:single`, e.g. to email the
// offline demo or host it anywhere as a single page.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const dist = 'dist'
let html = readFileSync(join(dist, 'index.html'), 'utf8')

html = html.replace(/<link rel="stylesheet"[^>]*href="((?!https?:)[^"]+)"[^>]*>/g, (_, href) =>
  `<style>${readFileSync(join(dist, href.replace(/^\.?\//, '').replace(/^.*?assets\//, 'assets/')), 'utf8')}</style>`)

html = html.replace(/<script type="module"[^>]*src="((?!https?:)[^"]+)"[^>]*><\/script>/g, (_, src) => {
  const js = readFileSync(join(dist, src.replace(/^\.?\//, '').replace(/^.*?assets\//, 'assets/')), 'utf8')
  return `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`
})

const out = join('dist-single', 'index.html')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`)
