import process from 'node:process'
import referenceTheme from '@kawapress/e2e-reference-theme'
import codeBlockPlugin from '@kawapress/plugin-code-block'
import codeGroupPlugin from '@kawapress/plugin-code-group'
import commentsPlugin from '@kawapress/plugin-comments'
import containerPlugin from '@kawapress/plugin-container'
import githubAlertsPlugin from '@kawapress/plugin-github-alerts'
import imageZoomPlugin from '@kawapress/plugin-image-zoom'
import lastUpdatedPlugin from '@kawapress/plugin-last-updated'
import llmsPlugin from '@kawapress/plugin-llms'
import mathjaxPlugin from '@kawapress/plugin-mathjax'
import searchPlugin from '@kawapress/plugin-search'
import shikiPlugin from '@kawapress/plugin-shiki'
import { defineConfig } from 'kawapress'

/**
 * The official UI plugins under a third-party theme. This site never imports
 * nagi, so the specs prove that plugins reach the page through the public
 * outlet, token and layer contract alone.
 */
export default defineConfig({
  title: 'Reference theme',
  base: process.env.KAWAPRESS_BASE,
  plugins: [
    referenceTheme(),
    containerPlugin(),
    githubAlertsPlugin(),
    codeBlockPlugin(),
    codeGroupPlugin(),
    shikiPlugin({
      twoslash: false,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    }),
    mathjaxPlugin(),
    searchPlugin({
      containers: true,
      githubAlerts: true,
    }),
    llmsPlugin(),
    lastUpdatedPlugin({
      editLink: {
        pattern: 'https://example.com/edit/:path',
      },
    }),
    commentsPlugin({
      // Placeholders: the specs intercept https://giscus.app and never reach it.
      giscus: {
        repo: 'kawapress/kawapress',
        repoId: 'R_fixtureRepoId',
        category: 'Comments',
        categoryId: 'DIC_fixtureCategoryId',
      },
    }),
    imageZoomPlugin(),
  ],
})
