import { defineRuntimePlugin } from 'kawapress'
import LlmsActions from './components/LlmsActions.vue'
import SsgMarkdown from './components/SsgMarkdown.vue'
import SsgMarkdownRoot from './components/SsgMarkdownRoot.vue'
import {
  LLMS_ACTIONS_COMPONENT,
  SSG_MD_RAW_COMPONENT,
  SSG_MD_ROOT_COMPONENT,
} from './constants'
import './styles.css'

export default defineRuntimePlugin({
  name: '@kawapress/plugin-llms',
  setup(api) {
    api.vueApp((app) => {
      app.component(LLMS_ACTIONS_COMPONENT, LlmsActions)
      app.component(SSG_MD_RAW_COMPONENT, SsgMarkdown)
      app.component(SSG_MD_ROOT_COMPONENT, SsgMarkdownRoot)
    })
  },
})
