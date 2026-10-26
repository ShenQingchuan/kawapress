import { defineRuntimePlugin } from 'kawapress'
import Comments from './components/Comments.vue'
import './comments.css'

export default defineRuntimePlugin({
  name: '@kawapress/plugin-comments',
  setup(api) {
    api.addToOutlet('doc.after', { id: 'comments', component: Comments })
  },
})
