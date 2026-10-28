import { defineRuntimePlugin } from 'kawapress'
import Comments from './components/Comments.vue'
import './comments.css'

export default defineRuntimePlugin({
  name: '@kawapress/plugin-comments',
  setup(api) {
    api.appendToOutlet('doc', { id: 'comments', component: Comments })
  },
})
