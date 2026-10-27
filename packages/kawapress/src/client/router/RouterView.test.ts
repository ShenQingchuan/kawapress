// @vitest-environment happy-dom

import type { App, Component } from 'vue'
import type { PageModule, PageTable } from '../../core/page-manifest'
import type { RouteHistory } from './history'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { routerKey } from './injection'
import { createRouter } from './router'
import RouterView from './RouterView'

function text(name: string): Component {
  return defineComponent({ name, setup: () => () => h('p', { class: 'page' }, name) })
}

const pages: PageTable = {
  '/': async (): Promise<PageModule> => ({ default: text('home') }),
  '/guide/intro': async (): Promise<PageModule> => ({ default: text('intro') }),
}

const history: RouteHistory = {
  location: () => '/',
  push: () => {},
  replace: () => {},
  listen: () => () => {},
}

let app: App<Element> | undefined

afterEach(() => {
  app?.unmount()
  app = undefined
  document.body.innerHTML = ''
})

async function mount(routePath: string): Promise<HTMLElement> {
  const router = createRouter({ pages, history })
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp(defineComponent({ setup: () => () => h(RouterView) }))
  // The not-found page is a theme component in a real site.
  app.component('NotFound', defineComponent({
    setup: () => () => h('p', { class: 'not-found' }, 'not found'),
  }))
  app.provide(routerKey, router)
  await router.enter(routePath)
  app.mount(host)
  return host
}

describe('routerView', () => {
  it('renders the page of the current route', async () => {
    const host = await mount('/guide/intro')

    expect(host.querySelector('.page')?.textContent).toBe('intro')
  })

  it('renders the not-found page for an unknown route', async () => {
    const host = await mount('/guide/missing')

    expect(host.querySelector('.not-found')?.textContent).toBe('not found')
    expect(host.querySelector('.page')).toBeNull()
  })
})
