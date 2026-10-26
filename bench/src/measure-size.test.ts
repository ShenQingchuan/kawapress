import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import {
  extractRelativeImports,
  findFirstPaintAssets,
  summarizeAssets,
} from './measure-size.ts'

const HTML = `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="/assets/style.css">
    <link rel="modulepreload" href="/assets/chunk-a.js">
    <link rel="icon" href="/favicon.ico">
    <link rel="preload" href="/assets/font.woff2" as="font">
  </head>
  <body>
    <div id="app"></div>
    <script>window.inline = true</script>
    <script type="module" src="/assets/entry.js"></script>
    <script src="/analytics.js"></script>
  </body>
</html>`

describe('findFirstPaintAssets', () => {
  it('collects module scripts, module preloads and stylesheets only', () => {
    expect(findFirstPaintAssets(HTML, '/')).toEqual([
      { path: 'assets/style.css', kind: 'css' },
      { path: 'assets/chunk-a.js', kind: 'js' },
      { path: 'assets/entry.js', kind: 'js' },
    ])
  })

  it('strips the site base and any query or hash', () => {
    const html = [
      '<script type="module" src="/kawapress/assets/entry.js?v=1"></script>',
      '<link rel="stylesheet" href="/kawapress/assets/style.css#top">',
    ].join('')
    expect(findFirstPaintAssets(html, '/kawapress/')).toEqual([
      { path: 'assets/entry.js', kind: 'js' },
      { path: 'assets/style.css', kind: 'css' },
    ])
  })

  it('reads rel as a token list, like `rel="preload stylesheet"`', () => {
    const html = '<link rel="preload stylesheet" href="/assets/style.css" as="style">'
    expect(findFirstPaintAssets(html, '/')).toEqual([{ path: 'assets/style.css', kind: 'css' }])
  })

  it('ignores tags without the attributes it needs', () => {
    expect(findFirstPaintAssets('<script type="module"></script><link rel="stylesheet">', '/'))
      .toEqual([])
    expect(findFirstPaintAssets('<script src="/analytics.js"></script>', '/')).toEqual([])
  })
})

describe('extractRelativeImports', () => {
  it('finds static, bare and re-exported relative imports', () => {
    const code = [
      'import{x}from"./a.js";',
      'import"./b.js";',
      `import y from '../c.js';`,
      `export * from "./d.js";`,
      `export { z } from './e.js'`,
    ].join('\n')
    expect(extractRelativeImports(code).sort()).toEqual([
      '../c.js',
      './a.js',
      './b.js',
      './d.js',
      './e.js',
    ])
  })

  it('ignores package specifiers and dynamic imports', () => {
    const code = [
      `import { ref } from 'vue'`,
      `const mod = await import('./lazy.js')`,
      `const url = 'https://example.com/x.js'`,
    ].join('\n')
    expect(extractRelativeImports(code)).toEqual([])
  })
})

describe('summarizeAssets', () => {
  it('sums raw, gzip and brotli size per kind', () => {
    const code = Buffer.from('export const value = 1\n'.repeat(100))
    const style = Buffer.from('body { color: red }\n')
    const summary = summarizeAssets([
      { kind: 'js', content: code },
      { kind: 'css', content: style },
    ])

    expect(summary.js.files).toBe(1)
    expect(summary.js.raw).toBe(code.byteLength)
    expect(summary.js.gzip).toBeGreaterThan(0)
    expect(summary.js.gzip).toBeLessThan(summary.js.raw)
    expect(summary.js.brotli).toBeLessThan(summary.js.gzip)

    expect(summary.css.files).toBe(1)
    expect(summary.css.raw).toBe(style.byteLength)
    expect(summary.css.gzip).toBeGreaterThan(0)
  })

  it('reports zero for a page without assets', () => {
    expect(summarizeAssets([])).toEqual({
      js: { files: 0, raw: 0, gzip: 0, brotli: 0 },
      css: { files: 0, raw: 0, gzip: 0, brotli: 0 },
    })
  })
})
