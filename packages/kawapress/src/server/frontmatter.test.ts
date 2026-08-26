import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSite } from './build'

describe('frontmatter', () => {
  it('renders a page title and description in the document head', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-frontmatter-'))

    try {
      await Promise.all([
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({ title: 'KawaPress' })
`),
        writeFile(join(root, 'index.md'), `---
title: Frontmatter
titleTemplate: '%s · Guide'
description: A short page description.
layout: page
---
`),
      ])

      await buildSite(root)

      const page = await readFile(join(root, 'dist/index.html'), 'utf8')
      expect(page.match(/<title>/g)).toHaveLength(1)
      expect(page).toContain('<title>Frontmatter · Guide</title>')
      expect(page.match(/<meta name="description"/g)).toHaveLength(1)
      expect(page).toContain(
        '<meta name="description" content="A short page description.">',
      )
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it('applies Nagi page presentation controls to the rendered layout', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-frontmatter-'))

    try {
      await Promise.all([
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({ title: 'KawaPress' })
`),
        writeFile(join(root, 'index.md'), `---
layout: page
navbar: false
footer: false
pageClass: plain-page
---
# Plain page
`),
        writeFile(join(root, 'guide.md'), `---
navbar: false
sidebar: false
aside: false
outline: false
pageClass: focused-doc
---
# Guide

## First section
`),
      ])

      await buildSite(root)

      const page = await readFile(join(root, 'dist/index.html'), 'utf8')
      expect(page).toContain('class="nagi nagi--page plain-page"')
      expect(page).not.toContain('nagi-nav-bar')
      expect(page).not.toContain('nagi-footer')

      const guide = await readFile(join(root, 'dist/guide.html'), 'utf8')
      expect(guide).toContain('class="nagi nagi--doc focused-doc"')
      expect(guide).not.toContain('nagi-nav-bar')
      expect(guide).not.toContain('nagi-sidebar')
      expect(guide).not.toContain('nagi-outline')
      expect(guide).not.toContain('nagi-doc-toolbar__menu')
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})
