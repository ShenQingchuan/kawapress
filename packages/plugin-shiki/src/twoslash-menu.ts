import { options } from 'floating-vue'
import TwoslashMenu from './TwoslashMenu.vue'

/**
 * floating-vue keeps its themes in one module-level config that `app.use()`
 * normally fills in. KawaPress no longer installs floating-vue on the Vue app,
 * because the Twoslash popups are the only consumer, so the menu applies the
 * same config itself when this module loads. That happens per page that has a
 * Twoslash code block, before any menu renders.
 */
options.strategy = 'fixed'
Object.assign(options.themes, {
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
})

export default TwoslashMenu
