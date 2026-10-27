/**
 * Stand-in for the virtual modules of a site, so unit tests can import a module
 * that reads them. `vitest.config.ts` aliases every `virtual:kawapress-*` id at
 * this file; a test that needs other values mocks the module it imports.
 */

export const site = {
  title: 'Test site',
  base: '/',
  head: [],
  locales: { root: { label: 'English', lang: 'en', link: '/' } },
  themeConfig: {},
}

export const pages = {}

export const pageModules = {}

export const runtimePlugins = []
