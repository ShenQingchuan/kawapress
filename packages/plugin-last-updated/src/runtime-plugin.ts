import { defineRuntimePlugin } from 'kawapress'
import LastUpdated from './components/LastUpdated.vue'
import { PLUGIN_NAME } from './name'
import './last-updated.css'

export default defineRuntimePlugin({
  name: PLUGIN_NAME,
  setup(api) {
    api.addToOutlet('doc.footer', { id: 'last-updated', component: LastUpdated })
  },
})
