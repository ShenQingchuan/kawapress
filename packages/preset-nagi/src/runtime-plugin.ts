import { defineRuntimePlugin } from 'kawapress'
import { applyStoredAppearance } from './appearance'
import Footer from './components/Footer.vue'
import Layout from './components/Layout.vue'
import NavBar from './components/NavBar.vue'
import NotFound from './components/NotFound.vue'
import Sidebar from './components/Sidebar.vue'
import 'overlayscrollbars/styles/overlayscrollbars.css'
import './theme.css'

if (!import.meta.env.SSR) {
  applyStoredAppearance()
}

export default defineRuntimePlugin({
  name: '@kawapress/preset-nagi',
  setup(api) {
    api.vueApp((app) => {
      app.component('Layout', Layout)
      app.component('Footer', Footer)
      app.component('NavBar', NavBar)
      app.component('NotFound', NotFound)
      app.component('Sidebar', Sidebar)
    })
  },
})
