import { defineRuntimePlugin } from 'kawapress'
import CodeGroup from './CodeGroup.vue'

export default defineRuntimePlugin({
  name: '@kawapress/plugin-code-group',
  setup(api) {
    api.vueApp((app) => {
      app.component('KawaCodeGroup', CodeGroup)
    })
  },
})
