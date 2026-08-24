import FloatingVue from 'floating-vue'
import { defineRuntimePlugin } from 'kawapress'
import { TwoslashMenu } from './twoslash-menu'
import '@shikijs/twoslash/style-rich.css'
import 'floating-vue/dist/style.css'
import './twoslash.css'

export default defineRuntimePlugin({
  name: '@kawapress/plugin-shiki',
  setup(api) {
    api.vueApp((app) => {
      app.use(FloatingVue, {
        strategy: 'fixed',
        themes: {
          'twoslash': {
            $extend: 'dropdown',
            triggers: ['hover', 'touch'],
            popperTriggers: ['hover', 'touch'],
            placement: 'bottom-start',
            delay: { show: 0, hide: 100 },
            autoHide: true,
            instantMove: true,
            flip: false,
          },
          'twoslash-query': {
            $extend: 'twoslash',
            triggers: ['click'],
            popperTriggers: ['click'],
            autoHide: false,
          },
          'twoslash-completion': {
            $extend: 'twoslash-query',
            distance: 0,
            arrowOverflow: false,
          },
        },
      })
      app.component('KawaTwoslashMenu', TwoslashMenu)
    })
  },
})
