import { defineRuntimePlugin } from 'kawapress'
import { REFERENCE_THEME_NAME } from './index'
import Layout from './Layout.vue'
import NotFound from './NotFound.vue'
import './theme.css'

/**
 * Browser side of the reference theme: the two components KawaPress requires
 * plus the single theme stylesheet.
 */
export default defineRuntimePlugin({
  name: REFERENCE_THEME_NAME,
  setup(api) {
    api.vueApp((app) => {
      app.component('Layout', Layout)
      app.component('NotFound', NotFound)
    })
  },
})
