import { defineRuntimePlugin } from 'kawapress'
import LastUpdated from './components/LastUpdated.vue'
import './last-updated.css'

export default defineRuntimePlugin({
  name: '@kawapress/plugin-last-updated',
  setup(api) {
    api.addToOutlet('doc.footer', { id: 'last-updated', component: LastUpdated })
  },
})
