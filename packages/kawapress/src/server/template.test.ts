import { describe, expect, it } from 'vitest'
import { KAWA_DEFAULT_TOKENS, KAWA_LAYER_ORDER } from '../core/tokens'
import { renderHtmlTemplate } from './template'

const baseOptions = {
  head: '<title>KawaPress</title>\n<meta name="description" content="docs">',
  appHtml: '<div>page</div>',
  clientEntryUrl: '/assets/client.js',
  cssUrls: ['/assets/style.css'],
  modulepreloadUrls: ['/assets/page.js'],
  htmlAttrs: 'lang="zh-CN"',
}

describe('renderHtmlTemplate', () => {
  it('puts the layer order and the tokens first in the head', () => {
    const html = renderHtmlTemplate(baseOptions)
    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'))

    expect(head).toContain(
      `<style id="kawa-layers">${KAWA_LAYER_ORDER}</style>`,
    )
    expect(head).toContain(
      `<style id="kawa-tokens">${KAWA_DEFAULT_TOKENS}</style>`,
    )
    expect(head.indexOf('kawa-layers')).toBeLessThan(head.indexOf('kawa-tokens'))
    expect(head.indexOf('kawa-tokens')).toBeLessThan(head.indexOf('<title>'))
    expect(head.indexOf('kawa-tokens')).toBeLessThan(head.indexOf('<link rel="stylesheet"'))
  })

  it('keeps the rest of the document intact', () => {
    const html = renderHtmlTemplate(baseOptions)

    expect(html.startsWith('<!DOCTYPE html>\n<html lang="zh-CN">')).toBe(true)
    expect(html).toContain('<div id="app"><div>page</div></div>')
    expect(html).toContain('<script type="module" src="/assets/client.js"></script>')
    expect(html).toContain('<link rel="stylesheet" href="/assets/style.css">')
    expect(html).toContain('<link rel="modulepreload" href="/assets/page.js">')
  })

  it('preloads page modules after the stylesheets', () => {
    const html = renderHtmlTemplate({
      ...baseOptions,
      cssUrls: ['/assets/entry.css', '/assets/page.css'],
      modulepreloadUrls: ['/assets/page.js', '/assets/shared.js'],
    })
    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'))
    const positions = [
      'id="kawa-layers"',
      'id="kawa-tokens"',
      '<link rel="stylesheet" href="/assets/entry.css">',
      '<link rel="stylesheet" href="/assets/page.css">',
      '<link rel="modulepreload" href="/assets/page.js">',
      '<link rel="modulepreload" href="/assets/shared.js">',
    ].map(snippet => head.indexOf(snippet))

    expect(positions.every(index => index !== -1)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('emits no preload links when none are given', () => {
    const html = renderHtmlTemplate({ ...baseOptions, modulepreloadUrls: undefined })

    expect(html).not.toContain('modulepreload')
  })
})
