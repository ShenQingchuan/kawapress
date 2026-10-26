import { defineRuntimePlugin } from 'kawapress'
import Search from './components/Search.vue'
import './search.css'

export default defineRuntimePlugin({
  name: '@kawapress/plugin-search',
  setup(api) {
    api.addToOutlet('header.actions', { id: 'trigger', component: Search })
    api.vueApp((app) => {
      app.component('KawaSearch', Search)
    })
  },
})
